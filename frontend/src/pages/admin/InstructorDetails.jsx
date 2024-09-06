import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

import {
  Typography,
  Box,
  Toolbar,
  Paper,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  OutlinedInput,
  Chip,
  Grid,
  Divider,
} from "@mui/material";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: 200,
      overflowY: "auto",
    },
  },
};

const InstructorDetails = ({ instructorData, onBack }) => {
  const instructor = instructorData;
  const [activeCourses, setActiveCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [activeCourseLoading, setActiveCourseLoading] = useState(true);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}admin/courses`,
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
          setAllCourses(data);
          setCourseLoading(false);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    const fetchActiveCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }admin/instructorCourses?instructor_email=${encodeURIComponent(
            instructorData.email
          )}`,
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
          setActiveCourses(data);
          console.log(data);
          setActiveCourseLoading(false);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchActiveCourses();
    fetchCourses();
  }, []);

  if (!instructor) {
    return <Typography>No data found for this instructor.</Typography>;
  }

  const handleCoursesChange = (event) => {
    const newCourses = event.target.value;
    // Filter out duplicates
    const uniqueCourses = Array.from(
      new Map(newCourses.map((course) => [course.course_id, course])).values()
    );
    setActiveCourses(uniqueCourses);
  };

  const handleDelete = async () => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/instructorCourses?instructor_email=${encodeURIComponent(
          instructorData.email
        )}`,
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
        setActiveCourses(data);
        console.log(data);
        setActiveCourseLoading(false);
      } else {
        console.error("Failed to fetch courses:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();

      // Delete existing enrolments for the instructor
      const deleteResponse = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/delete_instructor_enrolments?&instructor_email=${encodeURIComponent(
          instructor.user
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!deleteResponse.ok) {
        console.error("Failed to update enrolment:", deleteResponse.statusText);
        toast.error("Update enrolment Failed", {
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
      console.log("Delete data:", await deleteResponse.json());

      // Enroll instructor in multiple courses in parallel
      const enrollPromises = activeCourses.map((course) =>
        fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }admin/enroll_instructor?course_id=${encodeURIComponent(
            course.course_id
          )}&instructor_email=${encodeURIComponent(instructor.email)}`,
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
              console.log("Instructor enrollment data:", enrollData);
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

      if (allEnrolledSuccessfully) {
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
        toast.error("Some enrolments failed", {
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
      console.error("Error in handleSave:", error);
      toast.error("An error occurred", {
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

  return (
    <>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, marginTop: 1, textAlign: "left" }}
      >
        <Toolbar />
        <Paper sx={{ p: 2, marginBottom: 4, textAlign: "left" }}>
          <Typography variant="h5" sx={{ marginBottom: 2, p: 1 }}>
            Instructor: {instructorData.user}
          </Typography>
          <Divider sx={{ p: 1, marginBottom: 3 }} />
          <Typography variant="h7" sx={{ marginBottom: 1, p: 1 }}>
            Email: {instructorData.email}
          </Typography>
          <FormControl sx={{ width: "100%", marginBottom: 2, marginTop: 5 }}>
            <InputLabel id="active-courses-label">Active Courses</InputLabel>
            <Select
              labelId="active-courses-label"
              multiple
              value={activeCourses}
              onChange={handleCoursesChange}
              input={
                <OutlinedInput
                  id="select-multiple-chip"
                  label="Active Courses"
                />
              }
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value.course_id}
                      label={`${value.course_department} ${value.course_number}`}
                    />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {allCourses.map((course) => (
                <MenuItem key={course.course_id} value={course}>
                  {course.course_department} {course.course_number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button
              variant="contained"
              onClick={onBack}
              sx={{ width: "30%", mx: "left" }}
            >
              Back
            </Button>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              sx={{ width: "30%", mx: "right", mr: 2 }}
            >
              Delete
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              sx={{ width: "30%", mx: "right" }}
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </Box>
      <ToastContainer
        position="top-center"
        autoClose={1000}
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

export default InstructorDetails;
