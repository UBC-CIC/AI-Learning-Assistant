import os
from io import BytesIO
import tempfile
from typing import List
import uuid

import boto3
from tqdm import tqdm
import botocore
import pymupdf
from langchain_postgres import PGVector
from langchain_core.documents import Document
from langchain_experimental.open_clip import OpenCLIPEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain.indexes import SQLRecordManager, index
#from helpers.langchain_postgres import PGVector

# Initialize the S3 client
s3 = boto3.client('s3')

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
        doc = pymupdf.open(tmp_file.name)
        output_buffer = BytesIO()

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text().encode("utf8")
            output_buffer.write(text)
            output_buffer.write(bytes((12,)))

            page_output_key = f'{course}/{module}/documents/{filename}_page_{page_num}.txt'
            page_output_buffer = BytesIO(text)
            s3.upload_fileobj(page_output_buffer, output_bucket, page_output_key)

        os.remove(tmp_file.name)

    return [f'{course}/{module}/documents/{filename}_page_{page_num}.txt' for page_num in range(1, len(doc) + 1)]

def add_document(
    bucket: str, 
    course: str, 
    module: str,
    filename: str, 
    vectorstore: PGVector, 
    embeddings: OpenCLIPEmbeddings,
    output_bucket: str = 'temp-extracted-data'
) -> List[Document]:
    """
    Add a document to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the document.
    course (str): The course ID folder in the S3 bucket.
    module (str): The module name and ID folder within the course.
    filename (str): The name of the document file.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    output_bucket (str, optional): The name of the S3 bucket for storing extracted data. Defaults to 'temp-extracted-data'.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
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
    embeddings: OpenCLIPEmbeddings
) -> List[Document]:
    """
    Store chunks of documents in the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text files.
    filenames (List[str]): A list of keys for the text files in the bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    
    Returns:
    List[Document]: A list of all document chunks for this document that were added to the vectorstore.
    """
    text_splitter = SemanticChunker(embeddings)
    this_doc_chunks = []

    for filename in tqdm(filenames, desc="Processing pages"):
        this_uuid = str(uuid.uuid4()) # Generating one UUID for all chunks of from a specific page in the document
        output_buffer = BytesIO()
        s3.download_fileobj(bucket, filename, output_buffer)
        output_buffer.seek(0)
        doc_texts = output_buffer.read().decode('utf-8')
        doc_chunks = text_splitter.create_documents([doc_texts])
        
        head, _, _ = filename.partition("_page")
        true_filename = head # Converts 'CourseCode_XXX_-_Course-Name.pdf_page_1.txt' to 'CourseCode_XXX_-_Course-Name.pdf'

        for doc_chunk in tqdm(doc_chunks, desc=f"Storing chunks for {filename}"):
            if doc_chunk:
                doc_chunk.metadata["source"] = f"s3://{bucket}/{true_filename}"
                doc_chunk.metadata["doc_id"] = this_uuid
                
                vectorstore.add_documents(
                    documents=[doc_chunk]
                )
                
            else:
                logger.warning(f"Empty chunk for {filename}")
        
        this_doc_chunks.extend(doc_chunks)
       
    return this_doc_chunks
                
def process_texts(
    bucket: str, 
    course: str, 
    vectorstore: PGVector, 
    embeddings: OpenCLIPEmbeddings,
    record_manager: SQLRecordManager
) -> None:
    """
    Process and add text documents from an S3 bucket to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the text documents.
    course (str): The course ID folder in the S3 bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    record_manager (SQLRecordManager): Manages list of documents in the vectorstore for indexing.
    """
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"{course}/")
    all_doc_chunks = []
    
    for page in page_iterator:
        for file in page['Contents']:
            filename = file['Key']
            if filename.endswith((".pdf", ".docx", ".pptx", ".txt", ".xlsx", ".xps", ".mobi", ".cbz")):
                module = filename.split('/')[1]
                this_doc_chunks = add_document(
                    bucket=bucket,
                    course=course,
                    module=module,
                    filename=os.path.basename(filename),
                    vectorstore=vectorstore,
                    embeddings=embeddings
                )
                
                all_doc_chunks.extend(this_doc_chunks)
                break
        break
                
    idx = index(
        all_doc_chunks, 
        record_manager, 
        vectorstore, 
        cleanup="incremental",
        source_id_key="source"
    )

    print(f"Indexing updates: \n {idx}")