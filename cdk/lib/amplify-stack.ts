import {
  App,
  RedirectStatus,
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
      frontend:
        phases:
          preBuild:
            commands:
              - cd frontend
              - npm ci
          build:
            commands:
              - npm run build
              - ls -la dist || echo "dist not found"
        artifacts:
          baseDirectory: frontend/dist
          files:
            - '**/*'
        cache:
          paths:
            - 'frontend/node_modules/**/*'
    `);

    // Deploy the Amplify app shell without a source code provider.
    // Connect to GitHub via the Amplify Console using the GitHub App (one-time manual step).
    const amplifyApp = new App(this, `${id}-amplifyApp`, {
      appName: `${id}-amplify`,
      environmentVariables: {
        VITE_AWS_REGION: this.region,
        VITE_COGNITO_USER_POOL_ID: apiStack.getUserPoolId(),
        VITE_COGNITO_USER_POOL_CLIENT_ID: apiStack.getUserPoolClientId(),
        VITE_API_ENDPOINT: apiStack.getEndpointUrl(),
        VITE_IDENTITY_POOL_ID: apiStack.getIdentityPoolId(),
        VITE_GRAPHQL_WS_URL: apiStack.getEventApiUrl(),
      },
      buildSpec: BuildSpec.fromObjectToYaml(amplifyYaml),
    });

    amplifyApp.addCustomRule({
      source: "</^[^.]+$|.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
      target: "/",
      status: RedirectStatus.NOT_FOUND_REWRITE,
    });
  }
}
