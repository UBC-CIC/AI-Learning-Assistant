# helper.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [Helper Functions](#helper-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `get_vectorstore`](#get_vectorstore)

## Script Overview <a name="script-overview"></a>
This script is designed to initialize and return a PGVector instance that interacts with a PostgreSQL database to store and retrieve vectorized document embeddings.

### Import Libraries <a name="import-libraries"></a>
- **logging**: Used for logging script actions and errors.
- **psycopg2**: For interacting with PostgreSQL databases.
- **BedrockEmbeddings**: LangChain community embeddings instance for handling document embeddings.
- **PGVector**: PostgreSQL-based vector store for storing and retrieving vectorized documents.

### Helper Functions <a name="helper-functions"></a>
- **get_vectorstore**: Initializes and returns a PGVector instance connected to the PostgreSQL database. It handles connection setup and error logging.

### Execution Flow <a name="execution-flow"></a>
1. **Database Connection**: A connection string is built based on the provided database credentials.
2. **Vector Store Initialization**: A PGVector instance is initialized using the connection string and collection name.
3. **Logging**: The script logs successful initialization and error messages if any occur.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `get_vectorstore` <a name="get_vectorstore"></a>
```python
def get_vectorstore(
    collection_name: str, 
    embeddings: BedrockEmbeddings, 
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
    embeddings (BedrockEmbeddings): The embeddings instance.
    dbname (str): The name of the database.
    user (str): The database user.
    password (str): The database password.
    host (str): The database host.
    port (int): The database port.
    
    Returns:
    Optional[PGVector]: The initialized PGVector instance, or None if an error occurred.
    """
    try:
        connection_string = (
            f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        )

        logger.info("Initializing the VectorStore")
        vectorstore = PGVector(
            embeddings=embeddings,
            collection_name=collection_name,
            connection=connection_string,
            use_jsonb=True
        )

        logger.info("VectorStore initialized")
        return vectorstore, connection_string

    except Exception as e:
        logger.error(f"Error initializing vector store: {e}")
        return None
```
# Purpose

Initializes and returns a `PGVector` instance that connects to a PostgreSQL database and prepares a vector store for storing embedded document data.

# Process Flow

## Database Connection Setup

- Creates a connection string using the provided database credentials.
- Logs successful connections or errors.

## Vector Store Initialization

- Constructs a `PGVector` instance using the connection string, collection name, and embeddings.
- If successful, returns the initialized `PGVector` instance along with the connection string.

## Error Handling

- Captures and logs any errors that occur during vector store initialization.

# Inputs and Outputs

## Inputs

- `collection_name`: The name of the collection in the vector store.
- `embeddings`: The `BedrockEmbeddings` instance for creating embeddings.
- `dbname`: Database name.
- `user`: Database user.
- `password`: Database password.
- `host`: Host for the PostgreSQL database.
- `port`: Port for the PostgreSQL database.

## Outputs

- Returns the initialized `PGVector` instance and the connection string if successful.
- Returns `None` if an error occurred during setup.

[🔼 Back to top](#table-of-contents)
