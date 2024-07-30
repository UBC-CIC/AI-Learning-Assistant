const { initializeConnection } = require("./lib.js");

// Setting up evironments
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// SQL conneciton from global variable at libadmin.js
let sqlConnection = global.sqlConnection; //TableCreator ;

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
    sqlConnection = global.sqlConnection; //TableCreator;
  }

  // Function to format student full names (lowercase and spaces replaced with "_")
  const formatNames = (name) => {
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "GET /admin/instructors":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.instructor_email
        ) {
          const { instructor_email } = event.queryStringParameters;

          // SQL query to fetch all users who are instructors
          const instructors = await sqlConnection`
                SELECT user_email, first_name, last_name
                FROM "Users"
                WHERE roles @> ARRAY['instructor']::varchar[];
              `;

          response.body = JSON.stringify(instructors);

          // // Insert into User Engagement Log
          // await sqlConnection`
          //       INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
          //       VALUES (uuid_generate_v4(), ${instructor_email}, null, null, null, CURRENT_TIMESTAMP, 'admin_viewed_instructors')
          //     `;
        } else {
          response.statusCode = 400;
          response.body = "instructor_email is required";
        }
        break;
      case "GET /admin/courses":
        try {
          // Query all courses from Courses table
          const courses = await sqlConnection`
                    SELECT *
                    FROM "Courses";
                `;

          response.body = JSON.stringify(courses);
        } catch (err) {
          response.statusCode = 500;
          response.body = JSON.stringify({ error: "Internal server error" });
        }
        break;
      case "POST /admin/enroll_instructor":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.instructor_email
        ) {
          try {
            const { course_id, instructor_email } = event.queryStringParameters;

            // Insert enrollment into Enrolments table with current timestamp
            const enrollment = await sqlConnection`
                INSERT INTO "Enrolments" (enrolment_id, course_id, user_email, enrolment_type, time_enroled)
                VALUES (uuid_generate_v4(), ${course_id}, ${instructor_email}, 'instructor', CURRENT_TIMESTAMP)
                ON CONFLICT (course_id, user_email) DO NOTHING
                RETURNING *;
            `;

            response.body = JSON.stringify(enrollment);

            // // Insert into User Engagement Log
            // await sqlConnection`
            //             INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
            //             VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, null, (SELECT enrolment_id FROM "Enrolments" WHERE course_id = ${course_id} AND user_email = ${instructor_email}), CURRENT_TIMESTAMP, 'enrollment_created')
            //         `;
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id and instructor_email are required";
        }
        break;
      case "POST /admin/create_course":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_name &&
          event.queryStringParameters.course_department &&
          event.queryStringParameters.course_number &&
          event.queryStringParameters.course_access_code &&
          event.queryStringParameters.course_student_access &&
          event.queryStringParameters.system_prompt &&
          event.queryStringParameters.llm_tone
        ) {
          try {
            console.log("course creation start");
            const {
              course_name,
              course_department,
              course_number,
              course_access_code,
              course_student_access,
              system_prompt,
              llm_tone,
            } = event.queryStringParameters;

            const ext = await sqlConnection`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            `;

            // Insert new course into Courses table
            const newCourse = await sqlConnection`         
                INSERT INTO "Courses" (
                    course_id,
                    course_name,
                    course_department,
                    course_number,
                    course_access_code,
                    course_student_access,
                    system_prompt,
                    llm_tone
                )
                VALUES (
                    uuid_generate_v4(),
                    ${course_name},
                    ${course_department},
                    ${course_number},
                    ${course_access_code},
                    ${course_student_access},
                    ${system_prompt},
                    ${llm_tone}
                )
                RETURNING *;
            `;

            console.log(newCourse);
            const courseId = newCourse[0].course_id;
            console.log(courseId);
            // Create the dynamic table [Course_Id]_RAG_segmented_vectors
            // await sqlConnection`
            //     CREATE TABLE IF NOT EXISTS '${courseId}_rag_segmented_vectors' (
            //         chunk_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            //         course_id uuid,
            //         file_id uuid,
            //         vectors float[]
            //     );
            // `;

            response.body = JSON.stringify(newCourse[0]);
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Missing required parameters";
        }
        break;
        if (
          event.body != null &&
          event.body.user_email &&
          event.body.course_id
        ) {
          const { user_email, course_id } = JSON.parse(event.body);

          // SQL query to check if the user has instructor role
          const user = await sqlConnection`
                  SELECT user_email
                  FROM "Users"
                  WHERE user_email = ${user_email} AND roles @> ARRAY['instructor']::varchar[];
                `;

          if (user.length === 0) {
            response.statusCode = 404;
            response.body = JSON.stringify({
              error: "User not found or user is not an instructor.",
            });
          } else {
            // SQL query to create the enrolment
            const enrolment = await sqlConnection`
                    INSERT INTO "Enrolments" (enrolment_id, user_email, course_id, enrolment_type, course_completion_percentage, time_spent, time_enroled)
                    VALUES (uuid_generate_v4(), ${user_email}, ${course_id}, 'instructor', 0, 0, CURRENT_TIMESTAMP)
                    RETURNING enrolment_id, user_email, course_id;
                  `;

            response.body = JSON.stringify({
              message: "Enrolment created successfully.",
              enrolment: enrolment[0],
            });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "user_email and course_id are required",
          });
        }
        break;
      case "GET /admin/courseInstructors":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const { course_id } = event.queryStringParameters;

          // SQL query to fetch all instructors for a given course
          const instructors = await sqlConnection`
                  SELECT u.user_email, u.first_name, u.last_name
                  FROM "Enrolments" e
                  JOIN "Users" u ON e.user_email = u.user_email
                  WHERE e.course_id = ${course_id} AND e.enrolment_type = 'instructor';
                `;

          response.body = JSON.stringify(instructors);
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "course_id is required" });
        }
        break;
      case "GET /admin/instructorCourses":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.instructor_email
        ) {
          const { instructor_email } = event.queryStringParameters;

          // SQL query to fetch all courses for a given instructor
          const courses = await sqlConnection`
                  SELECT c.course_id, c.course_name, c.course_department, c.course_number
                  FROM "Enrolments" e
                  JOIN "Courses" c ON e.course_id = c.course_id
                  WHERE e.user_email = ${instructor_email} AND e.enrolment_type = 'instructor';
                `;

          response.body = JSON.stringify(courses);
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "instructor_email is required",
          });
        }
        break;
      case "POST /admin/updateCourseAccess":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id &&
          event.queryStringParameters.access
        ) {
          const { course_id, access } = event.queryStringParameters;
          const accessBool = access.toLowerCase() === "true";

          // SQL query to update course access
          await sqlConnection`
                    UPDATE "Courses"
                    SET course_student_access = ${accessBool}
                    WHERE course_id = ${course_id};
                  `;

          response.body = JSON.stringify({
            message: "Course access updated successfully.",
          });
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "course_id and access query parameters are required",
          });
        }
        break;
      case "DELETE /admin/delete_instructor_enrolments":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.instructor_email
        ) {
          try {
            const { instructor_email } = event.queryStringParameters;
            // Delete all enrolments for the instructor where enrolment_type is 'instructor'
            await sqlConnection`
                      DELETE FROM "Enrolments"
                      WHERE user_email = ${instructor_email} AND enrolment_type = 'instructor';
                  `;

            response.body = JSON.stringify({
              message: "Instructor enrolments deleted successfully.",
            });
          } catch (err) {
            await sqlConnection.rollback();
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "instructor_email query parameter is required";
        }
        break;
      case "DELETE /admin/delete_course_instructor_enrolments":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          try {
            const { course_id } = event.queryStringParameters;

            // Delete all enrolments for the course where enrolment_type is 'instructor'
            await sqlConnection`
                      DELETE FROM "Enrolments"
                      WHERE course_id = ${course_id} AND enrolment_type = 'instructor';
                  `;

            response.body = JSON.stringify({
              message: "Course instructor enrolments deleted successfully.",
            });
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id query parameter is required";
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
