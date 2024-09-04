import logging
from typing import Optional

import psycopg2
# from langchain_experimental.open_clip import OpenCLIPEmbeddings
from langchain_postgres import PGVector

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_vectorstore(
    collection_name: str, 
    # embeddings: OpenCLIPEmbeddings, 
    embeddings, 
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