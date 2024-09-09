import os
import json
import boto3
import logging
import psycopg2
import boto3
from langchain_community.embeddings import BedrockEmbeddings

from helpers.vectorstore import get_vectorstore_retriever
from helpers.chat import get_bedrock_llm, get_initial_student_query, get_student_query, create_dynamodb_history_table, get_response

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

BEDROCK_LLM_ID = "meta.llama3-70b-instruct-v1:0"
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"
TABLE_NAME = "API-Gateway-Test-Table-Name"


DB_SECRET_NAME = os.environ["SM_DB_CREDENTIALS"]
REGION = os.environ["REGION"]

def get_secret():
    # secretsmanager client to get db credentials
    sm_client = boto3.client("secretsmanager")
    response = sm_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
    secret = json.loads(response)
    return secret

## GETTING AMAZON TITAN EMBEDDINGS MODEL
bedrock_runtime = boto3.client(
        service_name="bedrock-runtime",
        region_name=REGION,
    )

embeddings = BedrockEmbeddings(
    model_id=EMBEDDING_MODEL_ID, 
    client=bedrock_runtime,
    region_name=REGION
)
create_dynamodb_history_table(TABLE_NAME)

def get_module_name(module_id):
    connection = None
    cur = None
    try:
        logger.info(f"Fetching module name for module_id: {module_id}")
        db_secret = get_secret()

        connection_params = {
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': db_secret["host"],
            'port': db_secret["port"]
        }

        connection_string = " ".join([f"{key}={value}" for key, value in connection_params.items()])

        connection = psycopg2.connect(connection_string)
        cur = connection.cursor()
        logger.info("Connected to RDS instance!")

        cur.execute("""
            SELECT module_name 
            FROM "Course_Modules" 
            WHERE module_id = %s;
        """, (module_id,))
        
        result = cur.fetchone()
        logger.info(f"Query result: {result}")
        module_name = result[0] if result else None
        
        cur.close()
        connection.close()
        
        if module_name:
            logger.info(f"Module name for module_id {module_id} found: {module_name}")
        else:
            logger.warning(f"No module name found for module_id {module_id}")
        
        return module_name

    except Exception as e:
        logger.error(f"Error fetching module name: {e}")
        if connection:
            connection.rollback()
        return None
    finally:
        if cur:
            cur.close()
        if connection:
            connection.close()
        logger.info("Connection closed.")

def handler(event, context):
    logger.info("Text Generation Lambda function is called!")

    query_params = event.get("queryStringParameters", {})

    session_id = query_params.get("session_id", "")
    module_id = query_params.get("module_id", "")
    session_name = query_params.get("session_name", "New Chat")

    if not session_id:
        logger.error("Missing required parameter: session_id")
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: session_id')
        }

    if not module_id:
        logger.error("Missing required parameter: module_id")
        return {
            'statusCode': 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Missing required parameter: module_id')
        }
    
    # topic = get_module_name(module_id)
    topic = "data abstraction"

    if topic is None:
        logger.error(f"Invalid module_id: {module_id}")
        return {
            'statusCode': 400,
            'body': json.dumps('Invalid module_id')
        }
    
    body = {} if event.get("body") is None else json.loads(event.get("body"))
    question = body.get("message_content", "")
    
    if not question:
        logger.info(f"Start of conversation. Creating conversation history table in DynamoDB.")
        student_query = get_initial_student_query(topic)
    else:
        logger.info(f"Processing student question: {question}")
        student_query = get_student_query(question)
    
    try:
        logger.info("Creating Bedrock LLM instance.")
        llm = get_bedrock_llm(BEDROCK_LLM_ID)
    except Exception as e:
        logger.error(f"Error creating Bedrock LLM: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error creating Bedrock LLM')
        }
    
    try:
        logger.info("Retrieving vectorstore config.")
        db_secret = get_secret()
        vectorstore_config_dict = {
            'collection_name': 'CPSC_210', # hard coded for now
            'dbname': db_secret["dbname"],
            'user': db_secret["username"],
            'password': db_secret["password"],
            'host': db_secret["host"],
            'port': db_secret["port"]
        }
    except Exception as e:
        logger.error(f"Error retrieving vectorstore config: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error retrieving vectorstore config')
        }
    
    try:
        logger.info("Creating history-aware retriever.")

        history_aware_retriever = get_vectorstore_retriever(
            llm=llm,
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings
        )
    except Exception as e:
        logger.error(f"Error creating history-aware retriever: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error creating history-aware retriever')
        }
    
    try:
        logger.info("Generating response from the LLM.")
        response = get_response(
            query=student_query,
            topic=topic,
            llm=llm,
            history_aware_retriever=history_aware_retriever,
            table_name=TABLE_NAME,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Error getting response: {e}")
        return {
            'statusCode': 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
            'body': json.dumps('Error getting response')
        }
    
    logger.info("Returning the generated response.")
    return {
        "statusCode": 200,
        "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
            },
        "body": json.dumps({
            "session_name": session_name,
            "llm_output": response.get("llm_output", "LLM failed to create response"),
            "llm_verdict": response.get("llm_verdict", "LLM failed to create verdict")
        })
    }