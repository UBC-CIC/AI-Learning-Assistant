import os
import json
import boto3
import psycopg2
from psycopg2.extensions import AsIs
import secrets

DB_SECRET_NAME = os.environ["DB_SECRET_NAME"]
DB_USER_SECRET_NAME = os.environ["DB_USER_SECRET_NAME"]


def getDbSecret():
    # secretsmanager client to get db credentials
    sm_client = boto3.client("secretsmanager")
    response = sm_client.get_secret_value(SecretId=DB_SECRET_NAME)["SecretString"]
    secret = json.loads(response)
    return secret


dbSecret = getDbSecret()

connection = psycopg2.connect(
    user=dbSecret["username"],
    password=dbSecret["password"],
    host=dbSecret["host"],
    dbname=dbSecret["dbname"],
)

cursor = connection.cursor()


def readJSONFile(filepath):
    with open(filepath, "r") as file:
        data = json.load(file)

    return data


def handler(event, context):
    try:

        #
        ## Create tables and schema
        ##

        # Create tables based on the schema
        sqlTableCreation = """
            CREATE TABLE IF NOT EXISTS "Users" (
            "user_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "username" varchar,
            "first_name" varchar,
            "last_name" varchar,
            "preferred_name" varchar,
            "email" varchar,
            "time_account_created" timestamp,
            "roles" varchar[],
            "last_sign_in" timestamp
            );

            CREATE TABLE IF NOT EXISTS "LLM_Vectors" (
            "enrolment_id" uuid,
            "student_strengths_embeddings" float[],
            "student_weaknesses_embeddings" float[]
            );

            CREATE TABLE IF NOT EXISTS "Courses" (
            "course_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "course_name" varchar,
            "course_deparment" varchar,
            "course_number" integer,
            "course_access_code" integer,
            "course_student_access" bool,
            "system_prompt" text,
            "llm_tone" varchar
            );

            CREATE TABLE IF NOT EXISTS "Course_Modules" (
            "module_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "concept_id" uuid,
            "module_name" varchar,
            "module_number" integer
            );

            CREATE TABLE IF NOT EXISTS "Enrolments" (
            "enrolment_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "user_id" uuid,
            "course_id" uuid,
            "enrolment_type" varchar,
            "course_completion_percentage" integer,
            "time_spent" integer,
            "time_enroled" timestamp
            );

            CREATE TABLE IF NOT EXISTS "Module_Files" (
            "file_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "module_id" uuid,
            "filetype" varchar,
            "s3_bucket_reference" varchar,
            "filepath" varchar,
            "filename" varchar,
            "time_uploaded" timestamp
            );

            CREATE TABLE IF NOT EXISTS "Chunks" (
            "chunk_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "file_id" uuid,
            "vectors" float[]
            );

            CREATE TABLE IF NOT EXISTS "Student_Modules" (
            "student_module_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "course_module_id" uuid,
            "enrolment_id" uuid,
            "module_score" integer,
            "last_accessed" timestamp,
            "module_context_embedding" float[]
            );

            CREATE TABLE IF NOT EXISTS "Sessions" (
            "session_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "student_module_id" uuid,
            "session_context_embeddings" float[],
            "last_accessed" timestamp
            );

            CREATE TABLE IF NOT EXISTS "Messages" (
            "message_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "session_id" uuid,
            "student_sent" bool,
            "message_content" varchar,
            "time_sent" timestamp
            );

            CREATE TABLE IF NOT EXISTS "Course_Concepts" (
            "concept_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "course_id" uuid,
            "concept_name" varchar
            );

            CREATE TABLE IF NOT EXISTS "User_Engagement_Log" (
            "log_id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
            "user_id" uuid,
            "course_id" uuid,
            "module_id" uuid,
            "enrolment_id" uuid,
            "timestamp" timestamp,
            "engagement_type" varchar
            );

            ALTER TABLE "User_Engagement_Log" ADD FOREIGN KEY ("enrolment_id") REFERENCES "Enrolments" ("enrolment_id");

            ALTER TABLE "User_Engagement_Log" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("user_id");

            ALTER TABLE "User_Engagement_Log" ADD FOREIGN KEY ("course_id") REFERENCES "Courses" ("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "User_Engagement_Log" ADD FOREIGN KEY ("module_id") REFERENCES "Course_Modules" ("module_id");

            ALTER TABLE "Course_Concepts" ADD FOREIGN KEY ("course_id") REFERENCES "Courses" ("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Course_Modules" ADD FOREIGN KEY ("concept_id") REFERENCES "Course_Concepts" ("concept_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Enrolments" ADD FOREIGN KEY ("course_id") REFERENCES "Courses" ("course_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Enrolments" ADD FOREIGN KEY ("user_id") REFERENCES "Users" ("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Module_Files" ADD FOREIGN KEY ("module_id") REFERENCES "Course_Modules" ("module_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Student_Modules" ADD FOREIGN KEY ("course_module_id") REFERENCES "Course_Modules" ("module_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Enrolments" ADD FOREIGN KEY ("enrolment_id") REFERENCES "LLM_Vectors" ("enrolment_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Student_Modules" ADD FOREIGN KEY ("enrolment_id") REFERENCES "Enrolments" ("enrolment_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Sessions" ADD FOREIGN KEY ("student_module_id") REFERENCES "Student_Modules" ("student_module_id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "Messages" ADD FOREIGN KEY ("session_id") REFERENCES "Sessions" ("session_id");

            ALTER TABLE "Chunks" ADD FOREIGN KEY ("file_id") REFERENCES "Module_Files" ("file_id") ON DELETE CASCADE ON UPDATE CASCADE;
        """

        #
        ## Create user with limited permission on RDS
        ##

        # Execute table creation
        cursor.execute(sqlTableCreation)
        connection.commit()

        # Generate 16 bytes username and password randomly
        username = secrets.token_hex(8)
        password = secrets.token_hex(16)

        # Based on the observation,
        #   - Database name: does not reflect from the CDK dbname read more from https://stackoverflow.com/questions/51014647/aws-postgres-db-does-not-exist-when-connecting-with-pg
        #   - Schema: uses the default schema 'public' in all tables
        #
        # Create new user with the following permission:
        #   - SELECT
        #   - INSERT
        #   - UPDATE
        #   - DELETE

        # comment out to 'connection.commit()' on redeployment
        sqlCreateUser = """
            DO $$
            BEGIN
                CREATE ROLE readwrite;
            EXCEPTION
                WHEN duplicate_object THEN
                    RAISE NOTICE 'Role already exists.';
            END
            $$;

            GRANT CONNECT ON DATABASE postgres TO readwrite;

            GRANT USAGE, CREATE ON SCHEMA public TO readwrite;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;
            GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO readwrite;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO readwrite;

            CREATE USER "%s" WITH PASSWORD '%s';
            GRANT readwrite TO "%s";
        """

        # Execute table creation
        cursor.execute(
            sqlCreateUser,
            (
                AsIs(username),
                AsIs(password),
                AsIs(username),
            ),
        )
        connection.commit()

        #
        ## Load client username and password to SSM
        ##
        authInfo = {"username": username, "password": password}

        # comment out to on redeployment
        dbSecret.update(authInfo)
        sm_client = boto3.client("secretsmanager")
        sm_client.put_secret_value(
            SecretId=DB_USER_SECRET_NAME, SecretString=json.dumps(dbSecret)
        )


        # Close cursor and connection
        cursor.close()
        connection.close()

        print("Initialization completed")
    except Exception as e:
        print(e)
