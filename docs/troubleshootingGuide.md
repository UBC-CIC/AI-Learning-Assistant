# Troubleshooting Guide

## Table of Contents
- [Troubleshooting Guide](#troubleshooting-guide)
  - [SageMaker Notebook for Troubleshooting](#sagemaker-notebook-for-troubleshooting)
    - [Motivation](#motivation)
    - [Creating Notebook Instance](#creating-notebook-instance)
    - [Connecting to RDS](#connecting-to-rds)
    - [Checking Embeddings](#checking-embeddings)

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
Coming soon...
