# AI Learning Assistant

This prototype explores how Large Language Models (LLMs) can enhance education by offering a personalized and adaptive learning experience. The LLM complements an instructor's role by providing tailored feedback, identifying knowledge gaps, and recommending targeted resources to students. This approach resonates with the core principles of personalized education, transforming the learning experience into a journey of self-discovery and growth.


| Index                                               | Description                                             |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [High Level Architecture](#high-level-architecture) | High level overview illustrating component interactions |
| [Deployment](#deployment-guide)                     | How to deploy the project                               |
| [User Guide](#user-guide)                           | The working solution                                    |
| [Directories](#directories)                          | General project directory structure
| [Changelog](#changelog)                             | Any changes post publish                                |
| [Credits](#credits)                                 | Meet the team behind the solution                       |
| [License](#license)                                 | License details                                         |

## High-Level Architecture

The following architecture diagram illustrates the various AWS components utilized to deliver the solution. For an in-depth explanation of the frontend and backend stacks, please look at the [Architecture Guide](docs/architecture.md).

![Alt text](docs/images/architecture.png)

## Deployment Guide

To deploy this solution, please follow the steps laid out in the [Deployment Guide](./docs/deploymentGuide.md)

## User Guide

Please refer to the [Web App User Guide](./docs/userGuide.md) for instructions on navigating the web app interface.

## Directories

```
├── cdk
│   ├── bin
│   ├── data_ingestion
│   ├── lambda
│   ├── layers
│   ├── lib
│   ├── text_generation
├── docs
└── frontend
    ├── public
    └── src
        ├── components
        ├── functions
        └── pages
```

1. `/cdk`: Contains the deployment code for the app's AWS infrastructure
    - `/bin`: Contains the instantiation of CDK stack
    - `/data_ingestion`: Contains the code required for the Data Ingestion step in retrieval-augmented generation. This folder is used by a Lambda function that runs a container which updates the vectorstore for a course when files are uploaded or deleted.
    - `/lambda`: Contains the lambda functions for the project
    - `/layers`: Contains the required layers for lambda functions
    - `/lib`: Contains the deployment code for all infrastructure stacks
    - `/text_generation`: Contains the code required for the Text Generation step in retrieval-augmented generation. This folder is used by a Lambda function that runs a container which retrieves specific documents and invokes the LLM to generate appropriate responses during a conversation.
2. `/docs`: Contains documentation for the application
3. `/frontend`: Contains the user interface of the application
    - `/public`: public assets used in the application
    - `/src/common`: Contains shared components used in the application
    - `/src/components`: Contains components used in the application
    - `/src/routes`: Contains pages comprising the application's interface

## Changelog
N/A

## Credits

This application was architected and developed by [Sean Woo](https://www.linkedin.com/in/seanwoo4/), [Aurora Cheng](https://www.linkedin.com/in/aurora-cheng04/), [Harshinee Sriram](https://www.linkedin.com/in/harshineesriram/), and [Aman Prakash](https://www.linkedin.com/in/aman-prakash-aa48b421b/). Thanks to the UBC Cloud Innovation Centre Technical and Project Management teams for their guidance and support.

## License

This project is distributed under the [MIT License](LICENSE).

Licenses of libraries and tools used by the system are listed below:

[PostgreSQL license](https://www.postgresql.org/about/licence/)
- For PostgreSQL and pgvector
- "a liberal Open Source license, similar to the BSD or MIT licenses."

[LLaMa 3 Community License Agreement](https://llama.meta.com/llama3/license/)
- For Llama 3 70B Instruct model
