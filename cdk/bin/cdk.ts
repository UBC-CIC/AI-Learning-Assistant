#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import { AmplifyStack } from '../lib/amplify-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { DatabaseStack } from '../lib/database-stack';
import { DBFlowStack } from '../lib/dbFlow-stack';
import { VpcStack } from '../lib/vpc-stack';
import { CICDStack } from '../lib/cicd-stack';

const app = new cdk.App();

const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION 
};
const StackPrefix = app.node.tryGetContext("StackPrefix")
const vpcStack = new VpcStack(app, `${StackPrefix}-VpcStack`, { env });
const dbStack = new DatabaseStack(app, `${StackPrefix}-DatabaseStack`, vpcStack, { env });

const cicdStack = new CICDStack(app, `${StackPrefix}-CICDStack`, {
  env,
  githubRepo: app.node.tryGetContext("githubRepo"),
  environmentName: "dev",
  lambdaFunctions: [
    {
      name: "textGeneration",
      functionName: `${StackPrefix}-TextGenLambdaDockerFunc`,
      sourceDir: "cdk/text_generation"
    },
    {
      name: "sqsTrigger", 
      functionName: `${StackPrefix}-SQSTriggerDockerFunc`,
      sourceDir: "cdk/sqsTrigger"
    },
    {
      name: "dataIngestion",
      functionName: `${StackPrefix}-DataIngestLambdaDockerFunc`,
      sourceDir: "cdk/data_ingestion"
    }
  ]
});

const apiStack = new ApiGatewayStack(app, `${StackPrefix}-ApiGatewayStack`, dbStack, vpcStack, cicdStack.ecrRepositories, cicdStack.buildProjects, { env });
apiStack.addDependency(cicdStack);

const dbFlowStack = new DBFlowStack(app, `${StackPrefix}-DBFlowStack`, vpcStack, dbStack, { env });
const amplifyStack = new AmplifyStack(app, `${StackPrefix}-AmplifyStack`, apiStack, { env });

Tags.of(app).add("app", "AI-Learning-Assistant");