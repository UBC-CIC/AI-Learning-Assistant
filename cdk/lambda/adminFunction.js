const { initializeConnection } = require("./libadmin.js");

// Setting up evironments
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// SQL conneciton from global variable at libadmin.js
let sqlConnection = global.sqlConnectionTableCreator ;

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
      case "GET /admin/instructors":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.instructor_email
        ) {
          const { instructor_email } = event.queryStringParameters;

          // SQL query to fetch all users who are instructors
          const instructors = await sqlConnection`
                SELECT user_id, user_email, user_name
                FROM Users
                WHERE roles @> ARRAY['instructor']::varchar[];
              `;

          response.body = JSON.stringify(instructors);

          // Insert into User Engagement Log
          await sqlConnection`
                INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                VALUES (uuid_generate_v4(), ${instructor_email}, null, null, null, CURRENT_TIMESTAMP, 'admin_viewed_instructors')
              `;
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
                        INSERT INTO "Enrolments" (enrolment_id, course_id, user_email, enrolment_type, time_enrolled)
                        VALUES (uuid_generate_v4(), ${course_id}, ${instructor_email}, 'instructor', CURRENT_TIMESTAMP)
                        RETURNING *;
                    `;

            response.body = JSON.stringify(enrollment[0]);

            // Insert into User Engagement Log
            await sqlConnection`
                        INSERT INTO "User_Engagement_Log" (log_id, user_email, course_id, module_id, enrolment_id, timestamp, engagement_type)
                        VALUES (uuid_generate_v4(), ${instructor_email}, ${course_id}, null, (SELECT enrolment_id FROM "Enrolments" WHERE course_id = ${course_id} AND user_email = ${instructor_email}), CURRENT_TIMESTAMP, 'enrollment_created')
                    `;
          } catch (err) {
            response.statusCode = 500;
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
            const {
              course_name,
              course_department,
              course_number,
              course_access_code,
              course_student_access,
              system_prompt,
              llm_tone,
            } = event.queryStringParameters;

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

            const courseId = newCourse[0].course_id;

            // Create the dynamic table [Course_Id]_RAG_segmented_vectors
            await sqlConnection`
                CREATE TABLE IF NOT EXISTS "${courseId}_RAG_segmented_vectors" (
                    chunk_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    course_id uuid,
                    file_id uuid,
                    vectors float[]
                );
            `;

            response.body = JSON.stringify(newCourse[0]);
          } catch (err) {
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "Missing required parameters";
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
