const postgres = require("postgres");
const AWS = require("aws-sdk");

// Gather AWS services
const secretsManager = new AWS.SecretsManager();

async function initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT) {
	// Current RDS_PROXY_ENDPOINT is not used.
	
	// Retrieve the secret from AWS Secrets Manager
	const secret = await secretsManager
	.getSecretValue({ SecretId: SM_DB_CREDENTIALS })
	.promise();

	const credentials = JSON.parse(secret.SecretString);

	const connectionConfig = {
		host: RDS_PROXY_ENDPOINT,
		// host: credentials.host,
		port: credentials.port,
		username: credentials.username,
		password: credentials.password,
		database: credentials.dbname,
		ssl: false,
	};

	// Create the PostgreSQL connection
	// Global variable to hold the database connection
    global.sqlConnectionTableCreator = postgres(connectionConfig);
	
	console.log("Database connection initialized");
}

module.exports = { initializeConnection };