import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { VpcStack } from "./vpc-stack";
import { DatabaseStack } from "./database-stack";

export class DockerLambdaStack extends cdk.Stack {
  public readonly dockerFuncArn: string;

  constructor(
    scope: Construct,
    id: string,
    vpcStack: VpcStack,
    dbStack: DatabaseStack,
    props?: cdk.StackProps) {
    super(scope, id, props);

    const dockerFunc = new lambda.DockerImageFunction(this, "DockerFunc", {
      code: lambda.DockerImageCode.fromImageAsset("./text_generation"),
      memorySize: 512,
      timeout: cdk.Duration.seconds(300),
      vpc: vpcStack.vpc, // Pass the VPC
      functionName: "TextGenLambdaDockerFunc",
      environment: {
        SM_DB_CREDENTIALS: dbStack.secretPathUser.secretName, // Database User Credentials
        RDS_PROXY_ENDPOINT: dbStack.rdsProxyEndpoint, // RDS Proxy Endpoint
      },
    });

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfnDockerFunc = dockerFunc.node.defaultChild as lambda.CfnFunction;
    cfnDockerFunc.overrideLogicalId("TextGenLambdaDockerFunc");

    // Store the ARN for later use - doing nothing right now
    this.dockerFuncArn = dockerFunc.functionArn;
  }
}