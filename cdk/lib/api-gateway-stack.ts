import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import {
  Architecture,
  Code,
  Function,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
//import { VpcStack } from './vpc-stack';
import * as cognito from "aws-cdk-lib/aws-cognito";
import { CfnJson } from "aws-cdk-lib";

export class ApiGatewayStack extends cdk.Stack {
  private readonly api: apigateway.RestApi;
  public readonly appClient: cognito.UserPoolClient;
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  private readonly layerList: { [key: string]: LayerVersion };
  public getEndpointUrl = () => this.api.url;
  public getUserPoolId = () => this.userPool.userPoolId;
  public getUserPoolClientId = () => this.appClient.userPoolClientId;
  public addLayer = (name: string, layer: LayerVersion) =>
    (this.layerList[name] = layer);
  public getLayers = () => this.layerList;
  constructor(
    scope: Construct,
    id: string,
    //vpcStack: VpcStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    this.layerList = {};

    //create psycopglayer
    const psycopgLayer = new LayerVersion(this, "psycopgLambdaLayer", {
      code: Code.fromAsset("./layers/psycopg2.zip"),
      compatibleRuntimes: [Runtime.PYTHON_3_9],
      description: "Lambda layer containing the psycopg2 Python library",
    });

    this.layerList["psycopg2"] = psycopgLayer;

    // Create the API Gateway REST API
    this.api = new apigateway.RestApi(this, "MyApi", {
      restApiName: "MyApi",
      cloudWatchRole: true,
      description: "API for my application",
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO, // Set logging level here
      },
    });

    // Create Cognito user pool

    /**
     *
     * Create Cognito User Pool
     * Using verification code
     * Inspiration from http://buraktas.com/create-cognito-user-pool-aws-cdk/
     */
    const userPoolName = "ailaUserPool";
    this.userPool = new cognito.UserPool(this, "aila-pool", {
      userPoolName: userPoolName,
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true, // Enabled to allow mobile user sign up
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: "You need to verify your email",
        emailBody:
          "Thanks for signing up to AI Learning Assistant. \n Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create app client
    this.appClient = this.userPool.addClient("aila-pool", {
      userPoolClientName: userPoolName,
      authFlows: {
        userPassword: true,
      },
    });

    this.identityPool = new cognito.CfnIdentityPool(
      this,
      "aila-identity-pool",
      {
        allowUnauthenticatedIdentities: true, // don't allow unauthenticated users
        identityPoolName: "ailaIdentityPool",
        cognitoIdentityProviders: [
          {
            clientId: this.appClient.userPoolClientId,
            providerName: this.userPool.userPoolProviderName,
          },
        ],
      }
    );
    // Create Cognito user pool groups
    const studentGroup = new cognito.CfnUserPoolGroup(this, "StudentGroup", {
      groupName: "student",
      userPoolId: this.userPool.userPoolId,
    });

    const instructorGroup = new cognito.CfnUserPoolGroup(
      this,
      "InstructorGroup",
      {
        groupName: "instructor",
        userPoolId: this.userPool.userPoolId,
      }
    );

    const adminGroup = new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      groupName: "admin",
      userPoolId: this.userPool.userPoolId,
    });

    const techAdminGroup = new cognito.CfnUserPoolGroup(
      this,
      "TechAdminGroup",
      {
        groupName: "techadmin",
        userPoolId: this.userPool.userPoolId,
      }
    );

    // Create roles and policies
    const createPolicyStatement = (actions: string[], resources: string[]) => {
      return new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: actions,
        resources: resources,
      });
    };

    const studentRole = new iam.Role(this, "StudentRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    studentRole.attachInlinePolicy(
      new iam.Policy(this, "StudentPolicy", {
        statements: [
          createPolicyStatement(
            ["execute-api:Invoke"],
            [
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/GET/*`,
            ]
          ),
        ],
      })
    );

    const instructorRole = new iam.Role(this, "InstructorRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    instructorRole.attachInlinePolicy(
      new iam.Policy(this, "InstructorPolicy", {
        statements: [
          createPolicyStatement(
            ["execute-api:Invoke"],
            [
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/POST/*`,
            ]
          ),
        ],
      })
    );

    const adminRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    adminRole.attachInlinePolicy(
      new iam.Policy(this, "AdminPolicy", {
        statements: [
          createPolicyStatement(
            ["execute-api:Invoke"],
            [
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*`,
            ]
          ),
        ],
      })
    );

    const techAdminRole = new iam.Role(this, "TechAdminRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    techAdminRole.attachInlinePolicy(
      new iam.Policy(this, "TechAdminPolicy", {
        statements: [
          createPolicyStatement(
            ["execute-api:Invoke"],
            [
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*`,
            ]
          ),
        ],
      })
    );

    // Create unauthenticated role with no permissions
    const unauthenticatedRole = new iam.Role(this, "UnauthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Attach roles to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: studentRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });

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
