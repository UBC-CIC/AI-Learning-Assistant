
# vectorstore.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `update_vectorstore`](#update_vectorstore)

## Script Overview <a name="script-overview"></a>
This script provides utility functions to update a vector store with new embeddings from an S3 bucket.

### Import Libraries <a name="import-libraries"></a>
- **typing.Dict**: Used for typing hints to define dictionaries.
- **store_course_data**: Helper functions for storing data in a vector store.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `update_vectorstore` <a name="update_vectorstore"></a>
```python
def update_vectorstore(
    bucket: str,
    course: str,
    vectorstore_config_dict: Dict[str, str],
    embeddings#: BedrockEmbeddings
) -> None:
    store_course_data(
        bucket=bucket,
        course=course,
        vectorstore_config_dict=vectorstore_config_dict,
        embeddings=embeddings
    )
```
#### Purpose
Updates the vector store with embeddings for all documents and images in the specified S3 bucket.

#### Process Flow
1. **Course Data Storage**: Calls the `store_course_data` function to process all documents and images in the S3 bucket. This function extracts the documents, creates embeddings using the `BedrockEmbeddings` instance, and stores the embeddings in the vector store.
2. **Vector Store Configuration**: The function relies on the configuration dictionary `vectorstore_config_dict` to set up the vector store connection, which includes details like the collection name, database name, and connection credentials.

#### Inputs and Outputs
- **Inputs**:
  - `bucket`: Name of the S3 bucket containing the course data.
  - `course`: Name of the course folder within the S3 bucket.
  - `vectorstore_config_dict`: Configuration dictionary for the vector store containing parameters like database credentials and collection name.
  - `embeddings`: Embeddings instance used to process the documents (e.g., `BedrockEmbeddings`).
  
- **Outputs**:
  - No return value. The function updates the vector store with new data from the S3 bucket.

[🔼 Back to top](#table-of-contents)
