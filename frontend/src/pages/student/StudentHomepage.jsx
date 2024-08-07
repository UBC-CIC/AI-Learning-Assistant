import { useEffect, useState, useContext } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { fetchAuthSession } from "aws-amplify/auth";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// MUI
import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  Stack,
  Skeleton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import { useNavigate } from 'react-router-dom';
// MUI theming
const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const theme = createTheme({
  palette: {
    primary: createColor("#5536DA"),
    bg: createColor("#F8F9FD"),
  },
});

export const StudentHomepage = ({setCourse}) => {

  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);

  const enterCourse = (course) => {
    setCourse(course);
    navigate(`/course`);
  }

  const handleJoin = async (code) => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/enroll_student?student_email=${encodeURIComponent(
          session.tokens.signInDetails.loginId
        )}&course_access_code=${encodeURIComponent(code)}`,
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
        toast.success("🦄 Successfully Joined Course!", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        handleClose();
      } else {
        console.error("Failed to fetch courses:", response.statusText);
        toast.error("Failed to Join Course", {
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
      console.error("Error fetching courses:", error);
      toast.error("Failed to Join Course", {
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
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/course?email=${encodeURIComponent(
            session.tokens.signInDetails.loginId
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
          setCourses(data);
        } else {
          console.error("Failed to fetch course:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      }
    };

    fetchCourses();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div>
        <StudentHeader />
        <Container>
          <Grid
            container
            direction="row"
            // justifyContent="space-evenly"
            alignItems="flex-start"
            wrap="nowrap"
            columns={12}
          >
            <Grid item xs={6}>
              <Stack>
                <Typography
                  component="h1"
                  variant="h5"
                  color="black"
                  sx={{ fontWeight: "500", mb: 2 }}
                  paddingLeft={3}
                  textAlign="left"
                >
                  Courses
                  <Button
                    sx={{ ml: 40 }}
                    variant="outlined"
                    onClick={handleClickOpen}
                  >
                    +
                  </Button>
                </Typography>
                <Box
                  paddingLeft={3}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  {courses.map((course, index) => (
                    <Card
                      key={index}
                      sx={{
                        maxWidth: 1000,
                        minWidth: 500,
                        bgcolor: "bg",
                      }}
                    >
                      <CardContent>
                        <Grid container alignItems="center">
                          <Grid item xs={8}>
                            <Typography
                              variant="h6"
                              component="div"
                              sx={{ textAlign: "left", fontWeight: "medium" }}
                            >
                              {course.course_department} {course.course_number}
                            </Typography>
                          </Grid>
                          <Grid item xs={4} sx={{ textAlign: "right" }}>
                            <Button
                              size="small"
                              sx={{
                                bgcolor: "purple",
                                color: "white",
                                ":hover": { bgcolor: "purple" },
                              }}
                              onClick={()=>enterCourse(course)}
                            >
                              Continue
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Box
                paddingLeft={2}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "left",
                }}
              >
                <Typography
                  component="h1"
                  variant="h5"
                  color="black"
                  sx={{ fontWeight: "500", mb: 2 }}
                  paddingLeft={0}
                  paddingTop={0}
                  textAlign="right"
                >
                  Your progress
                </Typography>
                <Skeleton variant="rectangular" width={500} height={100} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </div>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            const code = formJson.code;
            handleJoin(code);
          },
        }}
      >
        <DialogTitle>Join Course</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the access code provided by an instructor.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="code"
            label="Access Code"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Join</Button>
        </DialogActions>
      </Dialog>
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
    </ThemeProvider>
  );
};

export default StudentHomepage;
