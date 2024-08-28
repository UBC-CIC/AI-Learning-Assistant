import logging
import boto3
from typing import Dict

from langchain_experimental.open_clip import OpenCLIPEmbeddings
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain.indexes import SQLRecordManager

from processing.figures import process_figures
from processing.documents import process_texts
from helpers.store import PostgresByteStore
s3 = boto3.client('s3')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
    
def store_course_data(
    bucket: str, 
    course: str, 
    vectorstore_config_dict: Dict[str, str], 
    embeddings: OpenCLIPEmbeddings
) -> None:
    """
    Store course data from an S3 bucket into the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket.
    course (str): The course name/folder in the S3 bucket.
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    """
    vectorstore, connection_string = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )
    
    
    
    if vectorstore:
        store = PostgresByteStore(connection_string, vectorstore_config_dict['collection_name'])
        
        retriever = MultiVectorRetriever(
            vectorstore=vectorstore, 
            docstore=store, 
            id_key="doc_id",
        )
        
        # define record manager
        namespace = f"pgvector/{vectorstore_config_dict['collection_name']}"
        record_manager = SQLRecordManager(
            namespace, db_url=connection_string
        )
        record_manager.create_schema()

    if not vectorstore:
        logger.error("VectorStore could not be initialized")
        return

    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=f"{course}/")

    for page in page_iterator:
        for file in page['Contents']:
            filename = file['Key']
            module = filename.split('/')[1]
            
            if 'images/' in filename:
                process_figures(
                    bucket=bucket,
                    course=course,
                    vectorstore=vectorstore,
                    embeddings=embeddings,
                    record_manager=record_manager
                )
            elif 'documents/' in filename:
                process_texts(
                    bucket=bucket,
                    course=course,
                    vectorstore=vectorstore,
                    embeddings=embeddings,
                    record_manager=record_manager
                )