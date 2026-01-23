import os, tempfile, logging, uuid
from io import BytesIO
from typing import List
import boto3
import fitz
import re
import traceback

from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_aws import BedrockEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain_classic.indexes import SQLRecordManager, index

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
s3 = boto3.client('s3')
textract = boto3.client('textract')

EMBEDDING_BUCKET_NAME = os.environ["EMBEDDING_BUCKET_NAME"]
print('EMBEDDING_BUCKET_NAME',EMBEDDING_BUCKET_NAME)

def extract_text_with_textract(page_image_bytes: bytes) -> str:
    """
    Extract text from a page image using AWS Textract.
    
    Args:
    page_image_bytes (bytes): The image bytes of the page
    
    Returns:
    str: The extracted text
    """
    try:
        response = textract.detect_document_text(
            Document={'Bytes': page_image_bytes}
        )
        
        # Extract text from response
        text_lines = []
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text_lines.append(block['Text'])
        
        raw_text = '\n'.join(text_lines)
        cleaned_lines = [clean_text(line) for line in raw_text.split('\n') if clean_text(line)]
        return '\n'.join(cleaned_lines)
        
    except Exception as e:
        logger.error(f"Textract OCR failed: {e}")
        return ""

def extract_txt(
    bucket: str, 
    file_key: str
) -> str:
    """
    Extract text from a file stored in an S3 bucket.
    
    Args:
    bucket (str): The name of the S3 bucket.
    file_key (str): The key of the file in the S3 bucket.
    
    Returns:
    str: The extracted text.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        s3.download_fileobj(bucket, file_key, tmp_file)
        tmp_file_path = tmp_file.name

    try:
        with open(tmp_file_path, 'r', encoding='utf-8') as file:
            text = file.read()
    finally:
        os.remove(tmp_file_path)

    return text

def clean_text(text: str) -> str:
    # Remove non-ASCII characters
    text = text.encode("ascii", errors="ignore").decode()
    # Remove repeated whitespace and empty lines
    text = re.sub(r"\s+", " ", text).strip()
    # Filter out noise
    if len(text) < 20 or len(text.split()) < 3:
        return ""
    return text

def store_doc_texts(
    bucket: str, 
    course: str, 
    module: str,
    filename: str, 
    output_bucket: str
) -> List[str]:
    """
    Store the text of each page of a document in an S3 bucket.
    
    Args:
    bucket (str): The name of the S3 bucket containing the document.
    course (str): The course ID folder in the S3 bucket.
    module (str): The module name and ID folder within the course.
    filename (str): The name of the document file.
    output_bucket (str): The name of the S3 bucket for storing the extracted text.
    
    Returns:
    List[str]: A list of keys for the stored text files in the output bucket.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        s3.download_file(bucket, f"{course}/{module}/documents/{filename}", tmp_file.name)
        file_name, file_type = filename.rsplit('.', 1)
        doc = fitz.open(tmp_file.name)

        uploaded_keys = []

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text().strip()

            if len(text) < 30:
                # Use AWS Textract for OCR
                try:
                    # Get page as image for Textract
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
                    img_bytes = pix.tobytes("png")
                    text = extract_text_with_textract(img_bytes)
                    print(f"AWS Textract OCR used for page {page_num} of {filename}")
                except Exception as e:
                    logging.warning(f"AWS Textract OCR failed on page {page_num} of {filename}: {e}\n{traceback.format_exc()}")
                    text = ""

            if not text.strip():
                continue

            page_output_key = f'{course}/{module}/documents/{filename}_page_{page_num}.txt'

            # uploads to S3 as one .txt file per page
            with BytesIO(text.encode("utf-8")) as page_output_buffer:
                s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)

            uploaded_keys.append(page_output_key)

        doc.close()
        os.remove(tmp_file.name)

    return uploaded_keys

def add_document(
    bucket: str, 
    course: str, 
    module: str,
    filename: str, 
    vectorstore: PGVector, 
    embeddings: BedrockEmbeddings,
    output_bucket: str = EMBEDDING_BUCKET_NAME
) -> List[Document]:
    """
    Add a document to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the document.
    course (str): The course ID folder in the S3 bucket.
    module (str): The module name and ID folder within the course.
    filename (str): The name of the document file.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    output_bucket (str, optional): The name of the S3 bucket for storing extracted data. Defaults to 'temp-extracted-data'.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
    
    print("output_bucket", output_bucket)
    output_filenames = store_doc_texts(
        bucket=bucket,
        course=course,
        module=module,
        filename=filename,
        output_bucket=output_bucket
    )
    this_doc_chunks = store_doc_chunks(
        bucket=output_bucket,
        filenames=output_filenames,
        vectorstore=vectorstore,
        embeddings=embeddings
    )
    
    return this_doc_chunks

def store_doc_chunks(
    bucket: str, 
    filenames: List[str],
    vectorstore: PGVector, 
    embeddings: BedrockEmbeddings
) -> List[Document]:
    """
    Store chunks of documents in the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text files.
    filenames (List[str]): A list of keys for the text files in the bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
    text_splitter = SemanticChunker(embeddings)
    this_doc_chunks = []

    for filename in filenames:
        this_uuid = str(uuid.uuid4()) # Generating one UUID for all chunks of from a specific page in the document
        output_buffer = BytesIO()
        s3.download_fileobj(bucket, filename, output_buffer)
        output_buffer.seek(0)
        doc_texts = output_buffer.read().decode('utf-8')
        doc_chunks = text_splitter.create_documents([doc_texts])
        
        head, _, _ = filename.partition("_page")
        true_filename = head # Converts 'CourseCode_XXX_-_Course-Name.pdf_page_1.txt' to 'CourseCode_XXX_-_Course-Name.pdf'
        
        doc_chunks = [x for x in doc_chunks if x.page_content]
        
        for doc_chunk in doc_chunks:
            if doc_chunk:
                doc_chunk.metadata["source"] = f"s3://{bucket}/{true_filename}"
                doc_chunk.metadata["doc_id"] = this_uuid
                
            else:
                logger.warning(f"Empty chunk for {filename}")
        
        s3.delete_object(Bucket=bucket, Key=filename)
        print(f"Deleting {filename} from {bucket}")
        
        this_doc_chunks.extend(doc_chunks)
       
    return this_doc_chunks
                
def process_documents(
    bucket: str, 
    course: str, 
    module: str, 
    vectorstore: PGVector, 
    embeddings: BedrockEmbeddings,
    record_manager: SQLRecordManager
) -> None:
    """
    Process and add text documents from an S3 bucket to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text documents.
    course (str): The course ID folder in the S3 bucket.
    module (str): The module ID folder in the S3 bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (BedrockEmbeddings): The embeddings instance.
    record_manager (SQLRecordManager): Manages list of documents in the vectorstore for indexing.
    """
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"{course}/{module}/documents")
    all_doc_chunks = []
    
    for page in page_iterator:
        if "Contents" not in page:
            continue  # Skip pages without any content (e.g., if the bucket is empty)
        for file in page['Contents']:
            filename = file['Key']
            if filename.endswith((".pdf", ".docx", ".pptx", ".txt", ".xlsx", ".xps", ".mobi", ".cbz")):
                this_doc_chunks = add_document(
                    bucket=bucket,
                    course=course,
                    module=module,
                    filename=os.path.basename(filename),
                    vectorstore=vectorstore,
                    embeddings=embeddings
                )

                all_doc_chunks.extend(this_doc_chunks)
    
    if all_doc_chunks:  # Check if there are any documents to index
        idx = index(
            all_doc_chunks, 
            record_manager, 
            vectorstore, 
            cleanup="full",
            source_id_key="source"
        )
        print(f"Indexing updates: \n {idx}")
        logger.info(f"Indexing updates: \n {idx}")
    else:
        idx = index(
            [],
            record_manager, 
            vectorstore, 
            cleanup="full",
            source_id_key="source"
        )
        logger.info("No documents found for indexing.")
        print("No documents found for indexing.")