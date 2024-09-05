import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
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
import { DatabaseStack } from "./database-stack";
import { parse, stringify } from "yaml";
import { Fn } from "aws-cdk-lib";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export class ApiGatewayStack extends cdk.Stack {
  private readonly api: apigateway.SpecRestApi;
  public readonly appClient: cognito.UserPoolClient;
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: cognito.CfnIdentityPool;
  private readonly layerList: { [key: string]: LayerVersion };
  public readonly stageARN_APIGW: string;
  public readonly apiGW_basedURL: string;
  public readonly secret: secretsmanager.ISecret;
  public getEndpointUrl = () => this.api.url;
  public getUserPoolId = () => this.userPool.userPoolId;
  public getUserPoolClientId = () => this.appClient.userPoolClientId;
  public getIdentityPoolId = () => this.identityPool.ref;
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
     * Create Integration Lambda layer for aws-jwt-verify
     */
    const jwt = new lambda.LayerVersion(this, "aws-jwt-verify", {
      code: lambda.Code.fromAsset("./layers/aws-jwt-verify.zip"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      description: "Contains the aws-jwt-verify library for JS",
    });

    /**
     *
     * Create Integration Lambda layer for PSQL
     */
    const postgres = new lambda.LayerVersion(this, "postgres", {
      code: lambda.Code.fromAsset("./layers/postgres.zip"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      description: "Contains the postgres library for JS",
    });

    /**
     *
     * Create Lambda layer for Psycopg2
     */
    const psycopgLayer = new LayerVersion(this, "psycopgLambdaLayer", {
      code: Code.fromAsset("./layers/psycopg2.zip"),
      compatibleRuntimes: [Runtime.PYTHON_3_9],
      description: "Lambda layer containing the psycopg2 Python library",
    });

    /**
     *
     * Create Lambda layer for LangChain
     */
    const langchainLayer = new LayerVersion(this, "langchain", {
      code: Code.fromAsset("./layers/langchain.zip"),
      compatibleRuntimes: [Runtime.PYTHON_3_9],
      description: "Lambda layer containing the LangChain Python library",
    });

    /**
     *
     * Create Lambda layer for LangChain Experimental
     */
    const langchainExperimentalLayer = new LayerVersion(
      this,
      "langchain_experimental",
      {
        code: Code.fromAsset("./layers/langchain_experimental.zip"),
        compatibleRuntimes: [Runtime.PYTHON_3_9],
        description:
          "Lambda layer containing the LangChain Experimental Python library",
      }
    );

    /**
     *
     * Create Lambda layer for Torch
     */
    // const torchLayer = new LayerVersion(this, "torch", {
    //   code: Code.fromAsset("./layers/torch.zip"),
    //   compatibleRuntimes: [Runtime.PYTHON_3_9],
    //   description: "Lambda layer containing the Torch Python library",
    // });

    /**
     *
     * Create Lambda layer for Open Clip Torch
     */
    const opencliptorchLayer = new LayerVersion(this, "open_clip_torch", {
      code: Code.fromAsset("./layers/open_clip_torch.zip"),
      compatibleRuntimes: [Runtime.PYTHON_3_9],
      description: "Lambda layer containing the Open Clip Torch Python library",
    });

    // powertoolsLayer does not follow the format of layerList
    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:78`
    );

    this.layerList["psycopg2"] = psycopgLayer;
    this.layerList["postgres"] = postgres;
    this.layerList["jwt"] = jwt;
    this.layerList["langchain"] = langchainLayer;
    this.layerList["langchain_experimental"] = langchainExperimentalLayer;
    // this.layerList["torcj"] = torchLayer;
    this.layerList["open_clip_torch"] = opencliptorchLayer;

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
        custom: true,
        userSrp: true,
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

    const secretsName = "AILA_Cognito_Secrets";

    this.secret = new secretsmanager.Secret(this, secretsName, {
      secretName: secretsName,
      description: "Cognito Secrets for authentication",
      secretObjectValue: {
        VITE_COGNITO_USER_POOL_ID: cdk.SecretValue.unsafePlainText(
          this.userPool.userPoolId
        ),
        VITE_COGNITO_USER_POOL_CLIENT_ID: cdk.SecretValue.unsafePlainText(
          this.appClient.userPoolClientId
        ),
        VITE_AWS_REGION: cdk.SecretValue.unsafePlainText(this.region),
        VITE_IDENTITY_POOL_ID: cdk.SecretValue.unsafePlainText(
          this.identityPool.ref
        ),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create roles and policies
    const createPolicyStatement = (actions: string[], resources: string[]) => {
      return new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: actions,
        resources: resources,
      });
    };

    /**
     *
     * Load OpenAPI file into API Gateway using REST API
     */

    // Read OpenAPI file and load file to S3
    const asset = new Asset(this, "SampleAsset", {
      path: "OpenAPI_Swagger_Definition.yaml",
    });

    const data = Fn.transform("AWS::Include", { Location: asset.s3ObjectUrl });

    // Create the API Gateway REST API
    this.api = new apigateway.SpecRestApi(this, "APIGateway", {
      apiDefinition: apigateway.AssetApiDefinition.fromInline(data),
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

    // Create Cognito user pool groups
    const studentGroup = new cognito.CfnUserPoolGroup(this, "StudentGroup", {
      groupName: "student",
      userPoolId: this.userPool.userPoolId,
      roleArn: studentRole.roleArn,
    });

    const instructorGroup = new cognito.CfnUserPoolGroup(
      this,
      "InstructorGroup",
      {
        groupName: "instructor",
        userPoolId: this.userPool.userPoolId,
        roleArn: instructorRole.roleArn,
      }
    );

    const adminGroup = new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      groupName: "admin",
      userPoolId: this.userPool.userPoolId,
      roleArn: adminRole.roleArn,
    });

    const techAdminGroup = new cognito.CfnUserPoolGroup(
      this,
      "TechAdminGroup",
      {
        groupName: "techadmin",
        userPoolId: this.userPool.userPoolId,
        roleArn: techAdminRole.roleArn,
      }
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

    const lambdaStudentFunction = new lambda.Function(this, "studentFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "studentFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
      },
      functionName: "studentFunction",
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

    const cfnLambda_student = lambdaStudentFunction.node
      .defaultChild as lambda.CfnFunction;
    cfnLambda_student.overrideLogicalId("studentFunction");

    const lambdaInstructorFunction = new lambda.Function(
      this,
      "instructorFunction",
      {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
        handler: "instructorFunction.handler", // Code handler
        timeout: Duration.seconds(300),
        vpc: vpcStack.vpc,
        environment: {
          SM_DB_CREDENTIALS: db.secretPathUser.secretName,
          RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
        },
        functionName: "instructorFunction",
        memorySize: 512,
        layers: [postgres],
        role: lambdaRole,
      }
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaInstructorFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor*`,
    });

    const cfnLambda_Instructor = lambdaInstructorFunction.node
      .defaultChild as lambda.CfnFunction;
    cfnLambda_Instructor.overrideLogicalId("instructorFunction");

    const lambdaAdminFunction = new lambda.Function(this, "adminFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "adminFunction.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathTableCreator.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpointTableCreator,
      },
      functionName: "adminFunction",
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

    const cfnLambda_Admin = lambdaAdminFunction.node
      .defaultChild as lambda.CfnFunction;
    cfnLambda_Admin.overrideLogicalId("adminFunction");

    const lambdaTechAdminFunction = new lambda.Function(
      this,
      "techadminFunction",
      {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
        handler: "techadminFunction.handler", // Code handler
        timeout: Duration.seconds(300),
        vpc: vpcStack.vpc,
        environment: {
          SM_DB_CREDENTIALS: db.secretPathUser.secretName,
          RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
        },
        functionName: "techadminFunction",
        memorySize: 512,
        layers: [postgres],
        role: lambdaRole,
      }
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    lambdaTechAdminFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/*`,
    });

    const cfnLambda_Tech_Admin = lambdaTechAdminFunction.node
      .defaultChild as lambda.CfnFunction;
    cfnLambda_Tech_Admin.overrideLogicalId("techadminFunction");

    const coglambdaRole = new iam.Role(this, "cognitoLambdaRole", {
      roleName: "cognitoLambdaRole",
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    // Grant access to Secret Manager
    coglambdaRole.addToPolicy(
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
    coglambdaRole.addToPolicy(
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
    coglambdaRole.addToPolicy(
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

    // Grant permission to add users to an IAM group
    coglambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:AddUserToGroup"],
        resources: [
          `arn:aws:iam::${this.account}:user/*`,
          `arn:aws:iam::${this.account}:group/*`,
        ],
      })
    );

    // Inline policy to allow AdminAddUserToGroup action
    const adminAddUserToGroupPolicy = new iam.Policy(
      this,
      "AdminAddUserToGroupPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "cognito-idp:AdminAddUserToGroup",
              "cognito-idp:AdminGetUser",
              "cognito-idp:AdminListGroupsForUser",
            ],
            resources: [
              `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${this.userPool.userPoolId}`,
            ],
          }),
        ],
      }
    );

    // Attach the inline policy to the role
    coglambdaRole.attachInlinePolicy(adminAddUserToGroupPolicy);

    coglambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Secrets Manager
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
        ],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:AILA/*`,
        ],
      })
    );

    const AutoSignupLambda = new lambda.Function(this, "addStudentOnSignUp", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "addStudentOnSignUp.handler", // Code handler
      timeout: Duration.seconds(300),
      vpc: vpcStack.vpc,
      functionName: "addStudentOnSignUp",
      memorySize: 128,
      role: coglambdaRole,
    });

    const adjustUserRoles = new lambda.Function(this, "adjustUserRoles", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
      handler: "adjustUserRoles.handler", // Code handler
      timeout: Duration.seconds(300),
      environment: {
        SM_DB_CREDENTIALS: db.secretPathTableCreator.secretName,
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpointTableCreator,
      },
      vpc: db.dbInstance.vpc,
      functionName: "adjustUserRoles",
      memorySize: 512,
      layers: [postgres],
      role: coglambdaRole,
    });

    this.userPool.addTrigger(
      cognito.UserPoolOperation.POST_AUTHENTICATION,
      adjustUserRoles
    );

    //cognito auto assign authenticated users to the student group

    this.userPool.addTrigger(
      cognito.UserPoolOperation.POST_CONFIRMATION,
      AutoSignupLambda
    );

    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ailaAuthorizer', {
    //   cognitoUserPools: [this.userPool],
    // });
    new cdk.CfnOutput(this, "UserPoolIdOutput", {
      value: this.userPool.userPoolId,
      description: "The ID of the Cognito User Pool",
    });

    // **
    //  *
    //  * Create Lambda for Admin Authorization endpoints
    //  */
    const authorizationFunction = new lambda.Function(
      this,
      "admin-authorization-api-gateway",
      {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
        handler: "adminAuthorizerFunction.handler", // Code handler
        timeout: Duration.seconds(300),
        vpc: vpcStack.vpc,
        environment: {
          SM_COGNITO_CREDENTIALS: this.secret.secretName,
        },
        functionName: "adminLambdaAuthorizer",
        memorySize: 512,
        layers: [jwt],
        role: lambdaRole,
      }
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    authorizationFunction.grantInvoke(
      new iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    // Change Logical ID to match the one decleared in YAML file of Open API
    const apiGW_authorizationFunction = authorizationFunction.node
      .defaultChild as lambda.CfnFunction;
    apiGW_authorizationFunction.overrideLogicalId("adminLambdaAuthorizer");

    /**
     *
     * Create Lambda for User Authorization endpoints
     */
    const authorizationFunction_student = new lambda.Function(
      this,
      "student-authorization-api-gateway",
      {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
        handler: "studentAuthorizerFunction.handler", // Code handler
        timeout: Duration.seconds(300),
        vpc: vpcStack.vpc,
        environment: {
          SM_COGNITO_CREDENTIALS: this.secret.secretName,
        },
        functionName: "studentLambdaAuthorizer",
        memorySize: 512,
        layers: [jwt],
        role: lambdaRole,
      }
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    authorizationFunction_student.grantInvoke(
      new iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    // Change Logical ID to match the one decleared in YAML file of Open API
    const apiGW_authorizationFunction_student = authorizationFunction_student
      .node.defaultChild as lambda.CfnFunction;
    apiGW_authorizationFunction_student.overrideLogicalId(
      "studentLambdaAuthorizer"
    );

    /**
     *
     * Create Lambda for User Authorization endpoints
     */
    const authorizationFunction_instructor = new lambda.Function(
      this,
      "instructor-authorization-api-gateway",
      {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from "lambda" directory
        handler: "instructorAuthorizerFunction.handler", // Code handler
        timeout: Duration.seconds(300),
        vpc: vpcStack.vpc,
        environment: {
          SM_COGNITO_CREDENTIALS: this.secret.secretName,
        },
        functionName: "instructorLambdaAuthorizer",
        memorySize: 512,
        layers: [jwt],
        role: lambdaRole,
      }
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    authorizationFunction_instructor.grantInvoke(
      new iam.ServicePrincipal("apigateway.amazonaws.com")
    );

    // Change Logical ID to match the one decleared in YAML file of Open API
    const apiGW_authorizationFunction_instructor =
      authorizationFunction_instructor.node.defaultChild as lambda.CfnFunction;
    apiGW_authorizationFunction_instructor.overrideLogicalId(
      "instructorLambdaAuthorizer"
    );

    /**
     *
     * Create Lambda function for text generation workflow in RAG pipeline
     */
    const textGenLambdaFunc = new lambda.Function(this, "TextGenLambdaFunc", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda/textGenLambda"),
      handler: "main.handler",
      timeout: cdk.Duration.seconds(300),
      vpc: vpcStack.vpc,
      functionName: "TextGenLambdaFunc",
      memorySize: 3008,
      environment: {
        SM_DB_CREDENTIALS: db.secretPathUser.secretName, // Database User Credentials
        RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint, // RDS Proxy Endpoint
      },
      layers: [
        psycopgLayer,
        langchainLayer,
        langchainExperimentalLayer,
        opencliptorchLayer,
      ],
    });

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfnTextGenFunc = textGenLambdaFunc.node
      .defaultChild as lambda.CfnFunction;
    cfnTextGenFunc.overrideLogicalId("TextGenLambdaFunc");

    // Add the permission to the Lambda function's policy to allow API Gateway access
    textGenLambdaFunc.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/student*`,
    });

    // Custom policy statement for Bedrock access
    const bedrockPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["bedrock:InvokeModel", "bedrock:InvokeEndpoint"],
      resources: [
        "arn:aws:bedrock:" +
          this.region +
          "::foundation-model/meta.llama3-70b-instruct-v1:0",
      ],
    });

    // Attach the custom Bedrock policy to Lambda function
    textGenLambdaFunc.addToRolePolicy(bedrockPolicyStatement);

    // Grant access to Secret Manager
    textGenLambdaFunc.addToRolePolicy(
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

    // Grant access to DynamoDB actions
    textGenLambdaFunc.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:ListTables",
          "dynamodb:CreateTable", // if your function needs to create tables
          "dynamodb:DescribeTable", // if your function needs to describe tables
          "dynamodb:PutItem", // if your function needs to put items into tables
          "dynamodb:GetItem", // if your function needs to get items from tables
        ],
        resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/*`],
      })
    );

    // Create S3 Bucket to handle documents and images for each course
    const dataIngestionBucket = new s3.Bucket(this, "AILADataIngestionBucket", {
      bucketName: "aila-data-ingestion-bucket",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
        },
      ],
      // When deleting the stack, need to empty the Bucket and delete it manually
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    /**
     *
     * Create Lambda function that is triggered when a file is uploaded
     */
    const s3UploadTrigger = new lambda.Function(this, "s3UploadTrigger", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"),
      handler: "s3UploadTrigger.lambda_handler",
      timeout: Duration.seconds(300),
      memorySize: 128,
      environment: {
        BUCKET: dataIngestionBucket.bucketName,
        REGION: this.region,
      },
      functionName: "s3UploadTrigger",
      layers: [powertoolsLayer],
    });

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfns3UploadTrigger = s3UploadTrigger.node.defaultChild as lambda.CfnFunction;
    cfns3UploadTrigger.overrideLogicalId("s3UploadTrigger");

    // Grant the Lambda function read-only permissions to the S3 bucket
    dataIngestionBucket.grantRead(s3UploadTrigger);

    // Add S3 event source to trigger the Lambda function on object creation
    s3UploadTrigger.addEventSource(new lambdaEventSources.S3EventSource(dataIngestionBucket, {
      events: [s3.EventType.OBJECT_CREATED],
    }));

    // Create the Lambda function for generating presigned URLs
    const generatePreSignedURL = new lambda.Function(
      this,
      "GeneratePreSignedURLFunc",
      {
        runtime: lambda.Runtime.PYTHON_3_9,
        code: lambda.Code.fromAsset("lambda"),
        handler: "generatePreSignedURL.lambda_handler",
        timeout: Duration.seconds(300),
        memorySize: 128,
        environment: {
          BUCKET: dataIngestionBucket.bucketName,
          REGION: this.region,
        },
        functionName: "GeneratePreSignedURLFunc",
        layers: [powertoolsLayer],
      }
    );

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfnGeneratePreSignedURL = generatePreSignedURL.node
      .defaultChild as lambda.CfnFunction;
    cfnGeneratePreSignedURL.overrideLogicalId("GeneratePreSignedURLFunc");

    // Grant the Lambda function the necessary permissions
    dataIngestionBucket.grantReadWrite(generatePreSignedURL);
    generatePreSignedURL.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [
          dataIngestionBucket.bucketArn,
          `${dataIngestionBucket.bucketArn}/*`,
        ],
      })
    );

    // Add the permission to the Lambda function's policy to allow API Gateway access
    generatePreSignedURL.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor*`,
    });

    /**
     *
     * Create Lambda with container image for data ingestion workflow in RAG pipeline
     * This function will be triggered when a file in uploaded to the S3 Bucket
     */
    // const dataIngestLambdaDockerFunc = new lambda.DockerImageFunction(this, "DataIngestLambdaDockerFunc", {
    //   code: lambda.DockerImageCode.fromImageAsset("./data_ingestion"),
    //   memorySize: 512,
    //   timeout: cdk.Duration.seconds(300),
    //   vpc: vpcStack.vpc, // Pass the VPC
    //   functionName: "DataIngestLambdaDockerFunc",
    //   environment: {
    //     SM_DB_CREDENTIALS: db.secretPathUser.secretName, // Database User Credentials
    //     RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint, // RDS Proxy Endpoint
    //   },
    // });

    // // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    // const cfnDataIngestDockerFunc = dataIngestLambdaDockerFunc.node.defaultChild as lambda.CfnFunction;
    // cfnDataIngestDockerFunc.overrideLogicalId("DataIngestLambdaDockerFunc");

    // // Add the S3 event source trigger to the Lambda function
    // dataIngestLambdaDockerFunc.addEventSource(new lambdaEventSources.S3EventSource(dataIngestionBucket, {
    //   events: [s3.EventType.OBJECT_CREATED]
    // }));

    /**
     *
     * Create Lambda function that will return all file names for a specified course, concept, and module
     */
    const getFilesFunction = new lambda.Function(this, "GetFilesFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"), // Assumes the function is in the lambda directory
      handler: "getFilesFunction.lambda_handler",
      timeout: Duration.seconds(300),
      memorySize: 128,
      environment: {
        BUCKET: dataIngestionBucket.bucketName,
        REGION: this.region,
      },
      functionName: "GetFilesFunction",
      layers: [powertoolsLayer],
    });

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfnGetFilesFunction = getFilesFunction.node
      .defaultChild as lambda.CfnFunction;
    cfnGetFilesFunction.overrideLogicalId("GetFilesFunction");

    // Grant the Lambda function read-only permissions to the S3 bucket
    dataIngestionBucket.grantRead(getFilesFunction);

    // Add the permission to the Lambda function's policy to allow API Gateway access
    getFilesFunction.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor*`,
    });

    /**
     *
     * Create Lambda function to delete certain file
     */
    const deleteFile = new lambda.Function(this, "DeleteFileFunc", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"),
      handler: "deleteFile.lambda_handler",
      timeout: Duration.seconds(300),
      memorySize: 128,
      environment: {
        BUCKET: dataIngestionBucket.bucketName,
        REGION: this.region,
      },
      functionName: "DeleteFileFunc",
      layers: [powertoolsLayer],
    });

    // Override the Logical ID of the Lambda Function to get ARN in OpenAPI
    const cfndeleteFile = deleteFile.node.defaultChild as lambda.CfnFunction;
    cfndeleteFile.overrideLogicalId("DeleteFileFunc");

    // Grant the Lambda function the necessary permissions
    dataIngestionBucket.grantDelete(deleteFile);

    // Add the permission to the Lambda function's policy to allow API Gateway access
    deleteFile.addPermission("AllowApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*/*/instructor*`,
    });
  }
}
