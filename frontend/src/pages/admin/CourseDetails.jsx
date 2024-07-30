import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Switch,
  Typography,
  Paper,
  FormControlLabel,
  Toolbar,
  Divider,
} from "@mui/material";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CourseDetails = ({ course, onBack }) => {
  console.log(course)
  const [activeInstructors, setActiveInstructors] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [allInstructors, setAllInstructors] = useState([]);
  useEffect(() => {
    const fetchActiveInstructors = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }admin/courseInstructors?course_id=${course.id}`,
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
          console.log(data);
          setActiveInstructors(data);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
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
          console.log(data);
          setAllInstructors(data);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchActiveInstructors();
    fetchInstructors();
  }, []);

  const handleInstructorsChange = (event) => {
    const newInstructors = event.target.value;
    // Filter out duplicates
    const uniqueInstructors = Array.from(
      new Map(newInstructors.map(instructor => [instructor.user_email, instructor])).values()
    );
    setActiveInstructors(uniqueInstructors);
  };

  const handleStatusChange = (event) => {
    console.log(event.target.checked)
    setIsActive(event.target.checked);
  };

  const handleSave = async () => {
    const session = await fetchAuthSession();
    var token = session.tokens.idToken.toString();
    const deleteResponse = await fetch(
      `${
        import.meta.env.VITE_API_ENDPOINT
      }admin/delete_course_instructor_enrolments?&course_id=${encodeURIComponent(course.id)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    if (deleteResponse.ok) {
      const enrollData = await deleteResponse.json();
      console.log("delete data:", enrollData);
    } else {
      console.error(
        "Failed to update enrolment:",
        deleteResponse.statusText
      );
      toast.error("update enrolment Failed", {
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

    for (const instructor of activeInstructors) {
      const enrollResponse = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/enroll_instructor?course_id=${encodeURIComponent(
          course.id
        )}&instructor_email=${encodeURIComponent(instructor.user_email)}`,
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
        toast.success("🦄 Enrolment Updated!", {
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

    const updateCourseAccess = await fetch(
      `${
        import.meta.env.VITE_API_ENDPOINT
      }admin/updateCourseAccess?&course_id=${encodeURIComponent(course.id)}&access=${encodeURIComponent(isActive)}`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    if (updateCourseAccess.ok) {
      const enrollData = await updateCourseAccess.json();
      console.log("updateCourseAccess data:", enrollData);
    } else {
      console.error(
        "Failed to update enrolment:",
        deleteResponse.statusText
      );
      toast.error("update enrolment Failed", {
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
  };

  return (
    <>
    <Box
      component="main"
      sx={{ flexGrow: 1, p: 3, marginTop: 1, textAlign: "left" }}
    >
      <Toolbar />
      <Paper sx={{ padding: 2, marginBottom: 2 }}>
        <Typography variant="h4" sx={{ marginBottom: 0 }}>
          {course.course}
        </Typography>
        <Divider sx={{ p: 1, marginBottom: 3 }} />
        <FormControl fullWidth sx={{ marginBottom: 2 }}>
          <InputLabel id="select-instructors-label">
            Active Instructors
          </InputLabel>
          <Select
            labelId="select-instructors-label"
            multiple
            value={activeInstructors}
            onChange={handleInstructorsChange}
            input={
              <OutlinedInput
                id="select-multiple-chip"
                label="Active Instructors"
              />
            }
            renderValue={(selected) => (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                }}
              >
                {selected.map((value) => (
                  <Chip key={value.user_email} label={value.first_name} />
                ))}
              </Box>
            )}
          >
            {allInstructors.map((instructor) => (
              <MenuItem key={instructor.user_email} value={instructor}>
                {instructor.first_name} {instructor.last_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={isActive} onChange={handleStatusChange} />}
          label={isActive ? "Active" : "Inactive"}
        />
      </Paper>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Button variant="contained" onClick={onBack} sx={{ width: "30%" }}>
            Back
          </Button>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: "right" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ width: "30%" }}
          >
            Save
          </Button>
        </Grid>
      </Grid>
    </Box>
    <ToastContainer/>
    </>
  );
};

export default CourseDetails;
