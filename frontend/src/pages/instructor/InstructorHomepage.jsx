import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import {
  Typography,
  Box,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  TableFooter,
  TablePagination,
  Button,
} from "@mui/material";
import { v4 as uuidv4 } from 'uuid';
import PageContainer from "../Container";
import InstructorHeader from "../../components/InstructorHeader";
import InstructorSidebar from "./InstructorSidebar";
import InstructorAnalytics from "./InstructorAnalytics";
import InstructorEditCourse from "./InstructorEditCourse";
import PromptSettings from "./PromptSettings";
import ViewStudents from "./ViewStudents";
import InstructorModules from "./InstructorModules";
import InstructorNewModule from "./InstructorNewModule";
import StudentDetails from "./StudentDetails";
import InstructorNewConcept from "./InstructorNewConcept";
import InstructorConcepts from "./InstructorConcepts";
import InstructorEditConcept from "./InstructorEditConcept";
import ChatLogs from "./ChatLogs";
import { useNotification } from "../../context/NotificationContext";
import { UserContext } from "../../App";

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

function constructWebSocketUrl() {
  const tempUrl = import.meta.env.VITE_GRAPHQL_WS_URL; // Replace with your WebSocket URL
  const apiUrl = tempUrl.replace("https://", "wss://");
  const urlObj = new URL(apiUrl);
  const tmpObj = new URL(tempUrl);
  const modifiedHost = urlObj.hostname.replace(
      "appsync-api",
      "appsync-realtime-api"
  );

  urlObj.hostname = modifiedHost;
  const host = tmpObj.hostname;
  const header = {
      host: host,
      Authorization: "API_KEY=",
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const payload = "e30=";

  return `${urlObj.toString()}?header=${encodedHeader}&payload=${payload}`;
};

const removeCompletedNotification = async (course_id) => {
  try {
    console.log(course_id)
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const { email } = await fetchUserAttributes();
    const response = await fetch(
      `${import.meta.env.VITE_API_ENDPOINT}instructor/remove_completed_notification?course_id=${encodeURIComponent(course_id)}&instructor_email=${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: { Authorization: token, "Content-Type": "application/json" },
      }
    );

    if (response.ok) {
        console.log("Notification removed successfully.");
    } else {
        console.error("Failed to remove notification:", response.statusText);
    }
  } catch (error) {
    console.error("Error removing completed notification:", error);
  }
};

function openWebSocket(courseName, course_id, requestId, setNotificationForCourse, onComplete) {
  // Open WebSocket connection
  const wsUrl = constructWebSocketUrl();
  const ws = new WebSocket(wsUrl, "graphql-ws");

  // Handle WebSocket connection
  ws.onopen = () => {
    console.log("WebSocket connection established");

    // Initialize WebSocket connection
    const initMessage = { type: "connection_init" };
    ws.send(JSON.stringify(initMessage));

    // Subscribe to notifications
    const subscriptionId = uuidv4();
    const subscriptionMessage = {
        id: subscriptionId,
        type: "start",
        payload: {
            data: `{"query":"subscription OnNotify($request_id: String!) { onNotify(request_id: $request_id) { message request_id } }","variables":{"request_id":"${requestId}"}}`,
            extensions: {
                authorization: {
                    Authorization: "API_KEY=",
                    host: new URL(import.meta.env.VITE_GRAPHQL_WS_URL).hostname,
                },
            },
        },
    };

    ws.send(JSON.stringify(subscriptionMessage));
    console.log("Subscribed to WebSocket notifications");
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("WebSocket message received:", message);

    // Handle notification
    if (message.type === "data" && message.payload?.data?.onNotify) {
      const receivedMessage = message.payload.data.onNotify.message;
      console.log("Notification received:", receivedMessage);
      
      // Sets icon to show new file on ChatLogs page
      setNotificationForCourse(course_id, true);
      
      // Remove row from database
      removeCompletedNotification(course_id);

      // Notify the instructor
      alert(`Chat logs are now available for ${courseName}`);

      // Close WebSocket after receiving the notification
      ws.close();
      console.log("WebSocket connection closed after handling notification");

      // Call the callback function after WebSocket completes
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    ws.close();
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
  };

  // Set a timeout to close the WebSocket if no message is received
  setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
          console.warn("WebSocket timeout reached, closing connection");
          ws.close();
      }
  }, 180000);
};

// course details page
const CourseDetails = () => {
  const location = useLocation();
  const [selectedComponent, setSelectedComponent] = useState(
    "InstructorAnalytics"
  );

  const { courseName, course_id } = useParams();

  const renderComponent = () => {
    switch (selectedComponent) {
      case "InstructorAnalytics":
        return (
          <InstructorAnalytics courseName={courseName} course_id={course_id} />
        );
      case "InstructorEditCourse":
        return (
          <InstructorModules courseName={courseName} course_id={course_id} />
        );
      case "InstructorEditConcepts":
        return (
          <InstructorConcepts
            courseName={courseName}
            course_id={course_id}
            setSelectedComponent={setSelectedComponent}
          />
        );
      case "PromptSettings":
        return <PromptSettings courseName={courseName} course_id={course_id} />;
      case "ViewStudents":
        return <ViewStudents courseName={courseName} course_id={course_id} />;
      case "ChatLogs":
        return <ChatLogs courseName={courseName} course_id={course_id} openWebSocket={openWebSocket} />;
      default:
        return (
          <InstructorAnalytics courseName={courseName} course_id={course_id} />
        );
    }
  };

  return (
    <PageContainer>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        elevation={1}
      >
        <InstructorHeader />
      </AppBar>
      <InstructorSidebar setSelectedComponent={setSelectedComponent} course_id={course_id} selectedComponent={selectedComponent} />
      {renderComponent()}
    </PageContainer>
  );
};

const InstructorHomepage = () => {
  const [rows, setRows] = useState([
    {
      course: "loading...",
      date: "loading...",
      status: "loading...",
      id: "loading...",
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [courseData, setCourseData] = useState([]);  
  const { isInstructorAsStudent } = useContext(UserContext);
  const { setNotificationForCourse } = useNotification();
  const hasFetched = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isInstructorAsStudent) {
      navigate("/");
    }
  }, [isInstructorAsStudent, navigate]);
  // connect to api data
  useEffect(() => {
    if (hasFetched.current) return;

    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken;
        const { email } = await fetchUserAttributes();
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT
          }instructor/courses?email=${encodeURIComponent(email)}`,
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
          setCourseData(data);
          const formattedData = data.map((course) => ({
            course: course.course_name,
            date: new Date().toLocaleDateString(), // REPLACE
            status: course.course_student_access ? "Active" : "Inactive",
            id: course.course_id,
          }));
          setRows(formattedData);
          checkNotificationStatus(data, email, token);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
    hasFetched.current = true;
  }, []);

  const checkNotificationStatus = async (courses, email, token) => {
    for (const course of courses) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}instructor/check_notifications_status?course_id=${encodeURIComponent(course.course_id)}&instructor_email=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: { Authorization: token, "Content-Type": "application/json" },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.completionStatus === true) {
            console.log(`Getting chatlogs for ${course.course_name} is completed. Notifying the user and removing row from database.`);

            // Sets icon to show new file on ChatLogs page
            setNotificationForCourse(course.course_id, true);

            // Remove row from database
            removeCompletedNotification(course.course_id);

            // Notify the Instructor
            alert(`Chat logs are available for course: ${course.course_name}`);

          } else if (data.completionStatus === false) {
            // Reopen WebSocket to listen for notifications
            console.log(`Getting chatlogs for ${course.course_name} is not completed. Re-opening the websocket.`);
            openWebSocket(course.course_name, course.course_id, data.requestId, setNotificationForCourse);
          } else {
            console.log(`Either chatlogs for ${course.course_name} were not requested or instructor already received notification. No need to notify instructor or re-open websocket.`);
          }
        }
      } catch (error) {
        console.error("Error checking notification status for", course.course_id, error);
      }
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRows = rows.filter((row) =>
    row.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (courseName, course_id) => {
    const course = courseData.find(
      (course) => course.course_name.trim() === courseName.trim()
    );

    if (course) {
      const { course_id, course_department, course_number } = course;
      // After – include course_id as a URL parameter
      const path = `/course/${encodeURIComponent(`${course_department} ${course_number} ${courseName.trim()}`)}/${course_id}`;
      navigate(path);

    } else {
      console.error("Course not found!");
    }
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PageContainer>
            <AppBar
              position="fixed"
              sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
              elevation={1}
            >
              <InstructorHeader />
            </AppBar>
            <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
              <Toolbar />
              <Typography
                color="black"
                fontStyle="semibold"
                textAlign="left"
                variant="h6"
              >
                Courses
              </Typography>
              <Paper
                sx={{
                  width: "80%",
                  overflow: "hidden",
                  margin: "0 auto",
                  padding: 2,
                }}
              >
                <TextField
                  label="Search by Course"
                  variant="outlined"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  sx={{ width: "100%", marginBottom: 2 }}
                />
                <TableContainer
                  sx={{
                    width: "100%",
                    maxHeight: "70vh",
                    overflowY: "auto",
                  }}
                >
                  <Table aria-label="course table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: "60%", padding: "16px" }}>
                          Course
                        </TableCell>
                        <TableCell sx={{ width: "20%", padding: "16px" }}>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage
                        )
                        .map((row, index) => (
                          <TableRow
                            key={index}
                            onClick={() => handleRowClick(row.course, row.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <TableCell sx={{ padding: "16px" }}>
                              {titleCase(row.course)}
                            </TableCell>
                            <TableCell sx={{ padding: "16px" }}>
                              <Button
                                variant="contained"
                                color={
                                  row.status === "Active"
                                    ? "primary"
                                    : "secondary"
                                }
                              >
                                {row.status}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TablePagination
                          rowsPerPageOptions={[5, 10, 25]}
                          component="div"
                          count={filteredRows.length}
                          rowsPerPage={rowsPerPage}
                          page={page}
                          onPageChange={handleChangePage}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </PageContainer>
        }
      />
      <Route exact path=":courseName/:course_id/*" element={<CourseDetails openWebSocket={openWebSocket} />} />
      // After
        <Route exact path=":courseName/:course_id/*" element={<CourseDetails openWebSocket={openWebSocket} />} />
        <Route path=":courseName/:course_id/edit-module/:moduleId" element={<InstructorEditCourse />} />
        <Route path=":courseName/:course_id/edit-concept/:conceptId" element={<InstructorEditConcept />} />
        <Route path=":courseName/:course_id/new-module" element={<InstructorNewModule />} />
        <Route path=":courseName/:course_id/new-concept" element={<InstructorNewConcept />} />
        <Route path=":courseName/:course_id/student/:studentId" element={<StudentDetails />} />

    </Routes>
  );
};

export default InstructorHomepage;