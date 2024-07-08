
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
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
import { VpcStack } from "./vpc-stack";
import  {DatabaseStack} from "./database-stack"
import { parse, stringify } from "yaml";
import { Fn } from "aws-cdk-lib";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";

export class ApiGatewayStack extends cdk.Stack {
  private readonly api: apigateway.SpecRestApi;
  public readonly appClient: cognito.UserPoolClient;
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  private readonly layerList: { [key: string]: LayerVersion };
  public readonly stageARN_APIGW: string;
  public readonly apiGW_basedURL: string;
  public getEndpointUrl = () => this.api.url;
  public getUserPoolId = () => this.userPool.userPoolId;
  public getUserPoolClientId = () => this.appClient.userPoolClientId;
  public getIdentityPoolId = () => this.identityPool.ref
  public addLayer = (name: string, layer: LayerVersion) =>
    (this.layerList[name] = layer);
  public getLayers = () => this.layerList;
  constructor(
    scope: Construct,
    id: string,
    db: DatabaseStack,
    vpcStack: VpcStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    
    this.layerList = {};

    /**
     *
     * Create Integration Lambda layer for PSQL
     */
    const postgres = new lambda.LayerVersion(this, "postgres", {
      code: lambda.Code.fromAsset("./layers/postgres.zip"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      description: "Contains the postgres library for JS",
    });


    //create psycopglayer
    const psycopgLayer = new LayerVersion(this, "psycopgLambdaLayer", {
      code: Code.fromAsset("./layers/psycopg2.zip"),
      compatibleRuntimes: [Runtime.PYTHON_3_9],
      description: "Lambda layer containing the psycopg2 Python library",
    });

    this.layerList["psycopg2"] = psycopgLayer;
    this.layerList["postgres"] = postgres;

    /**
     *
     * Load OpenAPI file into API Gateway using REST API
     */

    // Read OpenAPI file and load file to S3
    const asset = new Asset(this, "SampleAsset", {
      path: "OpenAPI_Swagger_Definition.yaml",
    });

    // Create the API Gateway REST API
    this.api = new apigateway.SpecRestApi(this, "APIGateway", {
      apiDefinition: apigateway.AssetApiDefinition.fromAsset('OpenAPI_Swagger_Definition.yaml'),
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      restApiName: "ailaAPI",
      deploy: true,
      cloudWatchRole: true,
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: true,
        stageName: "prod",
        methodOptions: {
          "/*/*": {
            throttlingRateLimit: 100,
            throttlingBurstLimit: 200,
          },
        },
      },
    });

    this.stageARN_APIGW = this.api.deploymentStage.stageArn;
    this.apiGW_basedURL = this.api.urlForPath();

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
        allowUnauthenticatedIdentities: false, // don't allow unauthenticated users
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
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/student/*`,
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
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor/*`,
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
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/admin/*`,
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor/*`,
              `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/student/*`,
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

    const lambdaRole = new iam.Role(this, "postgresLambdaRole", {
      roleName: "postgresLambdaRole",
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    // Grant access to Secret Manager
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          //Secrets Manager
          "secretsmanager:GetSecretValue",
        ],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:*`,
        ],
      })
    );

    // Grant access to EC2
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ],
        resources: ["*"], // must be *
      })
    );

    // Grant access to log
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          //Logs
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    // Attach roles to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: studentRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });


    const lambdaStudentFunction = new lambda.Function(this, "lambdaStudentFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "studentFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
      },
      functionName: "lambdaStudentFunction",
      memorySize: 512,
      layers: [postgres],
      role: lambdaRole,
    });


    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaStudentFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/student*`,
    });

    const lambdaInstructorFunction = new lambda.Function(this, "lambdaInstructorFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "instructorFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
      },
      functionName: "lambdaInstructorFunction",
      memorySize: 512,
      layers: [postgres],
      role: lambdaRole,
    });


    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaInstructorFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor*`,
    });
    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaInstructorFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/student*`,
    });


    const lambdaAdminFunction = new lambda.Function(this, "lambdaAdminFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "adminFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
      },
      functionName: "lambdaAdminFunction",
      memorySize: 512,
      layers: [postgres],
      role: lambdaRole,
    });


    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaAdminFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/admin*`,
    });

    const lambdaTechAdminFunction = new lambda.Function(this, "lambdaTechAdminFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "techadminFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
      },
      functionName: "lambdaTechAdminFunction",
      memorySize: 512,
      layers: [postgres],
      role: lambdaRole,
    });


    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaTechAdminFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/admin*`,
    });
    
  }
}
