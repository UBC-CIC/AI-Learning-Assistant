# Optional Modifications

## Allow Instructors to Create a Course

#### cdk/OpenAPI_Swagger_Definition.yaml

- Find `/admin/create_course`:
- Change the endpoint name to `/instructor/create_course`
- Change tag from `Admin` to `Instructor`
- Change security from `adminAuthorizer` to `instructorAuthorizer`
- Change `x-amazon-apigateway-integration` URI from:
    ```yaml
    arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${adminFunction.Arn}/invocations
    ```
    to:
    ```yaml
    arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${instructorFunction.Arn}/invocations
    ```

#### cdk/lambda/adminFunction

- Remove the case:
  `  "POST /admin/create_course"`

#### cdk/lambda/InstructorFunction

- Add the same case and rename it to `"POST /instructor/create_course"`

#### Frontend
- In `frontend/src/pages/instructor/InstructorSidebar.jsx` create a sidebar entry for creating a course
- Create a component similar to `frontend/src/pages/admin/AdminCreateCourse.jsx` which calls the new endpoint and put it in the sidebar


## Restrict Sign Up to Specific Email Domains

#### cdk/lib/api-gateway-stack.ts
- Create a lambda function
- Set it as a pre sign-up trigger for the user pool using 
    ``` 
    this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        <lamba>
        );
    ```
    replacing `<lambda>` with your lambda function
#### lambda function
- In the lambda function, specify the domains and ensure the user's email attribute matches the domain. Example code is shown below:
    ```
    exports.handler = async (event) => {
    const allowedDomains = ['example.com', 'anotherdomain.com']; // Add allowed domains here
    const email = event.request.userAttributes.email;
    const domain = email.split('@')[1];

    if (!allowedDomains.includes(domain)) {
        throw new Error("Sign up is restricted to specific email domains.");
    }
    return event;
    };
    ```