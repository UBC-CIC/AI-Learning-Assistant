# chat.py

## Table of Contents <a name="table-of-contents"></a>
- [Script Overview](#script-overview)
  - [Import Libraries](#import-libraries)
  - [AWS and LLM Integration](#aws-and-llm-integration)
  - [Helper Functions](#helper-functions)
  - [Execution Flow](#execution-flow)
- [Detailed Function Descriptions](#detailed-function-descriptions)
  - [Function: `create_dynamodb_history_table`](#create_dynamodb_history_table)
  - [Function: `get_bedrock_llm`](#get_bedrock_llm)
  - [Function: `get_student_query`](#get_student_query)
  - [Function: `get_initial_student_query`](#get_initial_student_query)
  - [Function: `get_response`](#get_response)
  - [Function: `get_llm_output`](#get_llm_output)

## Script Overview <a name="script-overview"></a>
This script integrates AWS services like DynamoDB and Bedrock LLM with LangChain to create an educational chatbot that can engage with students, ask questions, provide answers, and track student progress toward mastery of a topic. It also includes history-aware functionality, which uses chat history to provide relevant context during conversations.

### Import Libraries <a name="import-libraries"></a>
- **boto3**: AWS SDK to interact with services like DynamoDB and manage resources.
- **ChatBedrock**: Interface for interacting with AWS Bedrock LLM.
- **ChatPromptTemplate, MessagesPlaceholder**: Templates for setting up prompts in LangChain with chat history awareness.
- **create_stuff_documents_chain, create_retrieval_chain**: LangChain utilities to combine document chains and retrieval chains for context-aware question-answering.
- **RunnableWithMessageHistory**: Allows the inclusion of chat history in the reasoning chain.
- **DynamoDBChatMessageHistory**: Stores chat history in DynamoDB.

### AWS and LLM Integration <a name="aws-and-llm-integration"></a>
- **DynamoDB**: Used to store and retrieve session history for conversations between the student and the chatbot.
- **ChatBedrock**: Used to interact with AWS Bedrock LLM for generating responses and engaging with the student.

### Helper Functions <a name="helper-functions"></a>
- **create_dynamodb_history_table**: Creates a DynamoDB table to store chat session history if it doesn't already exist.
- **get_bedrock_llm**: Retrieves an instance of the Bedrock LLM based on a provided model ID.
- **get_student_query**: Formats a student's query into a structured template suitable for processing.
- **get_initial_student_query**: Generates an initial prompt for a student to greet the chatbot and request a question on a specific topic.
- **get_response**: Manages the interaction between the student query, the Bedrock LLM, and the history-aware retriever to generate responses.
- **get_llm_output**: Processes the output from the LLM and checks if the student's competency has been achieved.

### Execution Flow <a name="execution-flow"></a>
1. **DynamoDB Table Creation**: The `create_dynamodb_history_table` function ensures that a DynamoDB table is available to store session history.
2. **Query Processing**: The `get_student_query` and `get_initial_student_query` functions format student queries for processing.
3. **Response Generation**: The `get_response` function uses the Bedrock LLM and chat history to generate responses to student queries and evaluates the student's progress toward mastering the topic.
4. **Competency Evaluation**: The `get_llm_output` function checks if the LLM response indicates that the student has mastered the topic.

## Detailed Function Descriptions <a name="detailed-function-descriptions"></a>

### Function: `create_dynamodb_history_table` <a name="create_dynamodb_history_table"></a>
```python
def create_dynamodb_history_table(table_name: str) -> None:
    # Get the service resource and client.
    dynamodb_resource = boto3.resource("dynamodb")
    dynamodb_client = boto3.client("dynamodb")
    
    # Retrieve the list of tables that currently exist.
    existing_tables = dynamodb_client.list_tables()['TableNames']
    
    if table_name not in existing_tables:  # Create a new table if it doesn't exist.
        # Create the DynamoDB table.
        table = dynamodb_resource.create_table(
            TableName=table_name,
            KeySchema=[{"AttributeName": "SessionId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "SessionId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        # Wait until the table exists.
        table.meta.client.get_waiter("table_exists").wait(TableName=table_name)
```
#### Purpose
Creates a DynamoDB table to store the chat session history if the table doesn't already exist.

#### Process Flow
1. **Check Existing Tables**: Retrieves the list of existing DynamoDB tables.
2. **Table Creation**: If the specified table does not exist, creates it with a `SessionId` key schema and sets up pay-per-request billing mode.
3. **Wait for Table**: Waits for the table creation to complete before returning.

#### Inputs and Outputs
- **Inputs**:
  - `table_name`: The name of the DynamoDB table to create.
  
- **Outputs**:
  - No return value. The function ensures that the specified table exists.

---

### Function: `get_bedrock_llm` <a name="get_bedrock_llm"></a>
```python
def get_bedrock_llm(
    bedrock_llm_id: str,
    temperature: float = 0
) -> ChatBedrock:
    return ChatBedrock(
        model_id=bedrock_llm_id,
        model_kwargs=dict(temperature=temperature),
    )
```
#### Purpose
Retrieves a Bedrock LLM instance based on the provided model ID, with optional control over response randomness through the `temperature` parameter.

#### Process Flow
1. **Create LLM Instance**: Initializes a `ChatBedrock` instance with the specified model ID and temperature setting.
2. **Return LLM**: Returns the initialized LLM instance.

#### Inputs and Outputs
- **Inputs**:
  - `bedrock_llm_id`: The model ID for the Bedrock LLM.
  - `temperature`: Controls the randomness of the LLM's responses (default is 0 for deterministic outputs).
  
- **Outputs**:
  - Returns a `ChatBedrock` instance.

---

### Function: `get_student_query` <a name="get_student_query"></a>
```python
def get_student_query(raw_query: str) -> str:
    student_query = f"""
    user
    {raw_query}
    
    """
    return student_query
```
#### Purpose
Formats a raw student query into a structured template suitable for further processing by the LLM.

#### Process Flow
1. **Format Query**: Wraps the student's query with the `user` label to structure it for the LLM.
2. **Return Formatted Query**: Returns the structured query.

#### Inputs and Outputs
- **Inputs**:
  - `raw_query`: The raw query input from the student.
  
- **Outputs**:
  - Returns the formatted query string.

---

### Function: `get_initial_student_query` <a name="get_initial_student_query"></a>
```python
def get_initial_student_query(topic: str) -> str:
    student_query = f"""
    user
    Greet me and then ask me a question related to the topic: {topic}. 
    """
    return student_query
```
#### Purpose
Generates an initial prompt asking the student to greet the system and pose a question related to a specific topic.

#### Process Flow
1. **Generate Initial Query**: Constructs a query asking the student to greet the system and inquire about a specific topic.
2. **Return Query**: Returns the generated query.

#### Inputs and Outputs
- **Inputs**:
  - `topic`: The topic for which the initial question should be generated.
  
- **Outputs**:
  - Returns the formatted initial query string.

---

### Function: `get_response` <a name="get_response"></a>
```python
def get_response(
    query: str,
    topic: str,
    llm: ChatBedrock,
    history_aware_retriever,
    table_name: str,
    session_id: str
) -> dict:
    # Create a system prompt for the question answering
    system_prompt = (
        ""
        "system"
        "You are an instructor for a course. "
        f"Your job is to help the student master the topic: {topic}. \n"        
        "Engage with the student by asking questions and conversing with them to identify any gaps in their understanding of the topic. If you identify gaps, address these gaps by providing explanations, answering the student's questions, and referring to the relevant context to help the student gain a comprehensive understanding of the topic. "
        "Continue this process until you determine that the student has mastered the topic. \nOnce mastery is achieved, include COMPETENCY ACHIEVED in your response and do not ask any further questions about the topic. "
        "Use the following pieces of retrieved context to answer "
        "a question asked by the student. Use three sentences maximum and keep the "
        "answer concise. End each answer with a question that tests the student's knowledge about the topic."
        ""
        "documents"
        "{context}"
        ""
        "assistant"
    )
    
    qa_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        lambda session_id: DynamoDBChatMessageHistory(
            table_name=table_name, 
            session_id=session_id
        ),
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )
    
    # Generate the response
    response = conversational_rag_chain.invoke(
        {
            "input": query
        },
        config={
            "configurable": {"session_id": session_id}
        },  # constructs a key "session_id" in `store`.
    )["answer"]
    
    return get_llm_output(response)
```
#### Purpose
Generates a response to the student's query using the LLM and a history-aware retriever, incorporating context from previous conversations stored in DynamoDB.

#### Process Flow
1. **Prompt Setup**: Creates a system prompt instructing the LLM to help the student master a specific topic, engaging them in conversation and filling gaps in their understanding.
2. **Contextual Question Answering**: Uses a retrieval chain to fetch relevant documents based on the student's query and chat history.
3. **Chat History Handling**: The conversation history is managed using `DynamoDBChatMessageHistory` for the specific session.
4. **Generate Response**: Generates the response using the LLM and returns the result.

#### Inputs and Outputs
- **Inputs**:
  - `query`: The student's query string.
  - `topic`: The topic the student is learning about.
  - `llm`: The Bedrock LLM instance.
  - `history_aware_retriever`: The retriever providing relevant documents for the query.
  - `table_name`: DynamoDB table name used to store the chat history.
  - `session_id`: Unique identifier for the chat session.
  
- **Outputs**:
  - Returns a dictionary containing the response and the source documents used for retrieval.

---

### Function: `get_llm_output` <a name="get_llm_output"></a>
```python
def get_llm_output(response: str) -> dict:
    llm_verdict = False
    llm_output = response
    
    if "COMPETENCY ACHIEVED" in response:
        llm_verdict = True
        llm_output = response.split("COMPETENCY ACHIEVED")[0]
    
    # Currently just printing this dictionary, but I can also store it (e.g., as a .json) in case that would be easier
    
    return dict(
        llm_output=llm_output,
        llm_verdict=llm_verdict
    )
```
#### Purpose
Processes the response from the LLM to determine if competency in the topic has been achieved by the student.

#### Process Flow
1. **Check Competency**: If the LLM output includes "COMPETENCY ACHIEVED", it indicates that the student has mastered the topic.
2. **Output Processing**: Removes the "COMPETENCY ACHIEVED" part from the response and returns the processed output.
3. **Return Competency Status**: Returns the final response and a flag indicating whether competency has been achieved.

#### Inputs and Outputs
- **Inputs**:
  - `response`: The response generated by the LLM.
  
- **Outputs**:
  - Returns a dictionary with the LLM's output and a boolean indicating whether competency has been achieved.

[🔼 Back to top](#table-of-contents)
