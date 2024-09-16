import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Chip,
  Typography,
  OutlinedInput,
  FormControlLabel,
  Switch,
  Paper,
  Toolbar,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";

const CHARACTER_LIMIT = 1000;

function generateAccessCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format the code into the pattern XXXX-XXXX-XXXX-XXXX
  return code.match(/.{1,4}/g).join("-");
}

function formatInstructors(instructorsArray) {
  return instructorsArray.map((instructor, index) => ({
    id: index + 1,
    name:
      instructor.first_name && instructor.last_name
        ? `${instructor.first_name} ${instructor.last_name}`
        : instructor.user_email,
    email: instructor.user_email,
  }));
}

export const AdminCreateCourse = ({ setSelectedComponent }) => {
  const [courseName, setCourseName] = useState("");
  const [coursePrompt, setCoursePrompt] = useState(
    `Engage with the student by asking questions and conversing with them to identify any gaps in their understanding of the topic. If you identify gaps, address these gaps by providing explanations, answering the student's questions, and referring to the relevant context to help the student gain a comprehensive understanding of the topic.`
  );
  const [courseDepartment, setCourseDepartment] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const handleStatusChange = (event) => {
    setIsActive(event.target.checked);
  };

  const handleCourseCodeChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      // This regex ensures only digits
      setCourseCode(value);
    }
  };
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        //replace if analytics for admin actions is needed
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }admin/instructors?instructor_email=replace`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setInstructors(formatInstructors(data));
        } else {
          console.error("Failed to fetch instructors:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching instructors:", error);
      }
    };

    fetchInstructors();
  }, []);
  const handleCreate = async () => {
    const access_code = generateAccessCode();
    // Handle the create course logic here
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const numericCourseCode = Number(courseCode);

      if (isNaN(numericCourseCode)) {
        toast.error("access code must be a number", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        return;
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/create_course?course_name=${encodeURIComponent(
          courseName
        )}&course_department=${encodeURIComponent(
          courseDepartment
        )}&course_number=${encodeURIComponent(
          courseCode
        )}&course_access_code=${encodeURIComponent(
          access_code
        )}&course_student_access=${encodeURIComponent(isActive)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_prompt: coursePrompt,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const { course_id } = data;

        const enrollPromises = selectedInstructors.map((instructor) =>
          fetch(
            `${
              import.meta.env.VITE_API_ENDPOINT
            }admin/enroll_instructor?course_id=${encodeURIComponent(
              course_id
            )}&instructor_email=${encodeURIComponent(instructor)}`,
            {
              method: "POST",
              headers: {
                Authorization: token,
                "Content-Type": "application/json",
              },
            }
          ).then((enrollResponse) => {
            if (enrollResponse.ok) {
              return enrollResponse.json().then((enrollData) => {
                return { success: true };
              });
            } else {
              console.error(
                "Failed to enroll instructor:",
                enrollResponse.statusText
              );
              toast.error("Enroll Instructor Failed", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
              });
              return { success: false };
            }
          })
        );

        const enrollResults = await Promise.all(enrollPromises);
        const allEnrolledSuccessfully = enrollResults.every(
          (result) => result.success
        );

        if (allEnrolledSuccessfully || selectedInstructors.length === 0) {
          toast.success("🦄 Course Created!", {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
          setTimeout(() => {
            setSelectedComponent("AdminCourses");
          }, 1000);
        } else {
          toast.error("Some instructors could not be enrolled", {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        }
      } else {
        console.error("Failed to create course:", response.statusText);
        toast.error("Course Creation Failed", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Course Creation Failed", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: "Bounce",
      });
    }
  };

  const handleChange = (event) => {
    setSelectedInstructors(event.target.value);
  };
  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        overflowY: "auto",
        flexGrow: 1,
        p: 2,
        marginTop: 0.5,
        marginBottom: 1,
      }}
    >
      <Toolbar />
      <Paper
        sx={{
          maxWidth: "800px",
          overflow: "hidden",
          marginTop: 1,
          marginBottom: 1,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography
          color="black"
          fontStyle="semibold"
          textAlign="left"
          variant="h6"
        >
          Create a new course
        </Typography>
        <form noValidate autoComplete="off">
          <TextField
            fullWidth
            label="Course Name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            margin="normal"
            backgroundColor="default"
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            fullWidth
            label="System Prompt"
            value={coursePrompt}
            onChange={(e) => setCoursePrompt(e.target.value)}
            margin="normal"
            multiline
            rows={4}
            inputProps={{ maxLength: 1000}}
            helperText={`${coursePrompt.length}/${CHARACTER_LIMIT}`}
          />
          <TextField
            fullWidth
            label="Course Department"
            value={courseDepartment}
            onChange={(e) => setCourseDepartment(e.target.value)}
            margin="normal"
            backgroundColor="default"
            inputProps={{ maxLength: 20 }}
          />
          <TextField
            fullWidth
            label="Course Code (Numbers Only)"
            value={courseCode}
            onChange={handleCourseCodeChange}
            margin="normal"
            backgroundColor="default"
            inputProps={{ maxLength: 10, min: 0, step: 1 }}
          />
          <FormControl fullWidth sx={{ marginBottom: 2, marginTop: 2 }}>
            <InputLabel id="select-instructors-label">
              Assign Instructors
            </InputLabel>
            <Select
              labelId="select-instructors-label"
              multiple
              value={selectedInstructors}
              onChange={handleChange}
              input={
                <OutlinedInput
                  id="select-multiple-chip"
                  label="Assign Instructors"
                />
              }
              renderValue={(selected) => (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                    backgroundColor: "transparent",
                    color: "black",
                  }}
                >
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 200,
                    overflowY: "auto",
                  },
                },
              }}
            >
              {instructors.map((instructor) => (
                <MenuItem key={instructor.id} value={instructor.email}>
                  {instructor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch checked={isActive} onChange={handleStatusChange} />
            }
            label={isActive ? "Active" : "Inactive"}
            sx={{
              color: "black",
              textAlign: "left",
              justifyContent: "flex-start",
            }}
          />
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              backgroundColor: "transparent",
              color: "black",
            }}
          >
            {selectedInstructors.map((value) => (
              <Chip key={value} label={value} />
            ))}
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            fullWidth
            sx={{ mt: 2 }}
          >
            CREATE
          </Button>
        </form>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </Paper>
    </Box>
  );
};
export default AdminCreateCourse;
