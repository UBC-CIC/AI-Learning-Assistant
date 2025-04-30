# Troubleshooting Guide

## Table of Contents
- [Troubleshooting Guide](#troubleshooting-guide)
  - [SageMaker Notebook for Troubleshooting](#sagemaker-notebook-for-troubleshooting)
    - [Motivation](#motivation)
    - [Creating Notebook Instance](#creating-notebook-instance)
    - [Connecting to RDS](#connecting-to-rds)
    - [Checking Embeddings](#checking-embeddings)
  - [Docker Issues](#docker-issues)
    - [Overview](#overview)
    - [Fixing Docker Login Error](#fixing-docker-login-error)

## SageMaker Notebook for Troubleshooting

### Motivation
Using an AWS SageMaker Notebook instance allows you to quickly experiment with and debug services like RDS, Bedrock, and other AWS resources without deploying your code to a Lambda function or EC2 instance. It also provides a terminal and notebook interface for issuing database queries, running Python scripts, and testing models interactively. This is especially useful for debugging, inspecting embeddings, or verifying if documents are being ingested properly into your system.

---

### Creating Notebook Instance

1. **Navigate to SageMaker Notebooks**  
   Go to AWS SageMaker in the AWS Console, and click **Notebooks** from the sidebar.

2. **Click "Create notebook instance"**  
   Click the orange **Create notebook instance** button.

3. **Fill in Notebook instance settings**
   - In the **Notebook instance name** box, enter a meaningful name (e.g., `debug-notebook`).
   - Choose an appropriate **Notebook instance type**. Smaller types (e.g., `ml.t2.medium`) work for light queries. Use larger types for running ML models.
   - Select a **Platform identifier** based on your use case and region.

4. **Set Permissions and Encryption**
   - Under **IAM role**, you can either let AWS create a new role or select an existing one.
   - If you let AWS create the role, you can later modify its permissions in the **IAM** console to include access to Bedrock, S3, or RDS.

5. **Configure Network (if connecting to private services like RDS)**
   - Select a **VPC**.
   - Choose a **subnet**:
     - Open a new tab and go to **RDS**.
     - Select your database, then look at the **Connectivity & security** panel.
     - Copy one of the **subnets** and paste it in the notebook's **Subnet** field.
   - For **Security groups**:
     - In the same RDS panel, find the associated **security group(s)**.
     - Copy and paste them into the **Security groups** field in SageMaker.

6. **Click "Create notebook instance"**  
   This process may take several minutes. Once the status changes to "InService", your instance is ready.

---

### Connecting to RDS

1. **Open JupyterLab**
   - Click the **Open JupyterLab** button once the instance is running. It will open a new tab.

2. **Open Terminal**
   - In JupyterLab, click **Terminal** to open a shell.
   - Paste the following commands to install required PostgreSQL dependencies:

     ```bash
     sudo amazon-linux-extras install epel && \
     sudo amazon-linux-extras install postgresql10 && \
     sudo yum install -y postgresql postgresql-server && \
     pip3 install --force-reinstall psycopg2==2.9.3
     ```

   - **Explanation**:
     - The first two lines enable and install the PostgreSQL extras repo.
     - The third installs PostgreSQL client tools.
     - The fourth installs the `psycopg2` Python library for interacting with PostgreSQL.
   - Follow prompts and accept any permissions or confirmations.

3. **Retrieve Database Credentials**
   - Open **Secrets Manager** in another tab.
   - Click on the secret named `AILA-staging-DatabaseStack-AILA/credentials/rdsDbCredential`.
   - Click **Retrieve secret value** to reveal your database credentials.

4. **Connect Using `psql`**
   - Format the following command with the retrieved values:

     ```bash
     psql -h <host> -p <port> -d <dbname> -U <username>
     ```

   - Paste the command into the terminal. When prompted for a password, paste the copied password.
   - **Note**: No characters will appear when pasting the password—this is normal.
   - If successful, the prompt will change from `sh-4.2$` to something like `aila=>`.

5. **Inspect Tables**
   - Type the following command in the terminal to list all tables:

     ```sql
     \dt
     ```

   - From here, you can run SQL queries to check or manipulate data in your RDS PostgreSQL database.

---

### Checking Embeddings

In this section, you will learn how to check whether document embeddings have been correctly generated and stored in the database.  
Embeddings are organized into **collections**, and each collection corresponds to a **module** inside a **concept** inside a **course**.  
To verify that embeddings are properly created, you first need to find the right **modules** inside a course. Once you have the module IDs, you can check the associated collections to make sure embeddings are present.

---

1. **View all concepts for a specific course**
   - First, you need to see all the concepts belonging to a course. This will help you identify which concept you want to explore further.

   - Paste the following SQL command into your database terminal:

     ```sql
     SELECT cc.concept_id, cc.concept_name
     FROM "Course_Concepts" cc
     JOIN "Courses" c ON cc.course_id = c.course_id
     WHERE c.course_name = '<course name>';
     ```

   - Replace `<course name>` with the exact name of your course (case-sensitive).

   - This will return a table listing **concept IDs** and **concept names** for the course you specified.

   - You will use the **concept ID** you get here for the next step.

---

2. **View all modules within a concept**
   - Now that you have the concept ID, you can view all the modules (which represent collections of embeddings) under that concept.

   - Paste the following command:

     ```sql
     SELECT module_id, module_name 
     FROM "Course_Modules" 
     WHERE concept_id = '<concept_id>';
     ```

   - Replace `<concept_id>` with the concept ID you got from Step 1.

   - This will return a table listing **module IDs** and **module names** that belong to the selected concept.

   - Each module listed here has (or should have) an associated collection of embeddings.

---

3. **View embedding collections**
   - You can now view the collections stored in your project.

   - To see **all collections** in the project:

     ```sql
     SELECT * FROM langchain_pg_collection;
     ```

   - To see **only the collections related to a specific concept**:

     ```sql
     SELECT lpc.uuid, lpc.name
     FROM "langchain_pg_collection" lpc
     WHERE lpc.name IN (
         SELECT cm.module_id::text
         FROM "Course_Modules" cm
         WHERE cm.concept_id = '<concept_id>'
     );
     ```

   - Replace `<concept_id>` with the concept ID you retrieved earlier.

   - **Notes:**
     - The collection names should match the module IDs from Step 2.
     - The number of collections shown should match the number of modules you saw earlier.
     - Each collection corresponds to one module.

---

4. **Check number of embeddings in a collection**
   - Finally, you can check how many embeddings exist for each module (collection).

   - To check the number of embeddings for a specific module, use:

     ```sql
     SELECT COUNT(*)
     FROM langchain_pg_embedding e
     JOIN langchain_pg_collection c ON e.collection_id = c.uuid
     WHERE c.name = '<module_id or name of collection>';
     ```

   - Replace `<module_id or name of collection>` with the module ID or collection name you want to inspect.

   - This will return a **single number** representing how many embeddings (pieces of information) are stored for that module.

   - **Example:**
     - If you added documents into the module through the web app, you should see the number go **up**.
     - If you delete documents from the module, the number should **go down**.

   - If you want to see the **total number of embeddings** across the entire project (all modules combined), use:

     ```sql
     SELECT COUNT(*) 
     FROM langchain_pg_embedding;
     ```

   - This total embedding count is helpful for verifying the overall ingestion health of your database.

## Docker Issues

### Overview

Docker is used in this project to run two important workflows in the RAG pipeline using AWS Lambda container images:

- **Text Generation**: This Lambda function runs a container image from the `./text_generation` folder to handle prompt processing, document retrieval, and Bedrock LLM generation.
- **Data Ingestion**: This Lambda function uses the `./data_ingestion` folder to process and embed uploaded documents into the vector store.

Both Lambda functions are defined in the CDK using `lambda.DockerImageFunction` and are built as Docker images pushed to AWS Elastic Container Registry (ECR).

> **Note**: You do **not** need to sign into the Docker Desktop app itself. These images are built and uploaded automatically through CDK during deployment.

However, you may encounter Docker login issues when the CDK attempts to push images to ECR.

---

### Fixing Docker Login Error

#### Common Error Message

You may see this error during deployment:

```
fail: docker login --username AWS --password-stdin https://<your-account-id>.dkr.ecr.ca-central-1.amazonaws.com exited with error code 1: Error saving credentials: error storing credentials - err: exit status 1, out: error storing credentials - err: exit status 1, out: The stub received bad data.`
```

This usually happens because Docker is trying to save credentials using a method or system integration that is broken (for example, Docker Desktop's credential helper).

---

#### How to Fix It

##### 1. Locate Docker Config File

Go to this path on your computer:
```
C:\Users<your-username>.docker\config.json
```

---

##### 2. Verify the File Structure

Your `config.json` file should look similar to this (with account IDs anonymized):

```json
{
  "auths": {
    "<account-ID-1>.dkr.ecr.ca-central-1.amazonaws.com": {},
    "<account-ID-2>.dkr.ecr.ca-central-1.amazonaws.com": {},
    "<account-ID-3>.dkr.ecr.us-west-2.amazonaws.com": {}
  },
  "credsStore": "desktop",
  "currentContext": "desktop-linux",
  "plugins": {
    "-x-cli-hints": {
      "enabled": "true"
    }
  },
  "features": {
    "hooks": "true"
  }
}
```

- Make sure the `auths` section includes your AWS Account ID followed by `.dkr.ecr.ca-central-1.amazonaws.com.`
- If it is missing, manually add the following line (replace `<your-account-id>` with your actual AWS Account ID):
```
"<your-account-id>.dkr.ecr.ca-central-1.amazonaws.com": {},
```

- Save the file after making changes.

---

##### 3. Manually Log In to ECR

Run the following command in your terminal or PowerShell to authenticate Docker with ECR:

```
aws ecr get-login-password --region ca-central-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.ca-central-1.amazonaws.com
```

- Replace `<your-account-id>` with your actual AWS Account ID.

This command retrieves a temporary login token and uses it to authenticate your Docker client with ECR.
If the command succeeds, your Docker image deployments through CDK should now work properly without further login errors.