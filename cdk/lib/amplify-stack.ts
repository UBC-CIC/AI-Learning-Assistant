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
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class AmplifyStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    apiStack: ApiGatewayStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // Amplify
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
        REACT_APP_AWS_REGION: this.region,
        REACT_APP_COGNITO_USER_POOL_ID: apiStack.getUserPoolId(),
        REACT_APP_COGNITO_USER_POOL_CLIENT_ID: apiStack.getUserPoolClientId(),
        REACT_APP_API_ENDPOINT: apiStack.getEndpointUrl(),
      },
      buildSpec: BuildSpec.fromObjectToYaml(amplifyYaml),
    });

    amplifyApp.addBranch('stacks')
    amplifyApp.addBranch('main')
    amplifyApp.addBranch('frontend')

    // // CloudFront distribution
    // const cloudFrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
    //   defaultBehavior: {
    //     origin: new origins.HttpOrigin(`${amplifyApp.defaultDomain}`, {
    //       originPath: '/build'
    //     }),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //   },
    // });

    // // WAF WebACL
    // const webAcl = new waf.CfnWebACL(this, 'WebACL', {
    //   defaultAction: { allow: {} },
    //   scope: 'CLOUDFRONT',
    //   visibilityConfig: {
    //     cloudWatchMetricsEnabled: true,
    //     metricName: 'webACL',
    //     sampledRequestsEnabled: true,
    //   },
    //   rules: [
    //     {
    //       name: 'AWS-AWSManagedRulesCommonRuleSet',
    //       priority: 1,
    //       overrideAction: { none: {} },
    //       statement: {
    //         managedRuleGroupStatement: {
    //           name: 'AWSManagedRulesCommonRuleSet',
    //           vendorName: 'AWS'
    //         }
    //       },
    //       visibilityConfig: {
    //         cloudWatchMetricsEnabled: true,
    //         metricName: 'AWS-AWSManagedRulesCommonRuleSet',
    //         sampledRequestsEnabled: true,
    //       }
    //     }
    //   ],
    // });

    // // Associate WAF with CloudFront
    // new waf.CfnWebACLAssociation(this, 'WebACLAssociation', {
    //   resourceArn: cloudFrontDistribution.distributionId,
    //   webAclArn: webAcl.attrArn,
    // });
  }
}
