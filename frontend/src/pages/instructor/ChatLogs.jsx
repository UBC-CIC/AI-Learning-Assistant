import {
  Typography,
  Box,
  Toolbar,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';

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

export const ChatLogs = ({ courseName, course_id }) => {
  const [loading, setLoading] = useState(false);
  const [isDownloadButtonEnabled, setIsDownloadButtonEnabled] = useState(false);
  const [previousChatLogs, setPreviousChatLogs] = useState([]);

  useEffect(() => {
      checkNotificationStatus();
      fetchChatLogs();
      
      // Auto-refresh logs every 5 minutes since presigned URLs expire
      const interval = setInterval(fetchChatLogs, 5 * 60 * 1000);
      return () => clearInterval(interval);
  }, [course_id]);

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
              `${import.meta.env.VITE_API_ENDPOINT
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

  const removeCompletedNotification = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const { email } = await fetchUserAttributes();

        const response = await fetch(
            `${import.meta.env.VITE_API_ENDPOINT
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

  const fetchChatLogs = async () => {
    try {
        setLoading(true);
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const { email } = await fetchUserAttributes();

        const response = await fetch(
              `${import.meta.env.VITE_API_ENDPOINT}instructor/fetch_chatlogs?course_id=${encodeURIComponent(course_id)}&instructor_email=${encodeURIComponent(email)}`,
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
            console.log("Chat logs fetched:", data);
            if (data.log_files) {
                const formattedLogs = Object.entries(data.log_files).map(([fileName, presignedUrl]) => ({
                    date: fileName, // Using file name as the date
                    presignedUrl: presignedUrl,
                }));
                setPreviousChatLogs(formattedLogs);
            } else {
                setPreviousChatLogs([]);
            }
        } else {
            console.error("Failed to fetch chat logs:", response.statusText);
        }
    } catch (error) {
        console.error("Error fetching chat logs:", error);
    } finally {
        setLoading(false);
    }
  };

  const downloadChatLog = (presignedUrl) => {
    try {
        console.log("Downloading file from:", presignedUrl);
        window.open(presignedUrl, "_blank");
    } catch (error) {
        console.error("Error downloading file:", error);
    }
};

  const generateCourseMessages = async () => {
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

        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);

          // Handle notification
          if (message.type === "data" && message.payload?.data?.onNotify) {
            const receivedMessage = message.payload.data.onNotify.message;
            console.log("Notification received:", receivedMessage);

            // TODO: Update UI with the notification (e.g., toast notification, state update)
            removeCompletedNotification();
                      
            // Refresh chat logs once the new log file is created
            await fetchChatLogs();

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
        }, 180000);

      } else {
        console.error("Failed to submit job:", response.statusText);
      }
    } catch (error) {
      console.error("Error submitting job:", error);
    }
  };


  return (
      <div>
        <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
            <Toolbar />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 2 }}>
                <Typography color="black" fontStyle="semibold" textAlign="left" variant="h6">
                    {courseName} Chat Logs
                </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}> {/**/}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={generateCourseMessages}
                        disabled={!isDownloadButtonEnabled}
                    >
                        Generate Classroom Chatlogs
                    </Button>
                  </Box>
            </Box>
            <Paper sx={{ width: "100%", marginTop: 2, p: 3 }}>
                <Typography variant="body1" color="textSecondary">
                    {isDownloadButtonEnabled ? "Click the button to generate chat logs" : "Chat log generation in progress. Please wait..."}
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{ 
                    marginTop: 2,
                    flexGrow: 1, // Allows the table to take up remaining vertical space
                    height: "calc(100vh - 270px)", // Dynamically calculate the height
                    overflowY: "auto", // Enable vertical scrolling
                  }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Download</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {previousChatLogs.length > 0 ? (
                                previousChatLogs.map((log, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{log.date}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={() => downloadChatLog(log.presignedUrl)}
                                            >
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} align="center">No chat logs available.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
      </div>
  );
};

export default ChatLogs;