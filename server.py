import boto3
import json
from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)

def llmresponsetestuniquename(prompt):    

    system_prompt = "You are a helpful UBC CPSC 210 learning assistant who answers with kindness while being concise. The couse is about object oriented programming."

    prompt = f"""
        <|begin_of_text|>
        <|start_header_id|>system<|end_header_id|>
        {system_prompt}
        <|eot_id|>
        <|start_header_id|>user<|end_header_id|>
        {prompt}
        <|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
        """
    
    bedrock_runtime = boto3.client('bedrock-runtime', 
        region_name='ca-central-1',
        aws_access_key_id="",
        aws_secret_access_key="",
        aws_session_token=''
    )
    kwargs = {
        "modelId": "meta.llama3-8b-instruct-v1:0",
        "contentType": "application/json",
        "accept": "application/json",
        "body": json.dumps({
            "prompt": prompt,
            "max_gen_len": 512,
            "temperature": 0.5,
            "top_p": 0.9
        })
    }

    try:
        model_response = bedrock_runtime.invoke_model(**kwargs)
        body = json.loads(model_response['body'].read())
        generated_text = body.get('generation', 'No generation found')
    except Exception as e:
        generated_text = f"Error occurred: {str(e)}"

    return generated_text

@app.route('/answer', methods=['POST'])
@cross_origin()
def answer():
    data = request.json
    llmresp = llmresponsetestuniquename(data["message_content"])
    response = {
        'message': llmresp
    }
    return jsonify(response)

@app.route('/', methods=['GET'])
@cross_origin()
def home():
    # Return a simple welcome message for the home endpoint
    response = {
        'message': 'Welcome to the home page!'
    }
    
    # Return the response as JSON
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)