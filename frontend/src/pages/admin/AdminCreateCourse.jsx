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
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";

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
    name: `${instructor.first_name} ${instructor.last_name}`,
    email: instructor.user_email,
  }));
}

export const AdminCreateCourse = () => {
  const [courseName, setCourseName] = useState("");
  const [coursePrompt, setCoursePrompt] = useState("");
  const [courseDepartment, setCourseDepartment] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [active, setActive] = useState(true);
  const [tone, setTone] = useState("");
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const handleStatusChange = (event) => {
    setActive(!active);
  };

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
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

  // instructors = [
  //   { id: 1, name: "Instructor 1" },
  //   { id: 2, name: "Instructor 2" },
  //   { id: 3, name: "Instructor 3" },
  // ];

  const handleCreate = async () => {
    const access_code = generateAccessCode();
    // Handle the create course logic here
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
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
        )}&course_student_access=${encodeURIComponent(
          active
        )}&system_prompt=${encodeURIComponent(
          coursePrompt
        )}&llm_tone=${encodeURIComponent(tone)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const { course_id } = data;
        // Enroll each selected instructor
        for (const instructor of selectedInstructors) {
          console.log("course_id", course_id);
          console.log("instructor", instructor);
          const enrollResponse = await fetch(
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
          );

          if (enrollResponse.ok) {
            const enrollData = await enrollResponse.json();
            console.log("Instructor enrollment data:", enrollData);
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
          }
        }
      } else {
        console.error("Failed to fetch instructors:", response.statusText);
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
      console.error("Error fetching instructors:", error);
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

  const inputStyles = {
    width: "100%",
    margin: "8px 0",
    padding: "8px",
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    color: "black",
  };

  const labelStyles = {
    marginBottom: "3px",
    display: "block",
    textAlign: "left",
    color: "#000",
    mx: "left",
  };
  return (
    <>
      <Box sx={{ maxWidth: 500, mx: "left", mt: 7, p: 4, overflow: "auto" }}>
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
          />
          <TextField
            fullWidth
            label="System Prompt"
            value={coursePrompt}
            onChange={(e) => setCoursePrompt(e.target.value)}
            margin="normal"
            multiline
            rows={4}
          />
          <TextField
            fullWidth
            label="Course Department"
            value={courseDepartment}
            onChange={(e) => setCourseDepartment(e.target.value)}
            margin="normal"
            backgroundColor="default"
          />
          <TextField
            fullWidth
            label="Course Code"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            margin="normal"
            backgroundColor="default"
          />
          <TextField
            fullWidth
            label="LLM Tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            margin="normal"
            backgroundColor="default"
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
            >
              {instructors.map((instructor) => (
                <MenuItem key={instructor.id} value={instructor.email}>
                  {instructor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={active} onChange={handleStatusChange} />}
            label={active ? "Active" : "Inactive"}
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
          {/* <div>
          <label style={labelStyles}>
            Assign Instructors:
            <select
              multiple
              value={selectedInstructors}
              onChange={handleChange}
              style={inputStyles}
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.name}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            margin: "8px 0",
            backgroundColor: "transparent",
            color: "black",
          }}
        >
          {selectedInstructors.map((value) => (
            <Chip key={value} label={value} />
          ))}
        </div> */}
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
      </Box>
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
    </>
  );
};

export default AdminCreateCourse;
