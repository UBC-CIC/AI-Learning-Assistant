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
      case "GET /instructor/courses":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          const instructorEmail = event.queryStringParameters.email;

          try {
            // Query to get courses where the instructor is enrolled
            data = await sqlConnection`
              SELECT "Courses".*
              FROM "Enrolments"
              JOIN "Courses" ON "Enrolments".course_id = "Courses".course_id
              WHERE "Enrolments".user_email = ${instructorEmail}
              AND "Enrolments".enrolment_type = 'instructor'
              ORDER BY "Courses".course_name, "Courses".course_id;
            `;

            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "email is required";
        }
        break;
      case "GET /instructor/analytics":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const courseId = event.queryStringParameters.course_id;

          try {
            // Query to get the number of message creations per course module
            const messageCreations = await sqlConnection`
        SELECT
          "Course_Modules".module_id,
          "Course_Modules".module_name,
          COUNT("User_Engagement_Log".log_id) AS message_count
        FROM
          "User_Engagement_Log"
        JOIN
          "Enrolments" ON "User_Engagement_Log".enrolment_id = "Enrolments".enrolment_id
        JOIN
          "Course_Modules" ON "User_Engagement_Log".module_id = "Course_Modules".module_id
        WHERE
          "User_Engagement_Log".engagement_type = 'message_creation'
          AND "Enrolments".course_id = ${courseId}
        GROUP BY
          "Course_Modules".module_id, "Course_Modules".module_name;
      `;

            // Query to get the number of module accesses per module
            const moduleAccesses = await sqlConnection`
        SELECT
          "Course_Modules".module_id,
          "Course_Modules".module_name,
          COUNT("User_Engagement_Log".log_id) AS access_count
        FROM
          "User_Engagement_Log"
        JOIN
          "Enrolments" ON "User_Engagement_Log".enrolment_id = "Enrolments".enrolment_id
        JOIN
          "Course_Modules" ON "User_Engagement_Log".module_id = "Course_Modules".module_id
        WHERE
          "User_Engagement_Log".engagement_type = 'module_access'
          AND "Enrolments".course_id = ${courseId}
        GROUP BY
          "Course_Modules".module_id, "Course_Modules".module_name;
      `;

            // Query to get the average score for each course module over all student modules
            const averageScores = await sqlConnection`
        SELECT
          "Course_Modules".module_id,
          "Course_Modules".module_name,
          AVG("Student_Modules".module_score) AS average_score
        FROM
          "Student_Modules"
        JOIN
          "Course_Modules" ON "Student_Modules".course_module_id = "Course_Modules".module_id
        WHERE
          "Course_Modules".course_id = ${courseId}
        GROUP BY
          "Course_Modules".module_id, "Course_Modules".module_name;
      `;

            response.body = JSON.stringify({
              messageCreations,
              moduleAccesses,
              averageScores,
            });
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id is required";
        }
        break;
      case "POST /instructor/create_concept":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.body
        ) {
          try {
            const course_id = event.queryStringParameters.course_id;
            const { concept_name } = JSON.parse(event.body);

            // Insert new concept into Course_Concepts table
            const newConcept = await sqlConnection`
                INSERT INTO "Course_Concepts" (concept_id, course_id, concept_name)
                VALUES (uuid_generate_v4(), ${course_id}, ${concept_name})
                RETURNING *;
              `;
            await sqlConnection`
              INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
              VALUES (uuid_generate_v4(), ${event.requestContext.authorizer.email}, ${course_id}, null, null, CURRENT_TIMESTAMP, 'instructor_created_concept')
            `;

            response.body = JSON.stringify(newConcept[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id or request body is missing";
        }
        break;
      case "PUT /instructor/edit_concept":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.concept_id &&
          event.queryStringParameters.instructor_email &&
          event.body
        ) {
          try {
            const concept_id = event.queryStringParameters.concept_id;
            const instructor_email =
              event.queryStringParameters.instructor_email;
            const { concept_name } = JSON.parse(event.body);

            // Update concept name in Course_Concepts table
            const updatedConcept = await sqlConnection`
                UPDATE "Course_Concepts"
                SET concept_name = ${concept_name}
                WHERE concept_id = ${concept_id}
                RETURNING *;
              `;
            // Insert into User Engagement Log
            await sqlConnection`
              INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
              VALUES (uuid_generate_v4(), ${instructor_email}, (
                  SELECT course_id FROM "Course_Concepts" WHERE concept_id = ${concept_id}
              ), null, null, CURRENT_TIMESTAMP, 'instructor_edited_concept')
            `;

            response.body = JSON.stringify(updatedConcept[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "concept_id or request body is missing";
        }
        break;
      case "POST /instructor/create_module":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.concept_id &&
          event.queryStringParameters.module_name &&
          event.queryStringParameters.module_number &&
          event.queryStringParameters.instructor_email
        ) {
          try {
            const {
              course_id,
              concept_id,
              module_name,
              module_number,
              instructor_email,
            } = event.queryStringParameters;

            // Insert new module into Course_Modules table
            const newModule = await sqlConnection`
                  INSERT INTO "Course_Modules" (module_id, concept_id, course_id, module_name, module_number)
                  VALUES (uuid_generate_v4(), ${concept_id}, ${course_id}, ${module_name}, ${module_number})
                  RETURNING *;
                `;

            // Insert into User Engagement Log
            await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, (SELECT module_id FROM "Course_Modules" WHERE module_name = ${module_name}), null, CURRENT_TIMESTAMP, 'instructor_created_module')
                `;

            response.body = JSON.stringify(newModule[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body =
            "course_id, concept_id, module_name, module_number, or instructor_email is missing";
        }
        break;
      case "PUT /instructor/edit_module":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.module_id &&
          event.queryStringParameters.instructor_email &&
          event.body
        ) {
          try {
            const { module_id, instructor_email } = event.queryStringParameters;
            const { module_name, module_number } = JSON.parse(event.body);

            // Update module details in Course_Modules table
            const updatedModule = await sqlConnection`
                  UPDATE "Course_Modules"
                  SET module_name = ${module_name}, module_number = ${module_number}
                  WHERE module_id = ${module_id}
                  RETURNING *;
                `;

            // Insert into User Engagement Log
            await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, (SELECT course_id FROM "Course_Modules" WHERE module_id = ${module_id}), ${module_id}, null, CURRENT_TIMESTAMP, 'instructor_edited_module')
                `;

            response.body = JSON.stringify(updatedModule[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body =
            "module_id, instructor_email, or request body is missing";
        }
        break;
      case "PUT /instructor/prompt":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.instructor_email &&
          event.body
        ) {
          try {
            const { course_id, instructor_email } = event.queryStringParameters;
            const { prompt } = JSON.parse(event.body);

            // Update system prompt for the course in Courses table
            const updatedCourse = await sqlConnection`
                  UPDATE "Courses"
                  SET system_prompt = ${prompt}
                  WHERE course_id = ${course_id}
                  RETURNING *;
                `;

            // Insert into User Engagement Log
            await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, null, null, CURRENT_TIMESTAMP, 'instructor_updated_prompt')
                `;

            response.body = JSON.stringify(updatedCourse[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body =
            "course_id, instructor_email, or request body is missing";
        }
        break;
      case "GET /instructor/view_students":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          try {
            const { course_id } = event.queryStringParameters;

            // Fetch student , username, and user_email enrolled in the course
            const studentsData = await sqlConnection`
                SELECT "Users".username, Users.user_email
                FROM "Users"
                JOIN "Enrolments" ON "Users".user_email = "Enrolments".user_email
                WHERE "Enrolments".course_id = ${course_id}
                  AND "Enrolments".enrolment_type = 'student';
              `;

            response.body = JSON.stringify(studentsData);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id is required";
        }
        break;
      case "DELETE /instructor/delete_student":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.instructor_email &&
          event.queryStringParameters.user_email
        ) {
          try {
            const { course_id, instructor_email, user_email } =
              event.queryStringParameters;

            // Delete the student from the course enrolments
            const deleteResult = await sqlConnection`
                  DELETE FROM "Enrolments"
                  WHERE course_id = ${course_id}
                    AND user_email = (
                      SELECT user_email
                      FROM "Users"
                      WHERE user_email = ${user_email}
                    )
                    AND enrolment_type = 'student'
                  RETURNING *;
                `;

            if (deleteResult.length > 0) {
              response.body = JSON.stringify(deleteResult[0]);

              // Insert into User Engagement Log
              await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, null, null, CURRENT_TIMESTAMP, 'instructor_deleted_student')
                `;
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({
                error: "Student not found in the course",
              });
            }
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body =
            "course_id, user_email, and instructor_email are required";
        }
        break;

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = JSON.stringify(error.message);
  }

  return response;
};
