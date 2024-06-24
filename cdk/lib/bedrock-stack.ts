import * as cdk from 'aws-cdk-lib';
import { PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";


export class BedrockStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
// Lambda Function
const lambdaFunction = new lambda.Function(this, "chat", {
    code: lambda.Code.fromAsset("lambda"),
    handler: "LLM_Interaction.handler",
    timeout: cdk.Duration.seconds(15),
    runtime: lambda.Runtime.PYTHON_3_12,
    memorySize: 2048,
    environment: {
      REGION: this.region,
    },
    role: new Role(this, "LambdaRole", {
      roleName: "langchain-lambda",
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        "LambdaPolicy": new PolicyDocument({
          statements: [
            // Grant Lambda permissions to call Bedrock API
            new PolicyStatement({
              resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/llama.llama-3`,
              ],
              actions: ["bedrock:*"],
            }),
          ]
        })
      }
    })
  }); 
  }
}
