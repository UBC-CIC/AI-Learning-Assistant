import {
  Typography,
  Box,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  TableFooter,
  TablePagination,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';

// populate with dummy data
const createData = (name, email) => {
  return { name, email };
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

function courseTitleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  const words = str.split(" ");
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toUpperCase();
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
    })
    .join(" ");
}

const initialRows = [createData("loading...", "loading...")];

export const ViewStudents = ({ courseName, course_id }) => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("loading...");
  const [isDownloadButtonEnabled, setIsDownloadButtonEnabled] = useState(false);

  const navigate = useNavigate();

  const constructWebSocketUrl = () => {
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

  const checkNotificationStatus = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/check_notifications_status?course_id=${encodeURIComponent(
          course_id
        )}&instructor_email=${encodeURIComponent(email)}`,
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
        console.log(`Download Chatlogs is ${data.isEnabled}`)
        setIsDownloadButtonEnabled(data.isEnabled);
      } else {
        console.error("Failed to fetch notification status:", response.statusText);
      }
    } catch (error) {
      console.error("Error checking notification status:", error);
    }
  };

  useEffect(() => {
    checkNotificationStatus();
  }, [course_id]);

  const removeCompletedNotification = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const { email } = await fetchUserAttributes();

      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/remove_completed_notification?course_id=${encodeURIComponent(
          course_id
        )}&instructor_email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log("Notification removed successfully.");
        await checkNotificationStatus(); // Refresh button state
      } else {
        console.error("Failed to remove notification:", response.statusText);
      }
    } catch (error) {
      console.error("Error removing completed notification:", error);
    }
  };

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/get_access_code?course_id=${encodeURIComponent(
            course_id
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
          const codeData = await response.json();
          setAccessCode(codeData.course_access_code);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCode();
  }, [course_id]);

  // retrieve analytics data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/view_students?course_id=${encodeURIComponent(course_id)}`,
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
          const formattedData = data.map((student) => {
            return createData(
              `${titleCase(student.first_name)} ${titleCase(
                student.last_name
              )}`,
              student.user_email
            );
          });
          setRows(formattedData);
        } else {
          console.error("Failed to fetch students:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchStudents();
  }, []);

  const fetchCourseMessages = async () => {
    try {
      setIsDownloadButtonEnabled(false);
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const { email } = await fetchUserAttributes();
      const request_id = uuidv4();
  
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}instructor/course_messages`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course_id: course_id,
            instructor_email: email,
            request_id: request_id,
          }),
        }
      );
  
      if (response.ok) {
        console.log(response)
        const data = await response.json();
        console.log("Job submitted successfully:", data);

        // Open WebSocket connection
        const wsUrl = constructWebSocketUrl(); // Function to construct WebSocket URL
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
              data: `{"query":"subscription OnNotify($request_id: String!) { onNotify(request_id: $request_id) { message request_id } }","variables":{"request_id":"${request_id}"}}`,
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

            // TODO: Update UI with the notification (e.g., toast notification, state update)
            removeCompletedNotification();

            // Close WebSocket after receiving the notification
            ws.close();
            console.log("WebSocket connection closed after handling notification");
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          ws.close();
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };

        // Set a timeout to close the WebSocket if no message is received
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.warn("WebSocket timeout reached, closing connection");
            ws.close();
          }
        }, 600000);

      } else {
        console.error("Failed to submit job:", response.statusText);
      }
    } catch (error) {
      console.error("Error submitting job:", error);
    }
  };

  const handleGenerateAccessCode = async () => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken;
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/generate_access_code?course_id=${encodeURIComponent(
          course_id
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const codeData = await response.json();
        setAccessCode(codeData.access_code);
      } else {
        console.error("Failed to fetch courses:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
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
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleRowClick = (student) => {
    navigate(`/course/${course_id}/student/${student.name}`, {
      state: { course_id, student },
    });
  };

  return (
    <div>
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
        <Toolbar />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "170%",
            marginTop: 2,
          }}
        >
          <Typography
            color="black"
            fontStyle="semibold"
            textAlign="left"
            variant="h6"
          >
            {courseTitleCase(courseName)} Students
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              fetchCourseMessages();
            }}
            disabled={!isDownloadButtonEnabled}
          >
            Download Classroom Chatlog
          </Button>
        </Box>
        <Paper sx={{ width: "170%", overflow: "hidden", marginTop: 2 }}>
          <TableContainer sx={{ maxHeight: "50vh", overflowY: "auto" }}>
            <TextField
              label="Search by Student"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ margin: 2, width: "95%", alignContent: "left" }}
            />
            <Table aria-label="student table">
              {!loading ? (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: "50%" }}>Student</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows && filteredRows.length > 0 ? (
                      filteredRows
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage
                        )
                        .map((row, index) => (
                          <TableRow
                            key={index}
                            onClick={() => handleRowClick(row)}
                            style={{ cursor: "pointer" }}
                          >
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.email}</TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No students enrolled in course
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </>
              ) : (
                <>loading...</>
              )}
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
        <Paper
          sx={{
            marginTop: 5,
            marginLeft: 25,
            display: "flex-start",
            p: 5,
            width: "100%",
          }}
        >
          <Typography variant="subtitle1" color="black">
            Access Code: {accessCode}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateAccessCode}
          >
            Generate New Access Code
          </Button>
        </Paper>
      </Box>
    </div>
  );
};

export default ViewStudents;
