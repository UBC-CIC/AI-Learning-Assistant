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
            // Query to get all courses where the instructor is enrolled
            const data = await sqlConnection`
          SELECT c.*
          FROM "Enrolments" e
          JOIN "Courses" c ON e.course_id = c.course_id
          WHERE e.user_email = ${instructorEmail}
          AND e.enrolment_type = 'instructor'
          ORDER BY c.course_name, c.course_id;
        `;

            response.statusCode = 200;
            response.body = JSON.stringify(data);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "email is required" });
        }
        break;
      case "GET /instructor/analytics":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const courseId = event.queryStringParameters.course_id;

          try {
            // Query to get the number of message creations per Course_Module
            const messageCreations = await sqlConnection`
                SELECT cm.module_id, cm.module_name, COUNT(m.message_id) AS message_count, cm.module_number, cc.concept_number
                FROM "Course_Modules" cm
                JOIN "Course_Concepts" cc ON cm.concept_id = cc.concept_id
                LEFT JOIN "Student_Modules" sm ON cm.module_id = sm.course_module_id
                LEFT JOIN "Sessions" s ON sm.student_module_id = s.student_module_id
                LEFT JOIN "Messages" m ON s.session_id = m.session_id
                WHERE cc.course_id = ${courseId}
                GROUP BY cm.module_id, cc.concept_number
                ORDER BY cc.concept_number ASC, cm.module_number ASC;
              `;

            // Query to get the number of module accesses per Course_Module
            const moduleAccesses = await sqlConnection`
                SELECT cm.module_id, cm.module_name, COUNT(sm.student_module_id) AS access_count, cm.module_number, cc.concept_number
                FROM "Course_Modules" cm
                JOIN "Course_Concepts" cc ON cm.concept_id = cc.concept_id
                LEFT JOIN "Student_Modules" sm ON cm.module_id = sm.course_module_id
                WHERE cc.course_id = ${courseId} AND sm.last_accessed IS NOT NULL
                GROUP BY cm.module_id, cc.concept_number
                ORDER BY cc.concept_number ASC, cm.module_number ASC;
              `;

            // Query to get the average score over all Student_Modules in the course
            const averageScores = await sqlConnection`
                SELECT cm.module_id, cm.module_name, AVG(sm.module_score) AS average_score, cm.module_number, cc.concept_number
                FROM "Course_Modules" cm
                JOIN "Course_Concepts" cc ON cm.concept_id = cc.concept_id
                LEFT JOIN "Student_Modules" sm ON cm.module_id = sm.course_module_id
                WHERE cc.course_id = ${courseId}
                GROUP BY cm.module_id, cc.concept_number
                ORDER BY cc.concept_number ASC, cm.module_number ASC;
              `;

            // Combine all data into a single response, already ordered by concept_number and module_number
            const analyticsData = messageCreations.map((module) => {
              const accesses =
                moduleAccesses.find(
                  (ma) => ma.module_id === module.module_id
                ) || {};
              const scores =
                averageScores.find((as) => as.module_id === module.module_id) ||
                {};

              return {
                module_id: module.module_id,
                module_name: module.module_name,
                concept_number: module.concept_number,
                module_number: module.module_number,
                message_count: module.message_count,
                access_count: accesses.access_count || 0,
                average_score: scores.average_score || 0,
              };
            });

            response.statusCode = 200;
            response.body = JSON.stringify(analyticsData);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "course_id is required" });
        }
        break;
      case "POST /instructor/create_concept":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.concept_number
        ) {
          const courseId = event.queryStringParameters.course_id;
          const conceptNumber = event.queryStringParameters.concept_number;
          const { concept_name } = JSON.parse(event.body);

          if (!concept_name) {
            response.statusCode = 400;
            response.body = JSON.stringify({
              error: "concept_name is required",
            });
            break;
          }

          try {
            // Insert the new concept into the Course_Concepts table using uuid_generate_v4() for concept_id
            await sqlConnection`
                        INSERT INTO "Course_Concepts" (
                            "concept_id", "course_id", "concept_number", "concept_name"
                        ) VALUES (
                            uuid_generate_v4(), ${courseId}, ${conceptNumber}, ${concept_name}
                        );
                    `;

            response.statusCode = 201;
            response.body = JSON.stringify({
              message: "Concept created successfully",
            });
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "course_id and concept_number are required",
          });
        }
        break;
      case "PUT /instructor/edit_concept":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.concept_id &&
          event.queryStringParameters.concept_number
        ) {
          const conceptId = event.queryStringParameters.concept_id;
          const conceptNumber = event.queryStringParameters.concept_number;
          const { concept_name } = JSON.parse(event.body);

          try {
            // Update the concept's name and number
            const result = await sqlConnection`
                      UPDATE "Course_Concepts"
                      SET
                          concept_name = ${concept_name},
                          concept_number = ${conceptNumber}
                      WHERE
                          concept_id = ${conceptId}
                      RETURNING *;
                  `;

            if (result.length > 0) {
              response.statusCode = 200;
              response.body = JSON.stringify(result[0]);
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Concept not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "concept_id and concept_number are required",
          });
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
                INSERT INTO "Course_Modules" (module_id, concept_id, module_name, module_number)
                VALUES (uuid_generate_v4(), ${concept_id}, ${module_name}, ${module_number})
                RETURNING *;
              `;

            // Insert into User Engagement Log
            await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, ${newModule[0].module_id}, null, CURRENT_TIMESTAMP, 'instructor_created_module')
                `;

            response.body = JSON.stringify(newModule[0]);
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
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
          event.queryStringParameters.module_number &&
          event.queryStringParameters.instructor_email
        ) {
          const { module_id, module_number, instructor_email } =
            event.queryStringParameters;
          const { module_name } = JSON.parse(event.body || "{}");

          if (module_name) {
            try {
              // Update the module in the Course_Modules table
              await sqlConnection`
                UPDATE "Course_Modules"
                SET module_name = ${module_name}, module_number = ${module_number}
                WHERE module_id = ${module_id};
              `;

              // Insert into User Engagement Log
              await sqlConnection`
                  INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                  VALUES (uuid_generate_v4(), ${instructor_email}, NULL, ${module_id}, NULL, CURRENT_TIMESTAMP, 'instructor_edited_module');
                `;

              response.statusCode = 200;
              response.body = JSON.stringify({
                message: "Module updated successfully",
              });
            } catch (err) {
              response.statusCode = 500;
              console.error(err);
              response.body = JSON.stringify({
                error: "Internal server error",
              });
            }
          } else {
            response.statusCode = 400;
            response.body = JSON.stringify({
              error: "module_name is required in the body",
            });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error:
              "module_id, module_number, or instructor_email is missing in query string parameters",
          });
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
            console.log(err);
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
          const { course_id } = event.queryStringParameters;

          try {
            // Query to get all students enrolled in the given course
            const enrolledStudents = await sqlConnection`
                SELECT u.user_email, u.username, u.first_name, u.last_name
                FROM "Enrolments" e
                JOIN "Users" u ON e.user_email = u.user_email
                WHERE e.course_id = ${course_id} AND e.enrolment_type = 'student';
              `;

            response.statusCode = 200;
            response.body = JSON.stringify(enrolledStudents);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "course_id is required" });
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
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body =
            "course_id, user_email, and instructor_email are required";
        }
        break;
      case "GET /instructor/view_modules":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const { course_id } = event.queryStringParameters;

          try {
            // Query to get all modules for the given course
            const courseModules = await sqlConnection`
        SELECT cm.module_id, cm.module_name, cm.module_number, cc.concept_name, cc.concept_number
        FROM "Course_Modules" cm
        JOIN "Course_Concepts" cc ON cm.concept_id = cc.concept_id
        WHERE cc.course_id = ${course_id}
        ORDER BY cc.concept_number ASC, cm.module_number ASC;
      `;

            response.statusCode = 200;
            response.body = JSON.stringify(courseModules);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "course_id is required" });
        }
        break;
      case "GET /instructor/view_concepts":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const courseId = event.queryStringParameters.course_id;

          try {
            // Query to get all concepts for the given course
            const concepts = await sqlConnection`
                SELECT concept_id, concept_name, concept_number
                FROM "Course_Concepts"
                WHERE course_id = ${courseId}
                ORDER BY concept_number ASC;
              `;

            response.statusCode = 200;
            response.body = JSON.stringify(concepts);
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "course_id is required" });
        }
        break;
      case "DELETE /instructor/delete_concept":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.concept_id
        ) {
          const conceptId = event.queryStringParameters.concept_id;

          try {
            // Delete the concept from the Course_Concepts table
            await sqlConnection`
                DELETE FROM "Course_Concepts"
                WHERE concept_id = ${conceptId};
              `;

            response.statusCode = 200;
            response.body = JSON.stringify({
              message: "Concept deleted successfully",
            });
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "concept_id is required" });
        }
        break;
      case "DELETE /instructor/delete_module":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.module_id
        ) {
          const moduleId = event.queryStringParameters.module_id;

          try {
            // Delete the module from the Course_Modules table
            await sqlConnection`
                DELETE FROM "Course_Modules"
                WHERE module_id = ${moduleId};
              `;

            response.statusCode = 200;
            response.body = JSON.stringify({
              message: "Module deleted successfully",
            });
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "module_id is required" });
        }
        break;
      case "GET /instructor/get_prompt":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          try {
            const { course_id } = event.queryStringParameters;

            // Retrieve the system prompt from the Courses table
            const coursePrompt = await sqlConnection`
                    SELECT system_prompt 
                    FROM "Courses"
                    WHERE course_id = ${course_id};
                  `;

            if (coursePrompt.length > 0) {
              response.statusCode = 200;
              response.body = JSON.stringify(coursePrompt[0]);
            } else {
              response.statusCode = 404;
              response.body = JSON.stringify({ error: "Course not found" });
            }
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id is missing";
        }
        break;

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};
