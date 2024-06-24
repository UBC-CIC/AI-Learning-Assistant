#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyStack } from '../lib/amplify-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { BedrockStack } from '../lib/bedrock-stack';
import { DataIngestionStack } from '../lib/data-ingestion-stack';
import { DBStack } from '../lib/database-stack';
import { DBFlowStack } from '../lib/dbFlow-stack';
import { DynamoStack } from '../lib/dynamo-stack';
import { VpcStack } from '../lib/vpc-stack';
const app = new cdk.App();
// Define environment settings
const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION 
};

const vpcStack = new VpcStack(app, 'VpcStack', { env });
const dbStack = new DBStack(app, 'DBStack', vpcStack, { env });
const dbFlowStack = new DBFlowStack(app, 'DBFlowStack', vpcStack, dbStack, { env });
const dynamoStack = new DynamoStack(app, 'DynamoStack',vpcStack,  { env });
const apiStack = new ApiGatewayStack(app, 'ApiGatewayStack', { env });
const amplifyStack = new AmplifyStack(app, 'AmplifyStack',apiStack, { env });
const bedrockStack = new BedrockStack(app, 'BedrockStack', { env });
const dataStack = new DataIngestionStack(app, 'DataIngestionStack', { env });