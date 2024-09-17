# helper.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [AWS and Database Setup](#aws-and-database-setup)
  - [Helper Functions](#helper-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `get_vectorstore`](#get_vectorstore)

## Script Overview <a name="script-overview"></a>
This script is designed to interact with an AWS S3 bucket, process course-related documents, and store the extracted data into a PostgreSQL-based vector store using LangChain. The script supports embedding documents, chunking them, and managing metadata in the vector store.

### Import Libraries <a name="import-libraries"></a>
- **logging**: Used for logging script actions and errors.
- **boto3**: AWS SDK for interacting with S3.
- **psycopg2**: For interacting with PostgreSQL databases.
- **BedrockEmbeddings**: LangChain community embeddings instance for handling document embeddings.
- **PGVector**: PostgreSQL-based vector store for storing and retrieving vectorized documents.
- **MultiVectorRetriever**: Multi-vector retriever for querying the vector store.
- **SQLRecordManager**: For managing the document records in the database.
- **process_documents**: A helper function from `processing.documents` to process documents and add them to the vector store.
- **PostgresByteStore**: Custom store for byte-level data in PostgreSQL.

### AWS and Database Setup <a name="aws-and-database-setup"></a>
- **boto3.client('s3')**: Initializes the S3 client to interact with AWS S3, used for fetching course documents from S3 buckets.
- **psycopg2**: Connects to the PostgreSQL database to set up the vector store and store the processed document embeddings.

### Helper Functions <a name="helper-functions"></a>
- **get_vectorstore**: Initializes and returns a PGVector instance connected to the PostgreSQL database. It handles connection setup and error handling.

### Execution Flow <a name="execution-flow"></a>
1. **AWS S3**: The script fetches documents from an S3 bucket.
2. **PostgreSQL Connection**: A PGVector instance is created and connected to the PostgreSQL database.
3. **Document Processing**: Course documents are processed, chunked, and embedded.
4. **Vector Store**: The processed chunks are stored in the vector store for retrieval and search.

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
```
#### Purpose
Initializes and returns a `PGVector` instance that connects to a PostgreSQL database and prepares a vector store for storing embedded document data.

#### Process Flow
1. **Database Connection Setup**: 
   - Creates a connection string using the provided database credentials.
   - Tries to establish a connection to the PostgreSQL database.
   - Logs successful connections or error messages in case of failure.
2. **Vector Store Initialization**:
   - Constructs a PGVector instance using the connection string and collection name.
   - If successful, returns the initialized PGVector instance and connection string for further use.
3. **Error Handling**:
   - Captures and logs any errors that occur during connection or vector store initialization.

#### Inputs and Outputs
- **Inputs**:
  - `collection_name`: The name of the collection in the vector store.
  - `embeddings`: The BedrockEmbeddings instance for creating embeddings.
  - `dbname`: Database name.
  - `user`: Database user.
  - `password`: Database password.
  - `host`: Host for the PostgreSQL database.
  - `port`: Port for the PostgreSQL database.
  
- **Outputs**:
  - Returns the initialized `PGVector` instance and the connection string if successful.
  - Returns `None` if an error occurred during setup.

[🔼 Back to top](#table-of-contents)
