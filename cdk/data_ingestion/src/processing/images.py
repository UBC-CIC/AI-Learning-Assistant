import os, tempfile, logging, uuid
from pathlib import Path

import boto3, botocore
from PIL import Image
from langchain_postgres import PGVector
from langchain_experimental.open_clip import OpenCLIPEmbeddings
from langchain.indexes import SQLRecordManager, index
from transformers import BlipProcessor, BlipForConditionalGeneration

from processing.documents import extract_txt

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the S3 client
s3 = boto3.client('s3')

# Initialize the image captioning model
image_captioning_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
image_captioning_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")

def change_file_extension(
    filename: str, 
    extension: str
) -> str:
    """
    Change the file extension of the given filename.
    
    Args:
    filename (str): The original filename.
    extension (str): The new extension.
    
    Returns:
    str: The filename with the new extension.
    """
    if extension.startswith('.'):
        return Path(filename).stem + extension
    return Path(filename).stem + '.' + extension

def is_valid_image_pillow(
    file_path: str
) -> bool:
    """
    Check if the file at the given path is a valid image.
    
    Args:
    file_path (str): The path to the file to be checked.
    
    Returns:
    bool: True if the file is a valid image, False otherwise.
    """
    try:
        with Image.open(file_path) as img:
            img.verify()
            return True
    except (IOError, SyntaxError):
        return False

def add_image(
    bucket: str, 
    course: str, 
    module: str,
    image_filename: str, 
    image_uri: str, 
    image_description: str, 
    vectorstore: PGVector, 
    embeddings: OpenCLIPEmbeddings
) -> None:
    """
    Add an image and its description to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the image.
    course (str): The course ID folder in the S3 bucket.
    module (str): The module name and ID folder within the course.
    image_filename (str): The name of the image file.
    image_uri (str): The URI of the image.
    image_description (str): The description of the image.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    """
    logger.info(f"Adding image {image_filename} to the vectorstore")

    image_embeddings = embeddings.embed_image([image_uri])
    metadata = {
        "source": f"s3://{bucket}/{course}/{module}/images/{image_filename}",
        "doc_id": str(uuid.uuid4())
    }

    if image_description is None: # Automatically generate image description
        raw_image = Image.open(image_uri).convert('RGB')
        
        # Unconditional image captioning
        inputs = image_captioning_processor(raw_image, return_tensors="pt")
        out = image_captioning_model.generate(**inputs)
        image_description = image_captioning_processor.decode(out[0], skip_special_tokens=True)
        
    vectorstore.add_embeddings(
        embeddings=image_embeddings,
        texts=[image_description],
        metadata=[metadata]
    )

    logger.info(f"Successfully added image {image_filename} to the vectorstore")
    
def process_images(
    bucket: str, 
    course: str,
    vectorstore: PGVector, 
    embeddings: OpenCLIPEmbeddings, 
    record_manager: SQLRecordManager
) -> None:
    """
    Process and add figures from an S3 bucket to the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket containing the figures.
    course (str): The course ID folder in the S3 bucket.
    vectorstore (PGVector): The vectorstore instance.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    record_manager (SQLRecordManager): Manages list of documents in the vectorstore for indexing.
    """
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"{course}/")

    images_processed = False
    
    for page in page_iterator:
        if 'Contents' not in page:
            continue  # Skip pages without any content (e.g., if the bucket is empty)
        
        for file in page['Contents']:
            filename = file['Key']
            if filename.split('/')[-2] == "images": # Ensures that only files in the 'images' folder are processed

                # Create a temporary file to download the image
                with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                    s3.download_fileobj(bucket, filename, tmp_file)
                    tmp_file_path = tmp_file.name

                if is_valid_image_pillow(tmp_file_path):  # Validate image file
                    module = filename.split('/')[1]
                    image_description_filename = change_file_extension(filename, 'txt')
                    image_description_file_key = f"{course}/{module}/images/{image_description_filename}"

                    image_description = None
                    try:
                        s3.head_object(Bucket=bucket, Key=image_description_file_key)  # Check if the .txt file exists
                        file_exists = True
                    except botocore.exceptions.ClientError as e:
                        error_code = int(e.response['Error']['Code'])
                        file_exists = (error_code != 404)

                    if file_exists:
                        image_description = extract_txt(
                            bucket=bucket,
                            file_key=image_description_file_key
                        )

                    add_image(
                        bucket=bucket,
                        course=course,
                        module=module,
                        image_filename=os.path.basename(filename),
                        image_uri=tmp_file_path,
                        image_description=image_description,
                        vectorstore=vectorstore,
                        embeddings=embeddings
                    )
                    images_processed = True  # Track that at least one image was processed

                # Clean up temporary file
                os.remove(tmp_file_path)

    if not images_processed:
        logger.info(f"No images found for course '{course}' in bucket '{bucket}'.")