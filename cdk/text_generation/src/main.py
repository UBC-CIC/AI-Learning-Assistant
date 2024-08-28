import json
import logging
import psycopg2
from langchain_experimental.open_clip import OpenCLIPEmbeddings

from helpers.param_manager import get_param_manager
from helpers.vectorstore import get_vectorstore_retriever
from helpers.chat import get_bedrock_llm, get_initial_student_query, get_student_query, create_dynamodb_history_table, get_response

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()


param_manager = get_param_manager()

BEDROCK_LLM_ID = "meta.llama3-70b-instruct-v1:0"
DB_SECRET_NAME = "credentials/rdsDbCredential"

def get_module_name(module_id):
    try:
        db_secret = param_manager.get_secret(DB_SECRET_NAME)

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
            FROM Course_Modules 
            WHERE module_id = %s;
        """, (module_id,))
        
        result = cur.fetchone()
        module_name = result['module_name'] if result else None
        
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

    table_name = query_params.get("table_name", "")
    session_id = query_params.get("session_id", "")
    module_id = query_params.get("module_id", "")
    question = query_params.get("question", "")

    if not table_name:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: table_name')
        }

    if not session_id:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: session_id')
        }

    if not module_id:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: module_id')
        }
    
    topic = get_module_name(module_id)

    if topic is None:
        return {
            'statusCode': 400,
            'body': json.dumps('Invalid module_id')
        }    
    
    if len(question) == 0 and not create_dynamodb_history_table(table_name):
        student_query = get_initial_student_query(topic)
    elif len(question) > 0:
        student_query = get_student_query(question)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required parameter: question')
        }
    
    try:
        llm = get_bedrock_llm(BEDROCK_LLM_ID)
    except Exception as e:
        logger.error(f"Error creating Bedrock LLM: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error creating Bedrock LLM')
        }
    
    try:
        db_secret = param_manager.get_secret(DB_SECRET_NAME)
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
            'body': json.dumps('Error retrieving vectorstore config')
        }
    
    try:
        embeddings = OpenCLIPEmbeddings()

        history_aware_retriever = get_vectorstore_retriever(
            llm=llm,
            vectorstore_config_dict=vectorstore_config_dict,
            embeddings=embeddings
        )
    except Exception as e:
        logger.error(f"Error creating vectorstore retriever: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error creating vectorstore retriever')
        }
    
    try:
        response = get_response(
            query=student_query,
            topic=topic,
            llm=llm,
            history_aware_retriever=history_aware_retriever,
            table_name=table_name,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Error getting response: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error getting response')
        }
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({"module_name": topic,
                            "llm_output": response["llm_ouput"],
                            "llm_verdict": response["llm_verdict"]})
    }