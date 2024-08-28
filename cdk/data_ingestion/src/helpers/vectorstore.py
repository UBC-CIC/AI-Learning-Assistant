from typing import Dict

from helpers.helper import store_course_data

def update_vectorstore(
    bucket: str,
    course: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings#: OpenCLIPEmbeddings
) -> None:
    """
    Update the vectorstore with embeddings for all documents and images in the S3 bucket.

    Args:
    bucket (str): The name of the S3 bucket containing the course folders.
    course (str): The name of the course folder within the S3 bucket.
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore, including parameters like collection name, database name, user, password, host, and port.
    embeddings (OpenCLIPEmbeddings): The embeddings instance used to process the documents and images.

    Returns:
    None
    """
    store_course_data(
        bucket=bucket,
        course=course,
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings
    )