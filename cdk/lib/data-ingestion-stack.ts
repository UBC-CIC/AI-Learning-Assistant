import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket
    const bucket = new s3.Bucket(this, 'IngestionBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, //change to retain
    });

    // Create a Lambda function to process the uploads
    const processUploadsFunction = new lambda.Function(this, 'ProcessUploadsFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'process_uploads.handler',
      code: lambda.Code.fromAsset('lambda/process_uploads'),
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
