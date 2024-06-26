import {Stack, StackProps, triggers } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

// Service files import
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

// Stack import
import { VpcStack } from './vpc-stack';
import {DatabaseStack} from './database-stack';
import { ApiGatewayStack } from './api-gateway-stack';

export class DBFlowStack extends Stack {
    constructor(scope: Construct, id: string, vpcStack: VpcStack, db: DatabaseStack, apiStack: ApiGatewayStack, props?: StackProps){
        super(scope, id, props);

        /**
         * 
         * Create an database initializer using lambda
         */

        const psycopgLambdaLayer = apiStack.getLayers()['psycopg2'];   

        // Create an initilizer for the RDS instance, only invoke during deployment
        const initializerLambda = new triggers.TriggerFunction(this, "aila-triggerLambda", {
            functionName: "aila-initializerFunction",
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: "initializer.handler",
            timeout: Duration.seconds(300),
            memorySize: 512,
            environment: {
              DB_SECRET_NAME: db.secretPathAdminName,     // Admin Secret Manager name that only use once here.
              DB_USER_SECRET_NAME: db.secretPathUser.secretName
            },
            vpc: db.dbInstance.vpc,
            code: lambda.Code.fromAsset("lambda"),
            layers: [psycopgLambdaLayer],
            // role: lambdaRole,
        });

        initializerLambda.addToRolePolicy(
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                //Secrets Manager
                "secretsmanager:GetSecretValue",
                "secretsmanager:PutSecretValue"
              ],
              resources: [
                `arn:aws:secretsmanager:${this.region}:${this.account}:secret:AILA/*`,
              ],
            })
        );

        initializerLambda.addToRolePolicy(
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                // CloudWatch Logs
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: ["arn:aws:logs:*:*:*"],
            })
        );
    }
}