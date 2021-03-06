import {Duration, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path'
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Rule, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";

export class LambdaStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucket = Bucket.fromBucketName(this, 'SandboxBucket', 'alramalhosandbox')

    const layer = new lambda.LayerVersion(this, 'ScreenshotLambdaDependencies', {
      code: lambda.Code.fromBucket(bucket, 'src/SeleniumChromiumLayer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_7, lambda.Runtime.PYTHON_3_6],
      license: 'Apache-2.0',
      description: 'Screenshot lambda dependencies',
    });


    const screenshotLambda = new lambda.Function(this, 'ScreenshotLambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/screenshot-lambda')),
      handler: 'lambda_function.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      layers: [layer],
      timeout: Duration.minutes(2),
      environment: {
        URLS: 'https://www.ipo-track.com|https://blog.alramalho.com|https://hire.alramalho.com|https://www.radialcor.pt|https://compound-composer.alramalho.com',
        BUCKET: 'alramalhosandbox',
        DESTPATH: 'screenshots',
      },
      memorySize: 2048
    });

    bucket.grantRead(screenshotLambda)
    bucket.grantPut(screenshotLambda)

    const triggerScreenshotLambda = new Rule(this, `TriggerScreenshotLambda`, {
      ruleName: `TriggerScreenshotLambda`,
      schedule: Schedule.cron({minute: '0', hour: '4'}),
      targets: [new LambdaFunction(screenshotLambda)],
    });
  }
}
