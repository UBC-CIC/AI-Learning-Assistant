import logging
from typing import Dict, Optional

import psycopg2
from langchain_experimental.open_clip import OpenCLIPEmbeddings
from langchain_postgres import PGVector
from langchain.retrievers.multi_vector import MultiVectorRetriever
from langchain.indexes import SQLRecordManager, index

from processing.figures import process_figures
from processing.documents import process_texts
from helpers.store import PostgresByteStore
#from helpers.langchain_postgres import PGVector

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_vectorstore(
    collection_name: str, 
    embeddings: OpenCLIPEmbeddings, 
    dbname: str, 
    user: str, 
    password: str, 
    host: str, 
    port: int
) -> Optional[PGVector]:
    """
    Initialize and return a PGVector instance.
    
    Args:
    collection_name (str): The name of the collection.
    embeddings (OpenCLIPEmbeddings): The embeddings instance.
    dbname (str): The name of the database.
    user (str): The database user.
    password (str): The database password.
    host (str): The database host.
    port (int): The database port.
    
    Returns:
    Optional[PGVector]: The initialized PGVector instance, or None if an error occurred.
    """
    connection_params = {
        'dbname': dbname,
        'user': user,
        'password': password,
        'host': host,
        'port': port
    }

    connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])

    try:
        logger.info("Connecting to the database")
        connection = psycopg2.connect(connection_string)
        logger.info("Connected to the database")
    except Exception as e:
        logger.error(f"Error connecting to the database: {e}")
        return None

    try:
        connection_string2 = (
            f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        )

        logger.info("Initializing the VectorStore")
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=connection_string2,
            use_jsonb=True
        )

        logger.info("VectorStore initialized")
        return vectorstore, connection_string2

    except Exception as e:
        logger.error(f"Error initializing vector store: {e}")
        return None
    
def store_course_data(
    bucket: str, 
    folder: str, 
    vectorstore_config_dict: Dict[str, str], 
    embeddings: OpenCLIPEmbeddings
) -> None:
    """
    Store course data from an S3 bucket into the vectorstore.
    
    Args:
    bucket (str): The name of the S3 bucket.
    folder (str): The folder in the S3 bucket.
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

    if folder == 'figures':
        process_figures(
            bucket=bucket,
            folder=folder,
            vectorstore=vectorstore,
            embeddings=embeddings,
            record_manager=record_manager
        )
    elif folder == 'documents':
        process_texts(
            bucket=bucket,
            folder=folder,
            vectorstore=vectorstore,
            embeddings=embeddings,
            record_manager=record_manager
        )
    elif folder == 'all':
        process_figures(
            bucket=bucket,
            folder='figures',
            vectorstore=vectorstore,
            embeddings=embeddings,
            record_manager=record_manager
        )
        process_texts(
            bucket=bucket,
            folder='documents',
            vectorstore=vectorstore,
            embeddings=embeddings,
            record_manager=record_manager
        )