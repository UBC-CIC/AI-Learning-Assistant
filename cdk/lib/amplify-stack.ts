import {
  App,
  BasicAuth,
  GitHubSourceCodeProvider,
} from "@aws-cdk/aws-amplify-alpha";
import * as cdk from "aws-cdk-lib";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";
import * as yaml from "yaml";
import { ApiGatewayStack } from "./api-gateway-stack";

export class AmplifyStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    apiStack: ApiGatewayStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const amplifyYaml = yaml.parse(`
    version: 1
    applications:
      - appRoot: frontend
        frontend:
          phases:
            preBuild:
              commands:
                - pwd
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: dist
            files:
              - '**/*'
          cache:
            paths:
              - 'node_modules/**/*'
    `);

    const username = cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      "aila-owner-name"
    );

    const amplifyApp = new App(this, "amplifyApp", {
      appName: "aila-amplify",
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: username,
        repository: "AI-LEARNING-ASSISTANT",
        oauthToken: cdk.SecretValue.secretsManager(
          "github-personal-access-token",
          {
            jsonField: "my-github-token",
          }
        ),
      }),
      environmentVariables: {
        VITE_AWS_REGION: this.region,
        VITE_COGNITO_USER_POOL_ID: apiStack.getUserPoolId(),
        VITE_COGNITO_USER_POOL_CLIENT_ID: apiStack.getUserPoolClientId(),
        VITE_API_ENDPOINT: apiStack.getEndpointUrl(),
        VITE_IDENTITY_POOL_ID: apiStack.getIdentityPoolId(),
      },
      buildSpec: BuildSpec.fromObjectToYaml(amplifyYaml),
    });

    amplifyApp.addBranch('main')
    amplifyApp.addBranch('frontend')
  }
}
