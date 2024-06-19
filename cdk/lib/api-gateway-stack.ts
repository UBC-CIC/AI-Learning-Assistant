import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
//import { VpcStack } from './vpc-stack';
import * as cognito from "aws-cdk-lib/aws-cognito";

export class ApiGatewayStack extends cdk.Stack {
  private readonly api: apigateway.RestApi;
  private readonly userPool: cognito.UserPool;
  private readonly userPoolClient: cognito.UserPoolClient;
  public getEndpointUrl = () => this.api.url;
  public getUserPoolId = () => this.userPool.userPoolId;
  public getUserPoolClientId = () => this.userPoolClient.userPoolClientId;
  constructor(
    scope: Construct,
    id: string,
    //vpcStack: VpcStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // Create the API Gateway REST API
    this.api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "MyApi",
      description: "API for my application",
    });

    this.userPool = new cognito.UserPool(this, "FacultyCVUserPool", {
      userPoolName: "faculty-cv-user-pool",
      signInAliases: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    this.userPoolClient = new cognito.UserPoolClient(
      this,
      "FacultyCVUserPoolClient",
      {
        userPoolClientName: "faculty-cv-user-pool-client",
        userPool: this.userPool,
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
        authFlows: {
          userSrp: true,
        },
      }
    );

    // Create the Lambda function for RDS
    const lambdaFunctionRDS = new lambda.Function(this, "LambdaFunctionRDS", {
      runtime: lambda.Runtime.NODEJS_16_X,
      //vpc: vpcStack.vpc,
      code: lambda.Code.fromAsset("lambda"),
      handler: "RDS_Integration.handler",
    });

    // Create the Lambda function for Bedrock and DynamoDB
    const lambdaFunctionBedrock = new lambda.Function(
      this,
      "LambdaFunctionBedrock",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "Bedrock_Dynamo.handler",
      }
    );

    // Create the API Gateway resource for RDS
    const rdsResource = this.api.root.addResource("rds");
    rdsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(lambdaFunctionRDS)
    );

    // Create the API Gateway resource for Bedrock and DynamoDB
    const bedrockResource = this.api.root.addResource("bedrock");
    bedrockResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(lambdaFunctionBedrock)
    );
  }
}
