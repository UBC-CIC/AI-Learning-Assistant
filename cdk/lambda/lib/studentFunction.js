const { initializeConnection } = require("./lib.js");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL } = process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  const cognito_id = event.requestContext.authorizer.userId;
  const client = new CognitoIdentityProviderClient();
  const userAttributesCommand = new AdminGetUserCommand({
    UserPoolId: USER_POOL,
    Username: cognito_id,
  });
  const userAttributesResponse = await client.send(userAttributesCommand);

  const emailAttr = userAttributesResponse.UserAttributes.find(
    (attr) => attr.Name === "email"
  );
  const userEmailAttribute = emailAttr ? emailAttr.Value : null;
  console.log(userEmailAttribute);
  // Check for query string parameters

  const queryStringParams = event.queryStringParameters || {};
  const queryEmail = queryStringParams.email;
  const studentEmail = queryStringParams.student_email;
  const userEmail = queryStringParams.user_email;

  const isUnauthorized =
    (queryEmail && queryEmail !== userEmailAttribute) ||
    (studentEmail && studentEmail !== userEmailAttribute) ||
    (userEmail && userEmail !== userEmailAttribute);

  if (isUnauthorized) {
    return {
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: "",
  };

  // Initialize the database connection if not already initialized
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  // Function to format student full names (lowercase and spaces replaced with "_")
  const formatNames = (name) => {
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "POST /student/create_user":
        if (event.queryStringParameters) {
          const {
            user_email,
            username,
            first_name,
            last_name,
            preferred_name,
          } = event.queryStringParameters;

          try {
            // Check if the user already exists
            const existingUser = await sqlConnection`
                SELECT * FROM "Users"
                WHERE user_email = ${user_email};
            `;

            if (existingUser.length > 0) {
              // Update the existing user's information
              const updatedUser = await sqlConnection`
                    UPDATE "Users"
                    SET
                        username = ${username},
                        first_name = ${first_name},
                        last_name = ${last_name},
                        preferred_name = ${preferred_name},
                        last_sign_in = CURRENT_TIMESTAMP,
                        time_account_created = CURRENT_TIMESTAMP
                    WHERE user_email = ${user_email}
                    RETURNING *;
                `;
              response.body = JSON.stringify(updatedUser[0]);
            } else {
              // Insert a new user with 'student' role
              const newUser = await sqlConnection`
                    INSERT INTO "Users" (user_email, username, first_name, last_name, preferred_name, time_account_created, roles, last_sign_in)
                    VALUES (${user_email}, ${username}, ${first_name}, ${last_name}, ${preferred_name}, CURRENT_TIMESTAMP, ARRAY['student'], CURRENT_TIMESTAMP)
                    RETURNING *;
                `;
              response.body = JSON.stringify(newUser[0]);
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User data is required" });
        }
        break;
      case "GET /student/get_user_roles":
        if (
          event.queryStringParameters &&
          event.queryStringParameters.user_email
        ) {
          const user_email = event.queryStringParameters.user_email;
          try {
            // Retrieve roles for the user with the provided email
            const userData = await sqlConnection`
                SELECT roles
                FROM "Users"
                WHERE user_email = ${user_email};
              `;
            if (userData.length > 0) {
              response.body = JSON.stringify({ roles: userData[0].roles });
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User email is required" });
        }
        break;
      case "GET /student/get_name":
        if (
          event.queryStringParameters &&
          event.queryStringParameters.user_email
        ) {
          const user_email = event.queryStringParameters.user_email;
          try {
            // Retrieve roles for the user with the provided email
            const userData = await sqlConnection`
                  SELECT first_name
                  FROM "Users"
                  WHERE user_email = ${user_email};
                `;
            if (userData.length > 0) {
              response.body = JSON.stringify({ name: userData[0].first_name });
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User email is required" });
        }
        break;
      case "GET /student/course":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          const user_email = event.queryStringParameters.email;

          try {
            // Retrieve the user ID using the user_email
            const userResult = await sqlConnection`
                SELECT user_id FROM "Users" WHERE user_email = ${user_email};
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
              break;
            }

            const user_id = userResult[0].user_id;

            // Query to get courses for the user
            const data = await sqlConnection`
                SELECT "Courses".*
                FROM "Enrolments"
                JOIN "Courses" ON "Courses".course_id = "Enrolments".course_id
                WHERE "Enrolments".user_id = ${user_id}
                AND "Courses".course_student_access = TRUE
                ORDER BY "Courses".course_name, "Courses".course_id;
              `;
            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Invalid value";
        }
        break;
      case "GET /student/course_page":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id
        ) {
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;

          try {
            // Retrieve the user ID using the user_email
            const userResult = await sqlConnection`
                SELECT user_id FROM "Users" WHERE user_email = ${studentEmail};
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "User not found" });
              break;
            }

            const userId = userResult[0].user_id;

            data = await sqlConnection`
                WITH StudentEnrollment AS (
                  SELECT 
                    "Enrolments".enrolment_id
                  FROM 
                    "Enrolments"
                  WHERE 
                    "Enrolments".user_id = ${userId}
                    AND "Enrolments".course_id = ${courseId}
                  LIMIT 1
                )
                SELECT
                  "Course_Concepts".concept_id,
                  "Course_Concepts".concept_name,
                  "Course_Modules".module_id,
                  "Course_Modules".module_name,
                  "Course_Modules".module_number,
                  "Student_Modules".student_module_id,
                  "Student_Modules".module_score,
                  "Student_Modules".last_accessed,
                  "Student_Modules".module_context_embedding
                FROM
                  "Course_Concepts"
                JOIN
                  "Course_Modules" ON "Course_Modules".concept_id = "Course_Concepts".concept_id
                LEFT JOIN
                  "Student_Modules" ON "Student_Modules".course_module_id = "Course_Modules".module_id
                JOIN
                  StudentEnrollment ON "Student_Modules".enrolment_id = StudentEnrollment.enrolment_id
                WHERE
                  "Course_Concepts".course_id = ${courseId}
                ORDER BY
                  "Course_Modules".module_number;
              `;

            const enrolmentId = data[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, null, ${enrolmentId}, CURRENT_TIMESTAMP, 'course access');
                `;
            }

            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Invalid value";
        }
        break;
      case "GET /student/module":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.module_id
        ) {
          const moduleId = event.queryStringParameters.module_id;
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;

          try {
            // Step 1: Get the user ID using the student_email
            const userResult = await sqlConnection`
                  SELECT user_id
                  FROM "Users"
                  WHERE user_email = ${studentEmail}
                  LIMIT 1;
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student not found.",
              });
              break;
            }

            const userId = userResult[0].user_id;

            // Step 2: Get the student_module_id for the specific student and module
            const studentModuleData = await sqlConnection`
                  SELECT student_module_id
                  FROM "Student_Modules"
                  WHERE course_module_id = ${moduleId}
                    AND enrolment_id = (
                      SELECT enrolment_id
                      FROM "Enrolments"
                      WHERE user_id = ${userId} AND course_id = ${courseId}
                    )
              `;

            const studentModuleId = studentModuleData[0]?.student_module_id;

            if (!studentModuleId) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student module not found",
              });
              break;
            }

            // Step 3: Update the last accessed timestamp for the Student_Modules entry
            await sqlConnection`
                  UPDATE "Student_Modules"
                  SET last_accessed = CURRENT_TIMESTAMP
                  WHERE student_module_id = ${studentModuleId};
              `;

            // Step 4: Retrieve session data specific to the student's module
            const data = await sqlConnection`
                  SELECT "Sessions".*
                  FROM "Sessions"
                  WHERE student_module_id = ${studentModuleId}
                  ORDER BY "Sessions".last_accessed, "Sessions".session_id;
              `;

            // Step 5: Get enrolment ID for the log entry
            const enrolmentData = await sqlConnection`
                  SELECT "Enrolments".enrolment_id
                  FROM "Enrolments"
                  WHERE user_id = ${userId} AND course_id = ${courseId};
              `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            // Step 6: Insert into User_Engagement_Log using user_id
            await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_id, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (
                    uuid_generate_v4(),
                    ${userId},
                    ${courseId},
                    ${moduleId},
                    ${enrolmentId},
                    CURRENT_TIMESTAMP,
                    'module access'
                  )
              `;

            response.body = JSON.stringify(data);
          } catch (err) {
            console.error(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid value" });
        }
        break;
      case "POST /student/create_session":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.module_id &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.session_name
        ) {
          const moduleId = event.queryStringParameters.module_id;
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;
          const sessionName = event.queryStringParameters.session_name;

          try {
            // Step 1: Get the user ID using the student_email
            const userResult = await sqlConnection`
                  SELECT user_id
                  FROM "Users"
                  WHERE user_email = ${studentEmail}
                  LIMIT 1;
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student not found.",
              });
              break;
            }

            const userId = userResult[0].user_id;

            // Step 2: Get the student_module_id for the specific student and module
            const studentModuleData = await sqlConnection`
                  SELECT student_module_id
                  FROM "Student_Modules"
                  WHERE course_module_id = ${moduleId}
                    AND enrolment_id = (
                      SELECT enrolment_id
                      FROM "Enrolments"
                      WHERE user_id = ${userId} AND course_id = ${courseId}
                    )
              `;

            const studentModuleId = studentModuleData[0]?.student_module_id;

            if (!studentModuleId) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student module not found",
              });
              break;
            }

            // Step 3: Update last_accessed for the Student_Module entry
            await sqlConnection`
                  UPDATE "Student_Modules"
                  SET last_accessed = CURRENT_TIMESTAMP
                  WHERE student_module_id = ${studentModuleId}
              `;

            // Step 4: Insert a new session with the session_name
            const sessionData = await sqlConnection`
                  INSERT INTO "Sessions" (session_id, student_module_id, session_name, session_context_embeddings, last_accessed)
                  VALUES (
                    uuid_generate_v4(),
                    ${studentModuleId},
                    ${sessionName},
                    ARRAY[]::float[],
                    CURRENT_TIMESTAMP
                  )
                  RETURNING *;
              `;

            // Step 5: Insert an entry into the User_Engagement_Log using user_id
            const enrolmentData = await sqlConnection`
                  SELECT enrolment_id
                  FROM "Enrolments"
                  WHERE user_id = ${userId} AND course_id = ${courseId}
                `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                    INSERT INTO "User_Engagement_Log" (log_id, user_id, course_id, module_id, enrolment_id, timestamp, engagement_type)
                    VALUES (
                      uuid_generate_v4(),
                      ${userId},
                      ${courseId},
                      ${moduleId},
                      ${enrolmentId},
                      CURRENT_TIMESTAMP,
                      'session creation'
                    )
                  `;
            }

            response.body = JSON.stringify(sessionData);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "Invalid value",
          });
        }
        break;
      case "DELETE /student/delete_session":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.module_id
        ) {
          const sessionId = event.queryStringParameters.session_id;
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;
          const moduleId = event.queryStringParameters.module_id;

          try {
            // Step 1: Get the user ID using the student_email
            const userResult = await sqlConnection`
                  SELECT user_id
                  FROM "Users"
                  WHERE user_email = ${studentEmail}
                  LIMIT 1;
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Student not found." });
              break;
            }

            const userId = userResult[0].user_id;

            // Step 2: Update last_accessed for the corresponding Student_Module entry
            await sqlConnection`
                  UPDATE "Student_Modules"
                  SET last_accessed = CURRENT_TIMESTAMP
                  WHERE student_module_id = (
                    SELECT student_module_id
                    FROM "Sessions"
                    WHERE session_id = ${sessionId}
                  );
              `;

            // Step 3: Delete the session and get the result
            const deleteResult = await sqlConnection`
                  DELETE FROM "Sessions"
                  WHERE session_id = ${sessionId}
                  RETURNING *;
              `;

            // Step 4: Get the enrolment ID using user_id
            const enrolmentData = await sqlConnection`
                  SELECT "Enrolments".enrolment_id
                  FROM "Enrolments"
                  WHERE user_id = ${userId} AND course_id = ${courseId};
              `;

            // Check if enrolmentData is defined and has rows
            if (!enrolmentData || !enrolmentData.length) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Enrolment not found" });
              break;
            }

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            // Step 5: Insert an entry into the User_Engagement_Log if enrolment exists
            if (enrolmentId) {
              await sqlConnection`
                    INSERT INTO "User_Engagement_Log" (log_id, user_id, course_id, module_id, enrolment_id, timestamp, engagement_type)
                    VALUES (uuid_generate_v4(), ${userId}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'session deletion');
                `;
            }

            response.body = JSON.stringify({ success: "Session deleted" });
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "session_id, email, course_id, and module_id are required",
          });
        }
        break;
      case "GET /student/get_messages":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id
        ) {
          try {
            const sessionId = event.queryStringParameters.session_id;

            // Query to get all messages in the given session, sorted by time_sent in ascending order (oldest to newest)
            const data = await sqlConnection`
                      SELECT *
                      FROM "Messages"
                      WHERE session_id = ${sessionId}
                      ORDER BY time_sent ASC;
                  `;

            if (data.length > 0) {
              response.body = JSON.stringify(data);
              response.statusCode = 200;
            } else {
              response.body = JSON.stringify({
                message: "No messages found for this session.",
              });
              response.statusCode = 404;
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "session_id is required" });
        }
        break;
      case "POST /student/create_message":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.module_id &&
          event.body
        ) {
          const sessionId = event.queryStringParameters.session_id;
          const { message_content } = JSON.parse(event.body);
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;
          const moduleId = event.queryStringParameters.module_id;
          console.log("message", message_content);
          console.log("session", sessionId);
          console.log("email", studentEmail);
          console.log("course", courseId);
          console.log("module", moduleId);

          try {
            // Insert the new message into the Messages table with a generated UUID for message_id
            const messageData = await sqlConnection`
                INSERT INTO "Messages" (message_id, session_id, student_sent, message_content, time_sent)
                VALUES (uuid_generate_v4(), ${sessionId}, true, ${message_content}, CURRENT_TIMESTAMP)
                RETURNING *;
              `;

            // Update the last_accessed field in the Sessions table
            await sqlConnection`
                UPDATE "Sessions"
                SET last_accessed = CURRENT_TIMESTAMP
                WHERE session_id = ${sessionId};
              `;

            // Retrieve user_id based on studentEmail
            const userData = await sqlConnection`
                SELECT user_id
                FROM "Users"
                WHERE user_email = ${studentEmail};
              `;

            const userId = userData[0]?.user_id;

            if (userId) {
              // Retrieve the enrolment ID using user_id
              const enrolmentData = await sqlConnection`
                  SELECT enrolment_id
                  FROM "Enrolments"
                  WHERE user_id = ${userId} AND course_id = ${courseId};
                `;

              const enrolmentId = enrolmentData[0]?.enrolment_id;

              if (enrolmentId) {
                await sqlConnection`
                    INSERT INTO "User_Engagement_Log" (log_id, user_id, course_id, module_id, enrolment_id, timestamp, engagement_type)
                    VALUES (uuid_generate_v4(), ${userId}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'message creation');
                  `;
              }
            }

            response.body = JSON.stringify(messageData);
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "session_id and message_content are required",
          });
        }
        break;
      case "POST /student/create_ai_message":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.module_id &&
          event.body
        ) {
          const sessionId = event.queryStringParameters.session_id;
          const { message_content } = JSON.parse(event.body);
          const studentEmail = event.queryStringParameters.email;
          const courseId = event.queryStringParameters.course_id;
          const moduleId = event.queryStringParameters.module_id;
          console.log("AI message", message_content);
          console.log("session", sessionId);
          console.log("email", studentEmail);
          console.log("course", courseId);
          console.log("module", moduleId);

          try {
            // Insert the new AI message into the Messages table with a generated UUID for message_id
            const messageData = await sqlConnection`
                INSERT INTO "Messages" (message_id, session_id, student_sent, message_content, time_sent)
                VALUES (uuid_generate_v4(), ${sessionId}, false, ${message_content}, CURRENT_TIMESTAMP)
                RETURNING *;
              `;

            // Update the last_accessed field in the Sessions table
            await sqlConnection`
                UPDATE "Sessions"
                SET last_accessed = CURRENT_TIMESTAMP
                WHERE session_id = ${sessionId};
              `;

            // Retrieve user_id based on studentEmail
            const userData = await sqlConnection`
                SELECT user_id
                FROM "Users"
                WHERE user_email = ${studentEmail};
              `;

            const userId = userData[0]?.user_id;

            if (userId) {
              // Retrieve the enrolment ID using user_id
              const enrolmentData = await sqlConnection`
                  SELECT enrolment_id
                  FROM "Enrolments"
                  WHERE user_id = ${userId} AND course_id = ${courseId};
                `;

              const enrolmentId = enrolmentData[0]?.enrolment_id;

              if (enrolmentId) {
                await sqlConnection`
                    INSERT INTO "User_Engagement_Log" (log_id, user_id, course_id, module_id, enrolment_id, timestamp, engagement_type)
                    VALUES (uuid_generate_v4(), ${userId}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'AI message creation');
                  `;
              }
            }

            response.body = JSON.stringify(messageData);
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "session_id and message_content are required",
          });
        }
        break;
      case "POST /student/enroll_student":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.student_email &&
          event.queryStringParameters.course_access_code
        ) {
          const { student_email, course_access_code } =
            event.queryStringParameters;

          try {
            // Step 1: Retrieve the user ID using the student_email
            const userResult = await sqlConnection`
                  SELECT user_id
                  FROM "Users"
                  WHERE user_email = ${student_email}
                  LIMIT 1;
              `;

            if (userResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student not found.",
              });
              break;
            }

            const user_id = userResult[0].user_id;

            // Step 2: Retrieve the course_id using the access code
            const courseResult = await sqlConnection`
                  SELECT course_id
                  FROM "Courses"
                  WHERE course_access_code = ${course_access_code}
                  AND course_student_access = TRUE
                  LIMIT 1;
              `;

            if (courseResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Invalid course access code or course not available.",
              });
              break;
            }

            const course_id = courseResult[0].course_id;

            // Step 3: Insert enrollment into Enrolments table
            const enrollmentResult = await sqlConnection`
                  INSERT INTO "Enrolments" (enrolment_id, user_id, course_id, enrolment_type, time_enroled)
                  VALUES (uuid_generate_v4(), ${user_id}, ${course_id}, 'student', CURRENT_TIMESTAMP)
                  ON CONFLICT (course_id, user_id) DO NOTHING
                  RETURNING enrolment_id;
              `;

            const enrolment_id = enrollmentResult[0]?.enrolment_id;

            if (enrolment_id) {
              // Step 4: Retrieve all module IDs for the course
              const modulesResult = await sqlConnection`
                    SELECT module_id
                    FROM "Course_Modules"
                    WHERE concept_id IN (
                        SELECT concept_id
                        FROM "Course_Concepts"
                        WHERE course_id = ${course_id}
                    );
                `;

              // Step 5: Insert a record into Student_Modules for each module
              const studentModuleInsertions = modulesResult.map((module) => {
                return sqlConnection`
                      INSERT INTO "Student_Modules" (student_module_id, course_module_id, enrolment_id, module_score, last_accessed, module_context_embedding)
                      VALUES (uuid_generate_v4(), ${module.module_id}, ${enrolment_id}, 0, CURRENT_TIMESTAMP, NULL);
                  `;
              });

              // Execute all insertions
              await Promise.all(studentModuleInsertions);
            }

            response.statusCode = 201; // Set status to 201 on successful enrollment
            response.body = JSON.stringify({
              message: "Student enrolled and modules created successfully.",
            });
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error:
              "student_email and course_access_code query parameters are required",
          });
        }
        break;
      case "GET /session/messages":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id
        ) {
          try {
            const sessionId = event.queryStringParameters.session_id;

            // Fetch all messages in the specified session
            const messages = await sqlConnection`
                      SELECT *
                      FROM "Messages"
                      WHERE "session_id" = ${sessionId}
                      ORDER BY "time_sent" ASC;
                  `;

            response.body = JSON.stringify(messages);
          } catch (err) {
            console.log(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "session_id query parameter is required",
          });
        }
        break;
      case "PUT /student/update_session_name":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.session_id &&
          event.body
        ) {
          try {
            const { session_id } = event.queryStringParameters;
            const { session_name } = JSON.parse(event.body);

            // Update the session name
            const updateResult = await sqlConnection`
                UPDATE "Sessions"
                SET session_name = ${session_name}
                WHERE session_id = ${session_id}
                RETURNING *;
              `;

            if (updateResult.length === 0) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Session not found" });
              break;
            }

            response.statusCode = 200;
            response.body = JSON.stringify(updateResult[0]);
          } catch (err) {
            console.error(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Invalid value" });
        }
        break;
      case "POST /student/update_module_score":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.module_id &&
          event.queryStringParameters.student_email &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.llm_verdict
        ) {
          try {
            const moduleId = event.queryStringParameters.module_id;
            const studentEmail = event.queryStringParameters.student_email;
            const courseId = event.queryStringParameters.course_id;
            const llmVerdict =
              event.queryStringParameters.llm_verdict === "true"; // Convert to boolean

            // Retrieve user_id from the Users table
            const userData = await sqlConnection`
                SELECT user_id
                FROM "Users"
                WHERE user_email = ${studentEmail}
              `;

            const userId = userData[0]?.user_id;

            if (!userId) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "User not found",
              });
              break;
            }

            // Get the student_module_id for the specific student and module using user_id
            const studentModuleData = await sqlConnection`
                SELECT student_module_id, module_score
                FROM "Student_Modules"
                WHERE course_module_id = ${moduleId}
                  AND enrolment_id = (
                    SELECT enrolment_id
                    FROM "Enrolments"
                    WHERE user_id = ${userId} AND course_id = ${courseId}
                  )
              `;

            const studentModuleId = studentModuleData[0]?.student_module_id;
            const currentScore = studentModuleData[0]?.module_score;

            if (!studentModuleId) {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student module not found",
              });
              break;
            }

            // If llm_verdict is false and the current score is 100, just pass without updating
            if (!llmVerdict && currentScore === 100) {
              response.statusCode = 200;
              response.body = JSON.stringify({
                message: "No changes made. Module score is already 100.",
              });
              break;
            }

            // Determine the new score based on llm_verdict
            const newScore = llmVerdict ? 100 : 0;

            // Update the module score for the student
            await sqlConnection`
                UPDATE "Student_Modules"
                SET module_score = ${newScore}
                WHERE student_module_id = ${studentModuleId}
              `;

            response.statusCode = 200;
            response.body = JSON.stringify({
              message: "Module score updated successfully.",
            });
          } catch (err) {
            console.log(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "Invalid query parameters.",
          });
        }
        break;
      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    console.log(error);
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};
