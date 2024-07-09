const { initializeConnection } = require("./lib.js");

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
            response.body = JSON.stringify(userData[0]);
          } catch (err) {
            response.statusCode = 500;
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
          data = await sqlConnection`SELECT Courses.*
					FROM Enrolments
					JOIN Courses ON Enrolments.course_id = Courses.course_id
					WHERE Enrolments.user_email = '${event.queryStringParameters.student_id}'
					ORDER BY Courses.course_name, Courses.course_id;`;
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

          data = await sqlConnection`
            WITH EnrolmentData AS (
                SELECT 
                    Enrolments.enrolment_id
                FROM 
                    Enrolments
                JOIN 
                    Users ON Enrolments.user_email = Users.user_email
                JOIN 
                    Courses ON Enrolments.course_id = Courses.course_id
                WHERE 
                    Users.user_email = ${studentEmail}
                    AND Courses.course_id = ${courseId}
            )
            SELECT
                Enrolments.enrolment_id,
                Course_Modules.module_id,
                Course_Modules.module_name,
                Course_Modules.module_number,
                Course_Concepts.concept_id,
                Course_Concepts.concept_name,
                Student_Modules.student_module_id,
                Student_Modules.module_score,
                Student_Modules.last_accessed,
                Student_Modules.module_context_embedding
            FROM
                EnrolmentData
            JOIN
                Course_Modules ON Course_Modules.course_id = ${courseId}
            JOIN
                Course_Concepts ON Course_Modules.concept_id = Course_Concepts.concept_id
            LEFT JOIN
                Student_Modules ON Course_Modules.module_id = Student_Modules.course_module_id AND Student_Modules.enrolment_id = EnrolmentData.enrolment_id;
        `;

          const enrolmentId = data[0]?.enrolment_id;

          if (enrolmentId) {
            await sqlConnection`
              INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
              VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, null, ${enrolmentId}, CURRENT_TIMESTAMP, 'course access');
            `;
          }

          response.body = JSON.stringify(data);
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
          await sqlConnection`
            UPDATE "Student_Modules"
            SET last_accessed = CURRENT_TIMESTAMP
            WHERE course_module_id = '${moduleId}';
          `;
          data = await sqlConnection`SELECT Sessions.*
                           FROM "Sessions"
                           JOIN "Student_Modules" ON "Sessions".student_module_id = "Student_Modules".student_module_id
                           JOIN "Course_Modules" ON "Student_Modules".course_module_id = "Course_Modules".module_id
                           WHERE "Course_Modules".module_id = '${moduleId}'
                           ORDER BY "Sessions".last_accessed, "Sessions".session_id;`;

          const enrolmentData = await sqlConnection`
            SELECT Enrolments.enrolment_id
            FROM Enrolments
            WHERE user_email = ${studentEmail} AND course_id = ${courseId};
          `;

          const enrolmentId = enrolmentData[0]?.enrolment_id;

          if (enrolmentId) {
            await sqlConnection`
              INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
              VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'module access');
            `;
          }
          response.body = JSON.stringify(data);
        } else {
          response.statusCode = 400;
          response.body = "Invalid value";
        }
        break;
      case "POST /student/create_session":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.module_id &&
          event.queryStringParameters.email &&
          event.queryStringParameters.course_id
        ) {
          try {
            const moduleId = event.queryStringParameters.module_id;
            const studentEmail = event.queryStringParameters.email;
            const courseId = event.queryStringParameters.course_id;
            await sqlConnection`
            UPDATE "Student_Modules"
            SET last_accessed = CURRENT_TIMESTAMP
            WHERE course_module_id = '${moduleId}';
          `;
            data = await sqlConnection`
              INSERT INTO "Sessions" (session_id, student_module_id, session_context_embeddings, last_accessed)
              SELECT uuid_generate_v4(), student_module_id, ARRAY[]::float[], CURRENT_TIMESTAMP
              FROM "Student_Modules"
              WHERE course_module_id = '${moduleId}'
              RETURNING *;
            `;

            const enrolmentData = await sqlConnection`
              SELECT Enrolments.enrolment_id
              FROM Enrolments
              WHERE user_email = ${studentEmail} AND course_id = ${courseId};
            `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'session creation');
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
          await sqlConnection`
            UPDATE "Student_Modules"
            SET last_accessed = CURRENT_TIMESTAMP
            WHERE student_module_id = (
              SELECT student_module_id
              FROM "Sessions"
              WHERE session_id = '${session_id}'
            );
          `;
          data = await sqlConnection`
              DELETE FROM "Sessions"
              WHERE session_id = '${session_id}'
              RETURNING *;
            `;
          const enrolmentData = await sqlConnection`
            SELECT Enrolments.enrolment_id
            FROM Enrolments
            WHERE user_email = ${studentEmail} AND course_id = ${courseId};
          `;

          const enrolmentId = enrolmentData[0]?.enrolment_id;

          if (enrolmentId) {
            await sqlConnection`
              INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
              VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'session deletion');
            `;
          }
          response.body = JSON.stringify(data.rows[0]);
        } else {
          response = {
            statusCode: 400,
            body: JSON.stringify({ error: "session_id is required" }),
          };
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

          try {
            // Insert the new message into Messages table
            const messageData = await sqlConnection`
                INSERT INTO "Messages" (session_id, student_sent, message_content, time_sent)
                VALUES (${sessionId}, true, ${message_content}, CURRENT_TIMESTAMP)
                RETURNING *;
              `;

            // Update the last_accessed field in Sessions table
            await sqlConnection`
                UPDATE "Sessions"
                SET last_accessed = CURRENT_TIMESTAMP
                WHERE session_id = ${sessionId};
              `;
            const enrolmentData = await sqlConnection`
              SELECT Enrolments.enrolment_id
              FROM Enrolments
              WHERE user_email = ${studentEmail} AND course_id = ${courseId};
            `;

            const enrolmentId = enrolmentData[0]?.enrolment_id;

            if (enrolmentId) {
              await sqlConnection`
                INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                VALUES (uuid_generate_v4(), ${studentEmail}, ${courseId}, ${moduleId}, ${enrolmentId}, CURRENT_TIMESTAMP, 'message creation');
              `;
            }

            response.body = JSON.stringify(messageData[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "session_id and message_content are required",
          });
        }
        break;
      // case "PUT /student/edit_message":
      //   if (
      //     event.queryStringParameters != null &&
      //     event.queryStringParameters.message_id &&
      //     event.body
      //   ) {
      //     const { message_id } = event.queryStringParameters;
      //     const { message_content } = JSON.parse(event.body);

      //     // Start a transaction
      //     await sqlConnection.beginTransaction();

      //     try {
      //       const currentMessageData = await sqlConnection`
      //         SELECT session_id, message_content
      //         FROM "Messages"
      //         WHERE message_id = ${message_id}
      //         FOR UPDATE;
      //       `;

      //       // Update the message content in Messages table
      //       const updatedMessageData = await sqlConnection`
      //             UPDATE "Messages"
      //             SET message_content = ${message_content}
      //             WHERE message_id = ${message_id}
      //             RETURNING *;
      //           `;

      //       // Get session_id from the current message data
      //       const session_id = currentMessageData[0].session_id;

      //       // Update the last_accessed field in Sessions table
      //       await sqlConnection`
      //         UPDATE "Sessions"
      //         SET last_accessed = CURRENT_TIMESTAMP
      //         WHERE session_id = ${session_id};
      //       `;

      //       response.body = JSON.stringify(updatedMessageData[0]);
      //     } catch (err) {
      //       // Rollback the transaction in case of error
      //       await sqlConnection.rollback();
      //       response.statusCode = 500;
      //       response.body = JSON.stringify({ error: "Internal server error" });
      //     }
      //   } else {
      //     response.statusCode = 400;
      //     response.body = JSON.stringify({
      //       error: "message_id and message_content are required",
      //     });
      //   }
      //   break;

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = JSON.stringify(error.message);
  }

  return response;
};
