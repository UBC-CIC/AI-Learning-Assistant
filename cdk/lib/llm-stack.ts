import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VpcStack } from "./vpc-stack";

export class DynamoStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    vpcStack: VpcStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // Create the DynamoDB table
    const table = new dynamodb.Table(this, "ConversationHistory", {
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // Enable encryption at rest
      removalPolicy: cdk.RemovalPolicy.DESTROY, //change to retain
    });

    // Create an IAM role with permissions to access DynamoDB and Secrets Manager
    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Add policy to access DynamoDB
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
        ],
        resources: [table.tableArn],
      })
    );

    // Create a Lambda function
    const dynamo_lambda = new lambda.Function(
      this,
      "ConversationHistoryFunction",
      {
        code: lambda.Code.fromAsset("lambda"), // Path to your Lambda function code
        handler: "dynamo.handler",
        runtime: lambda.Runtime.PYTHON_3_12,
        role: lambdaRole,
        environment: {
          DYNAMODB_TABLE_NAME: table.tableName,
        },
      }
    );
  }
}
