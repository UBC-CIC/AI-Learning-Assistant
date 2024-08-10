import { useEffect, useState } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { fetchAuthSession } from "aws-amplify/auth";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// MUI
import {
  Card,
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
  CardActions,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { getCurrentUser } from "aws-amplify/auth";

import { useNavigate } from "react-router-dom";
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

export const StudentHomepage = ({ setCourse }) => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);

  const enterCourse = (course) => {
    setCourse(course);
    sessionStorage.clear();
    sessionStorage.setItem("course", JSON.stringify(course));
    navigate(`/student_course`);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto"; // Reset when component unmounts
    };
  }, []);

  const handleJoin = async (code) => {
    try {
      const session = await fetchAuthSession();
      const { signInDetails } = await getCurrentUser();

      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }student/enroll_student?student_email=${encodeURIComponent(
          signInDetails.loginId
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
    sessionStorage.removeItem("course");
    sessionStorage.removeItem("module");
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        const { signInDetails } = await getCurrentUser();

        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/course?email=${encodeURIComponent(signInDetails.loginId)}`,
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
      <StudentHeader />
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <Stack
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            color="black"
            sx={{
              fontWeight: "500",
              mb: 2,
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingLeft: 5,
              maxWidth: "1000px",
              minWidth: "500px",
            }}
            textAlign="left"
          >
            Courses
            <Button sx={{}} variant="outlined" onClick={handleClickOpen}>
              +
            </Button>
          </Typography>
          <Box
            paddingLeft={3}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: "100%",
              overflowY: "scroll",
              maxHeight: "90vh",
            }}
          >
            {courses.map((course, index) => (
              <Card
                key={index}
                sx={{
                  flex: 1,
                  m: 1,
                  width: "100%",
                  maxWidth: "1000px",
                  minWidth: "500px",
                  minHeight: "200px",
                  bgcolor: "transparent",
                  background: `linear-gradient(10deg, rgb(83.137% 92.157% 99.608%) 0%, rgb(83.213% 92.029% 99.612%) 6.25%, rgb(83.436% 91.649% 99.623%) 12.5%, rgb(83.798% 91.033% 99.641%) 18.75%, rgb(84.286% 90.204% 99.665%) 25%, rgb(84.88% 89.194% 99.695%) 31.25%, rgb(85.558% 88.041% 99.729%) 37.5%, rgb(86.294% 86.791% 99.766%) 43.75%, rgb(87.059% 85.49% 99.804%) 50%, rgb(87.824% 84.19% 99.842%) 56.25%, rgb(88.56% 82.939% 99.879%) 62.5%, rgb(89.238% 81.786% 99.913%) 68.75%, rgb(89.832% 80.776% 99.943%) 75%, rgb(90.319% 79.947% 99.967%) 81.25%, rgb(90.682% 79.331% 99.985%) 87.5%, rgb(90.905% 78.952% 99.996%) 93.75%, rgb(90.98% 78.824% 100%) 100% )`,
                }}
              >
                <CardContent
                  sx={{ height:"50%"  }}>
                  <Grid container alignItems="center">
                    <Grid item xs={8}>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ textAlign: "left", fontWeight: "600",fontSize: "1.75rem" }}
                      >
                        {course.course_department} {course.course_number}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ textAlign: "left", mt: 1, fontSize: "1.15rem" }}
                      >
                        {course.course_name} {/* Add course description here */}
                      </Typography>
                    </Grid>
                    <Grid
                      item
                      xs={4}
                      sx={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Empty grid item to push the button to the bottom right */}
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    p: 1,
                    pr: 4,
                    height:"50%" // Padding for the right
                  }}
                >
                  <Button
                    size="small"
                    sx={{
                      bgcolor: "#5536DA",
                      p:1,
                      color: "white",
                      fontWeight: "light",
                      ":hover": { bgcolor: "purple" },
                    }}
                    onClick={() => enterCourse(course)}
                  >
                    Continue
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Stack>
      </Container>
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
