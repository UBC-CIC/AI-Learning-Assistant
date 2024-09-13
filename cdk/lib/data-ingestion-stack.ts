import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3CorsRule: s3.CorsRule = {
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
      allowedOrigins: ['*'],
      allowedHeaders: ['*'],
      maxAge: 300,
    };

    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'ingestionBucket', {
      bucketName: 'ingestion-bucket-cloudfront',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      accessControl: s3.BucketAccessControl.PRIVATE,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      cors: [s3CorsRule]
    });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    bucket.grantRead(oai);

    const backendCloudfront = new cloudfront.CloudFrontWebDistribution(this, 'BackendCF', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: oai,
          },
          behaviors: [{isDefaultBehavior: true}, { pathPattern: '/*', allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD }]
        },
      ],
    });

    // Create a Lambda function to process the uploads
    const processUploadsFunction = new lambda.Function(this, 'ProcessUploadsFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'process_uploads.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Grant S3 read permissions to the Lambda function
    bucket.grantRead(processUploadsFunction);

    // Add S3 event notification to trigger the Lambda function
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(processUploadsFunction));
  }
}
