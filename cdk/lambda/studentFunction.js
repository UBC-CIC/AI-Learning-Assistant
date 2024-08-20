const { initializeConnection } = require("./lib.js");
var aws = require("aws-sdk");
// Setting up evironments
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
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
            // Insert the new user into Users table
            const userData = await sqlConnection`
              INSERT INTO "Users" (user_email, username, first_name, last_name, preferred_name, time_account_created, roles, last_sign_in)
              VALUES (${user_email}, ${username}, ${first_name}, ${last_name}, ${preferred_name}, CURRENT_TIMESTAMP, ARRAY['student'], CURRENT_TIMESTAMP)
              RETURNING *;
            `;
            response.body = JSON.stringify(userData);
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
          const email = event.queryStringParameters.email;
          data = await sqlConnection`SELECT "Courses".*
					FROM "Enrolments"
					JOIN "Courses" ON "Enrolments".course_id = "Courses".course_id
					WHERE "Enrolments".user_email = ${email}
          AND "Courses".course_student_access = TRUE
					ORDER BY "Courses".course_name, "Courses".course_id;`;
          response.body = JSON.stringify(data);
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
            data = await sqlConnection`
                WITH StudentEnrollment AS (
                  SELECT 
                    "Enrolments".enrolment_id
                  FROM 
                    "Enrolments"
                  WHERE 
                    "Enrolments".user_email = ${studentEmail}
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
          try {
            const moduleId = event.queryStringParameters.module_id;
            const studentEmail = event.queryStringParameters.email;
            const courseId = event.queryStringParameters.course_id;

            // Update the last accessed timestamp for the Student_Modules
            await sqlConnection`
                      UPDATE "Student_Modules"
                      SET last_accessed = CURRENT_TIMESTAMP
                      WHERE course_module_id = ${moduleId};
                  `;

            // Retrieve session data
            data = await sqlConnection`
                      SELECT "Sessions".*
                      FROM "Sessions"
                      JOIN "Student_Modules" ON "Sessions".student_module_id = "Student_Modules".student_module_id
                      JOIN "Course_Modules" ON "Student_Modules".course_module_id = "Course_Modules".module_id
                      WHERE "Course_Modules".module_id = ${moduleId}
                      ORDER BY "Sessions".last_accessed, "Sessions".session_id;
                  `;

            // Retrieve enrolment data
            const enrolmentData = await sqlConnection`
                      SELECT "Enrolments".enrolment_id
                      FROM "Enrolments"
                      WHERE "Enrolments".user_email = ${studentEmail} AND "Enrolments".course_id = ${courseId};
                  `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              // Insert into User_Engagement_Log
              await sqlConnection`
                          INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                          VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'module access');
                      `;
            }

            response.body = JSON.stringify(data);
          } catch (err) {
            console.log(err);
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
          try {
            const moduleId = event.queryStringParameters.module_id;
            const studentEmail = event.queryStringParameters.email;
            const courseId = event.queryStringParameters.course_id;
            const sessionName = event.queryStringParameters.session_name;

            // Update last_accessed for the Student_Module entry
            await sqlConnection`
                UPDATE "Student_Modules"
                SET last_accessed = CURRENT_TIMESTAMP
                WHERE course_module_id = ${moduleId};
              `;

            // Insert a new session with the session_name
            const sessionData = await sqlConnection`
                INSERT INTO "Sessions" (session_id, student_module_id, session_name, session_context_embeddings, last_accessed)
                SELECT uuid_generate_v4(), student_module_id, ${sessionName}, ARRAY[]::float[], CURRENT_TIMESTAMP
                FROM "Student_Modules"
                WHERE course_module_id = ${moduleId}
                RETURNING *;
              `;

            // Get the enrolment ID
            const enrolmentData = await sqlConnection`
                SELECT "Enrolments".enrolment_id
                FROM "Enrolments"
                WHERE user_email = ${studentEmail} AND course_id = ${courseId};
              `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            // Insert an entry into the User_Engagement_Log
            if (enrolmentId) {
              await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'session creation');
                `;
            }

            response.body = JSON.stringify(sessionData);
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Invalid value";
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
            // Update last_accessed for the corresponding Student_Module entry
            await sqlConnection`
                UPDATE "Student_Modules"
                SET last_accessed = CURRENT_TIMESTAMP
                WHERE student_module_id = (
                  SELECT student_module_id
                  FROM "Sessions"
                  WHERE session_id = ${sessionId}
                );
              `;

            // Delete the session and get the result
            const deleteResult = await sqlConnection`
                DELETE FROM "Sessions"
                WHERE session_id = ${sessionId}
                RETURNING *;
              `;

            // Get the enrolment ID
            const enrolmentData = await sqlConnection`
                SELECT "Enrolments".enrolment_id
                FROM "Enrolments"
                WHERE user_email = ${studentEmail} AND course_id = ${courseId};
              `;

            // Check if enrolmentData is defined and has rows
            if (!enrolmentData || !enrolmentData.length) {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Enrolment not found" });
              break;
            }

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            // Insert an entry into the User_Engagement_Log if enrolment exists
            if (enrolmentId) {
              await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'session deletion');
                `;
            }

            response.body = JSON.stringify({ success: "session deleted" });
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
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

            const enrolmentData = await sqlConnection`
                      SELECT "Enrolments".enrolment_id
                      FROM "Enrolments"
                      WHERE user_email = ${studentEmail} AND course_id = ${courseId};
                    `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                          INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                          VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'message creation');
                        `;
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

            const enrolmentData = await sqlConnection`
                      SELECT "Enrolments".enrolment_id
                      FROM "Enrolments"
                      WHERE user_email = ${studentEmail} AND course_id = ${courseId};
                  `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                          INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                          VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'AI message creation');
                      `;
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
          try {
            const { student_email, course_access_code } =
              event.queryStringParameters;

            // Retrieve the course_id using the access code
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

            // Insert enrollment into Enrolments table
            const enrollmentResult = await sqlConnection`
                      INSERT INTO "Enrolments" (enrolment_id, user_email, course_id, enrolment_type, time_enroled)
                      VALUES (uuid_generate_v4(), ${student_email}, ${course_id}, 'student', CURRENT_TIMESTAMP)
                      ON CONFLICT (course_id, user_email) DO NOTHING
                      RETURNING enrolment_id;
                  `;

            const enrolment_id = enrollmentResult[0]?.enrolment_id;
            console.log(enrolment_id);

            if (enrolment_id) {
              // Retrieve all module IDs for the course
              const modulesResult = await sqlConnection`
                          SELECT module_id
                          FROM "Course_Modules"
                          WHERE concept_id IN (
                              SELECT concept_id
                              FROM "Course_Concepts"
                              WHERE course_id = ${course_id}
                          );
                      `;
              console.log(modulesResult);

              // Insert a record into Student_Modules for each module
              const studentModuleInsertions = modulesResult.map((module) => {
                return sqlConnection`
                              INSERT INTO "Student_Modules" (student_module_id, course_module_id, enrolment_id, module_score, last_accessed, module_context_embedding)
                              VALUES (uuid_generate_v4(), ${module.module_id}, ${enrolment_id}, 0, CURRENT_TIMESTAMP, NULL);
                          `;
              });

              // Execute all insertions
              await Promise.all(studentModuleInsertions);
              console.log(studentModuleInsertions);
            }

            response.body = JSON.stringify({
              message: "Student enrolled and modules created successfully.",
            });
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
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
