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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Autocomplete,
  TextField
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

function titleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const InstructorDetails = ({ instructorData, onBack }) => {
  const instructor = instructorData;
  const [activeCourses, setActiveCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [activeCourseLoading, setActiveCourseLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken
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
        var token = session.tokens.idToken
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
  const handleConfirmDeleteOpen = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDeleteClose = () => {
    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = async () => {
    handleConfirmDeleteClose();
    handleDelete();
  };

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
      var token = session.tokens.idToken
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/lower_instructor?email=${encodeURIComponent(
          instructorData.email
        )}`,
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
        toast.success("Instructor Demoted Successfully", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        setTimeout(function () {
          onBack();
        }, 1000);
      } else {
        console.error("Failed to demote instructor:", response.statusText);
      }
    } catch (error) {
      console.error("Error demoting instructor:", error);
    }
  };

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken
      console.log(instructor);
      // Delete existing enrolments for the instructor
      const deleteResponse = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/delete_instructor_enrolments?instructor_email=${encodeURIComponent(
          instructor.email
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
            Instructor: {titleCase(instructorData.user)}
          </Typography>
          <Divider sx={{ p: 1, marginBottom: 3 }} />
          <Typography variant="h7" sx={{ marginBottom: 1, p: 1 }}>
            Email: {instructorData.email}
          </Typography>
          <FormControl sx={{ width: "100%", marginBottom: 2, marginTop: 5 }}>
            <Autocomplete
              multiple
              id="active-courses-autocomplete"
              options={allCourses}
              value={activeCourses}
              onChange={(event, newValue) => {
                // Filter out duplicates
                const uniqueCourses = Array.from(
                  new Map(
                    newValue.map((course) => [course.course_id, course])
                  ).values()
                );
                setActiveCourses(uniqueCourses);
              }}
              getOptionLabel={(option) =>
                `${option.course_department.toUpperCase()} ${
                  option.course_number
                }`
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Active Courses"
                  variant="outlined"
                />
              )}
              isOptionEqualToValue={(option, value) =>
                option.course_id === value.course_id
              }
            />
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
              onClick={handleConfirmDeleteOpen}
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
        <Dialog
          open={confirmDeleteOpen}
          onClose={handleConfirmDeleteClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Are you sure you want to delete this instructor? This action
              cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmDeleteClose} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} color="error">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
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
