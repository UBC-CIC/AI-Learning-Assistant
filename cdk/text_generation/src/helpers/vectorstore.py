from typing import Dict

from langchain_core.vectorstores import VectorStoreRetriever
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever

from helpers.helper import store_course_data, get_vectorstore

def update_vectorstore(
    bucket: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings#: OpenCLIPEmbeddings
) -> None:
    """
    Update the vectorstore with embeddings for all documents in the S3 bucket.

    Args:
    bucket (str): The name of the S3 bucket containing the sub-folders "documents" and "figures".
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore, including parameters like collection name, database name, user, password, host, and port.
    embeddings (OpenCLIPEmbeddings): The embeddings instance used to process the documents.

    Returns:
    None
    """
    store_course_data(
        bucket=bucket,
        folder='all',
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings
    )
    
def get_vectorstore_retriever(
    llm,
    vectorstore_config_dict: Dict[str, str],
    embeddings#: OpenCLIPEmbeddings
) -> VectorStoreRetriever:
    """
    Retrieve the vectorstore and return the history-aware retriever object.

    Args:
    llm: The language model instance used to generate the response.
    vectorstore_config_dict (Dict[str, str]): The configuration dictionary for the vectorstore, including parameters like collection name, database name, user, password, host, and port.
    embeddings (OpenCLIPEmbeddings): The embeddings instance used to process the documents.

    Returns:
    VectorStoreRetriever: A history-aware retriever instance.
    """
    vectorstore, _ = get_vectorstore(
        collection_name=vectorstore_config_dict['collection_name'],
        embeddings=embeddings,
        dbname=vectorstore_config_dict['dbname'],
        user=vectorstore_config_dict['user'],
        password=vectorstore_config_dict['password'],
        host=vectorstore_config_dict['host'],
        port=int(vectorstore_config_dict['port'])
    )

    retriever = vectorstore.as_retriever()

    # Contextualize question and create history-aware retriever
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )
    contextualize_q_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    history_aware_retriever = create_history_aware_retriever(
        llm, retriever, contextualize_q_prompt
    )

    return history_aware_retriever