# Deployment Guide

## Table of Contents
- [Requirements](#requirements)
- [Pre-Deployment](#pre-deployment)
- [Deployment](#deployment)
    - [Step 1: Clone The Repository](#step-1-clone-the-repository)
    - [Step 2: Upload Secrets](#step-2-upload-secrets)
    - [Step 3: CDK Deployment](#step-3-cdk-deployment)
- [Post-Deployment](#post-deployment)
- [Cleanup](#cleanup)

## Requirements
Before you deploy, you must have the following installed on your device:
- [git](https://git-scm.com/downloads)
- [AWS Account](https://aws.amazon.com/account/)
- [GitHub Account](https://github.com/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) *(v2.122.0 > required)*
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [node](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs) *(v20.0.0 > required)*

## Pre-Deployment
### Create GitHub Personal Access Token
To deploy this solution, you will need to generate a GitHub personal access token. Please visit [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) for detailed instruction to create a personal access token.

*Note: when selecting the scopes to grant the token (step 8 of the instruction), make sure you select `repo` scope.*

**Once you create a token, please note down its value as you will use it later in the deployment process.**

## Deployment
### Step 1: Fork & Clone The Repository
First, you need to fork the repository. To create a fork, navigate to the [main branch](https://github.com/UBC-CIC/document-chat) of this repository. Then, in the top-right corner, click `Fork`.

![](./images/fork.jpeg)

You will be directed to the page where you can customize owner, repository name, etc, but you do not have to change any option. Simply click `Create fork` in the bottom right corner.

Now let's clone the GitHub repository onto your machine. To do this:
1. Create a folder on your computer to contain the project code.
2. For an Apple computer, open Terminal. If on a Windows machine, open Command Prompt or Windows Terminal. Enter into the folder you made using the command `cd path/to/folder`. To find the path to a folder on a Mac, right click on the folder and press `Get Info`, then select the whole text found under `Where:` and copy with ⌘C. On Windows (not WSL), enter into the folder on File Explorer and click on the path box (located to the left of the search bar), then copy the whole text that shows up.
3. Clone the GitHub repository by entering the following command. Be sure to replace `<YOUR-GITHUB-USERNAME>` with your own username.
```
git clone https://github.com/<YOUR-GITHUB-USERNAME>/document-chat.git
```
The code should now be in the folder you created. Navigate into the root folder containing the entire codebase by running the command:
```
cd document-chat
```

### Step 2: Upload Secrets
You would have to supply your GitHub personal access token you created eariler when dpeloying the solution. Run the following command and ensure you replace `<YOUR-GITHUB-TOKEN>` and `<YOUR-PROFILE-NAME>` with your actual GitHub token and the appropriate AWS profile name.
```
aws secretsmanager create-secret \
    --name github-personal-access-token \
    --secret-string "{\"my-github-token\":\"<YOUR-GITHUB-TOKEN>\"}"\
    --profile <YOUR-PROFILE-NAME>
```

Moreover, you will need to upload your github username to Amazon SSM Parameter Store. You can do so by running the following command. Make sure you replace `<YOUR-GITHUB-USERNAME>` and `<YOUR-PROFILE-NAME>` with your actual username and the appropriate AWS profile name.

```
aws ssm put-parameter \
    --name "repository-owner-name" \
    --value "<YOUR-GITHUB-USERNAME>" \
    --type String \
    --profile <YOUR-PROFILE-NAME>
```

### Step 3: CDK Deployment
It's time to set up everything that goes on behind the scenes! For more information on how the backend works, feel free to refer to the Architecture Deep Dive, but an understanding of the backend is not necessary for deployment.

Open a terminal in the `/backend` directory.

**Download Requirements**: Install requirements with npm by running `npm install` command.

**Possible Modifications**:
1. LLM model as `modelId` 
2. Embedding model as `embeddingModelId`
3. API stage (e.x. dev, prod, etc.) as `apiStage`
4. Application name as `applicationName`
All parameters can be set in the [cdk stack](../backend/lib/document-chat.ts) as follows:

![](./images/stack_params.png)

**Initialize the CDK stack**(required only if you have not deployed any resources with CDK in this region before). Please replace `<your-profile-name>` with the appropriate AWS profile used earlier.
```
cdk synth --profile <your-profile-name>
cdk bootstrap aws://<YOUR_AWS_ACCOUNT_ID>/<YOUR_ACCOUNT_REGION> --profile <your-profile-name>
```

**Deploy CDK stack**
You may run the following command to deploy the stacks all at once. Again, replace `<your-profile-name>` with the appropriate AWS profile used earlier.
```
cdk deploy DocumentChat --parameters githubRepoName=document-chat --profile <your-profile-name>
```

Once the deployment is complete, you will receive the following output:

![deployment output](./images/deployment_output.png)

Take note of the `Amplify App ID` as it will be used in the next step. The `Amplify Branch URL` is the public URL you will use to access the web application.

## Post-Deployment
### Step 1: Build AWS Amplify App

If you'd like to access Amplify details via the AWS Console, you can:
1. Log in to AWS console, and navigate to **AWS Amplify**. You can do so by typing `Amplify` in the search bar at the top.
2. From `All apps`, click `DocumentChat-...`.
There, you have access to the `Amplify App ID` and the public domain name to use the web app.

Run the following command to build the app. Please replace `<app-id>` with the app ID found in amplify and `<profile-name>` with the appropriate AWS profile used earlier. 
```
aws amplify start-job --job-type RELEASE --app-id <app-id> --branch-name main --profile <profile-name>
```
This will trigger the build. 
When the build is completed, the Amplify console will display a `deployed` status.

### Step 2: Visit Web App
You can now navigate to the web app URL to see your application in action.

## Cleanup
### Taking down the deployed stack
To take down the deployed stack for a fresh redeployment in the future, navigate to AWS Cloudformation on the AWS Console, click on the stack and hit Delete.

Alternatively, run the following in the `/backend` folder:
```
cdk destroy DocumentChat --profile <your-profile-name>
```
