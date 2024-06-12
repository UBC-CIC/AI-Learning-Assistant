import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { aws_rds as rds } from 'aws-cdk-lib';
import { VpcStack } from './vpc-stack';
import * as sm from 'aws-cdk-lib/aws-secretsmanager'

export class DatabaseStack extends Stack {
    public readonly dbInstance: rds.DatabaseInstance;
    public readonly secretPath: string;

    constructor(scope: Construct, id: string, vpcStack: VpcStack, props?: StackProps) {
      super(scope, id, props);

      this.secretPath = 'AILA/credentials/dbCredentials';

      // Database secret with customized username retrieve at deployment time
      const dbUsername = sm.Secret.fromSecretNameV2(this, 'AILA-dbUsername', 'AILA-dbUsername')

      // Define the postgres database
      this.dbInstance = new rds.DatabaseInstance(this, 'AILA', {
        vpc: vpcStack.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_14_5,
        }),
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MEDIUM,
        ),
        credentials: rds.Credentials.fromUsername(dbUsername.secretValueFromJson("username").unsafeUnwrap() , {
          secretName: this.secretPath
        }),
        multiAz: true,
        allocatedStorage: 100,
        maxAllocatedStorage: 115,
        allowMajorVersionUpgrade: false,
        autoMinorVersionUpgrade: true,
        backupRetention: cdk.Duration.days(7),
        deleteAutomatedBackups: true,
        deletionProtection: true,
        databaseName: 'AILA',
        publiclyAccessible: false,
        storageEncrypted: true, // storage encryption at rest
      });

      this.dbInstance.connections.securityGroups.forEach(function (securityGroup) {
        securityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(5432), 'Postgres Ingress');
      });
  }
}