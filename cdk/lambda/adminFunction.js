const { initializeConnection } = require("./libadmin.js");

let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

// SQL conneciton from global variable at libadmin.js
let sqlConnectionTableCreator = global.sqlConnectionTableCreator; 

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
  if (!sqlConnectionTableCreator) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnectionTableCreator = global.sqlConnectionTableCreator; 
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
          const instructors = await sqlConnectionTableCreator`
                SELECT user_email, first_name, last_name
                FROM "Users"
                WHERE roles @> ARRAY['instructor']::varchar[]
                ORDER BY last_name ASC;
              `;

          response.body = JSON.stringify(instructors);

          // // Insert into User Engagement Log
          // await sqlConnectionTableCreator`
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
          const courses = await sqlConnectionTableCreator`
                    SELECT *
                    FROM "Courses"
                    ORDER BY course_department ASC, course_number ASC;
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
            const enrollment = await sqlConnectionTableCreator`
                INSERT INTO "Enrolments" (enrolment_id, course_id, user_email, enrolment_type, time_enroled)
                VALUES (uuid_generate_v4(), ${course_id}, ${instructor_email}, 'instructor', CURRENT_TIMESTAMP)
                ON CONFLICT (course_id, user_email) DO NOTHING
                RETURNING *;
            `;

            response.body = JSON.stringify(enrollment);

            // // Insert into User Engagement Log
            // await sqlConnectionTableCreator`
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
          event.body
        ) {
          try {
            console.log("course creation start");
            const {
              course_name,
              course_department,
              course_number,
              course_access_code,
              course_student_access,
            } = event.queryStringParameters;

            const { system_prompt } = JSON.parse(event.body);

            const ext = await sqlConnectionTableCreator`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            `;

            const accessBool = course_student_access.toLowerCase() === "true";

            console.log(accessBool)
            // Insert new course into Courses table
            const newCourse = await sqlConnectionTableCreator`         
                INSERT INTO "Courses" (
                    course_id,
                    course_name,
                    course_department,
                    course_number,
                    course_access_code,
                    course_student_access,
                    system_prompt
                )
                VALUES (
                    uuid_generate_v4(),
                    ${course_name},
                    ${course_department},
                    ${course_number},
                    ${course_access_code},
                    ${accessBool},
                    ${system_prompt}
                )
                RETURNING *;
            `;

            console.log(newCourse);
            const courseId = newCourse[0].course_id;
            console.log(courseId);

            // // Create the dynamic table [Course_Id]
            // await sqlConnectionTableCreator`
            //     CREATE TABLE IF NOT EXISTS ${sqlConnectionTableCreator(courseId)} (
            //         chunk_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            //         course_id uuid,
            //         file_id uuid,
            //         vectors float[]
            //     );
            // `;
            // // Add the foreign key for course_id
            // await sqlConnectionTableCreator`
            //   ALTER TABLE ${sqlConnectionTableCreator(courseId)}
            //   ADD CONSTRAINT fk_course_id
            //   FOREIGN KEY (course_id)
            //   REFERENCES "Courses"(course_id)
            //   ON DELETE CASCADE
            //   ON UPDATE CASCADE;
            // `;

            // // Add the foreign key for file_id
            // await sqlConnectionTableCreator`
            //   ALTER TABLE ${sqlConnectionTableCreator(courseId)}
            //   ADD CONSTRAINT fk_file_id
            //   FOREIGN KEY (file_id)
            //   REFERENCES "Module_Files"(file_id)
            //   ON DELETE CASCADE
            //   ON UPDATE CASCADE;
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
      case "GET /admin/courseInstructors":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          const { course_id } = event.queryStringParameters;

          // SQL query to fetch all instructors for a given course
          const instructors = await sqlConnectionTableCreator`
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
          const courses = await sqlConnectionTableCreator`
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
          await sqlConnectionTableCreator`
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
            await sqlConnectionTableCreator`
                      DELETE FROM "Enrolments"
                      WHERE user_email = ${instructor_email} AND enrolment_type = 'instructor';
                  `;

            response.body = JSON.stringify({
              message: "Instructor enrolments deleted successfully.",
            });
          } catch (err) {
            await sqlConnectionTableCreator.rollback();
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
            await sqlConnectionTableCreator`
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
      case "DELETE /admin/delete_course":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.course_id
        ) {
          try {
            const { course_id } = event.queryStringParameters;

            // // Drop the table whose name is the course_id
            // await sqlConnectionTableCreator`
            //   DROP TABLE IF EXISTS ${sqlConnectionTableCreator(course_id)};
            // `;

            // Delete the course, related records will be automatically deleted due to cascading
            await sqlConnectionTableCreator`
                      DELETE FROM "Courses"
                      WHERE course_id = ${course_id};
                  `;

            response.body = JSON.stringify({
              message: "Course and related records deleted successfully.",
            });
          } catch (err) {
            await sqlConnection.rollback();
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = "course_id query parameter is required";
        }
        break;
      case "POST /admin/elevate_instructor":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          const instructorEmail = event.queryStringParameters.email;

          try {
            // Check if the user exists
            const existingUser = await sqlConnectionTableCreator`
                        SELECT * FROM "Users"
                        WHERE user_email = ${instructorEmail};
                    `;

            if (existingUser.length > 0) {
              const userRoles = existingUser[0].roles;

              // Check if the role is already 'instructor' or 'admin'
              if (
                userRoles.includes("instructor") ||
                userRoles.includes("admin")
              ) {
                response.statusCode = 200;
                response.body = JSON.stringify({
                  message:
                    "No changes made. User is already an instructor or admin.",
                });
                break;
              }

              // If the role is 'student', elevate to 'instructor'
              if (userRoles.includes("student")) {
                const newRoles = userRoles.map((role) =>
                  role === "student" ? "instructor" : role
                );

                await sqlConnectionTableCreator`
                              UPDATE "Users"
                              SET roles = ARRAY['instructor']
                              WHERE user_email = ${instructorEmail};
                          `;

                response.statusCode = 200;
                response.body = JSON.stringify({
                  message: "User role updated to instructor.",
                });
                break;
              }
            } else {
              // Create a new user with the role 'instructor'
              await sqlConnectionTableCreator`
                            INSERT INTO "Users" (user_email, roles)
                            VALUES (${instructorEmail}, ARRAY['instructor']);
                        `;

              response.statusCode = 201;
              response.body = JSON.stringify({
                message: "New user created and elevated to instructor.",
              });
            }
          } catch (err) {
            response.statusCode = 500;
            console.error(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "Email is required" });
        }
        break;
      case "POST /admin/lower_instructor":
        if (
          event.queryStringParameters != null &&
          event.queryStringParameters.email
        ) {
          try {
            const userEmail = event.queryStringParameters.email;

            // Fetch the roles for the user
            const userRoleData = await sqlConnectionTableCreator`
                SELECT roles
                FROM "Users"
                WHERE user_email = ${userEmail};
              `;

            const userRoles = userRoleData[0]?.roles;

            if (!userRoles || !userRoles.includes("instructor")) {
              response.statusCode = 400;
              response.body = JSON.stringify({
                error: "User is not an instructor or doesn't exist",
              });
              break;
            }

            // Replace 'instructor' with 'student'
            const updatedRoles = userRoles
              .filter((role) => role !== "instructor")
              .concat("student");

            // Update the roles in the database
            await sqlConnectionTableCreator`
                UPDATE "Users"
                SET roles = ${updatedRoles}
                WHERE user_email = ${userEmail};
              `;

            response.statusCode = 200;
            response.body = JSON.stringify({
              message: `User role updated to student for ${userEmail}`,
            });
          } catch (err) {
            console.log(err);
            response.statusCode = 500;
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({
            error: "email query parameter is missing",
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
