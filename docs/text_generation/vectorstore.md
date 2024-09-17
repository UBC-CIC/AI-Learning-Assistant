# vectorstore.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [Vector Store and Retrieval Setup](#vector-store-and-retrieval-setup)
  - [Helper Functions](#helper-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `get_vectorstore_retriever`](#function-get_vectorstore_retriever)

## Script Overview <a name="script-overview"></a>
This script provides a utility function to retrieve documents from a vector store using a history-aware retriever. It integrates with a Language Model (LLM) to generate context-aware retrievals based on previous chat history.

### Import Libraries <a name="import-libraries"></a>
- **typing.Dict**: Used for type hints to define dictionaries.
- **VectorStoreRetriever**: Retrieves documents stored in a vector store.
- **ChatPromptTemplate**, **MessagesPlaceholder**: Templates used for chat-based prompting in LangChain.
- **create_history_aware_retriever**: A helper function to create a history-aware retriever that takes into account previous conversations.
- **get_vectorstore**: Helper function from `helpers.helper` for retrieving the vector store configurations.

### Vector Store and Retrieval Setup <a name="vector-store-and-retrieval-setup"></a>
- **Vector Store**: Stores the embeddings of documents, allowing for efficient retrieval based on vector similarity.
- **Retriever**: A history-aware retriever is built by combining a vector store retriever with a prompt-based system that can reformulate questions based on chat history.

### Helper Functions <a name="helper-functions"></a>
- **get_vectorstore_retriever**: Retrieves a vector store retriever and enhances it with history-aware capabilities by combining it with a language model and a system prompt.

### Execution Flow <a name="execution-flow"></a>
1. **Retrieve Vector Store**: The `get_vectorstore_retriever` function connects to the vector store using the provided configurations.
2. **Retriever Initialization**: Converts the vector store into a retriever.
3. **History-Aware Retriever Creation**: Enhances the retriever to be history-aware by using a language model and a contextualization prompt.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `get_vectorstore_retriever` <a name="function-get_vectorstore_retriever"></a>
```python
def get_vectorstore_retriever(
    llm,
    vectorstore_config_dict: Dict[str, str],
    embeddings
) -> VectorStoreRetriever:
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
```
#### Purpose

Retrieves a vector store and returns a history-aware retriever that can contextualize retrievals based on previous chat history.

#### Process Flow

1. **Retrieve Vector Store**: Calls the `get_vectorstore` function with the provided configuration dictionary and embeddings to connect to the vector store.
2. **Retriever Initialization**: Converts the vector store into a retriever by calling `vectorstore.as_retriever()`.
3. **History-Aware Retriever Creation**:
   - Defines a system prompt (`contextualize_q_system_prompt`) to instruct the LLM on how to contextualize questions based on chat history.
   - Uses `ChatPromptTemplate` to structure the prompt and create a dynamic message flow.
   - Combines the retriever and LLM with the contextualization prompt using the `create_history_aware_retriever` function to return a retriever that considers previous conversations when generating responses.

#### Inputs and Outputs

- **Inputs**:
  - `llm`: Language model instance used for generating responses and contextualizing questions.
  - `vectorstore_config_dict`: Configuration dictionary for the vector store, containing parameters like collection name, database credentials, and connection details.
  - `embeddings`: Embeddings instance for processing the documents.

- **Outputs**:
  - Returns a `VectorStoreRetriever` that is enhanced with history-aware capabilities, allowing it to reformulate questions based on the chat history and retrieve the most relevant documents from the vector store.

[🔼 Back to top](#table-of-contents)
