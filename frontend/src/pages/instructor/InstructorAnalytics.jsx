import React, { useState, useEffect } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Grid,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";


function courseTitleCase(str) {
  if (typeof str !== 'string') {
    return str;
  }
  const words = str.split(' ');
  return words.map((word, index) => {
    if (index === 0) {
      return word.toUpperCase(); // First word entirely in uppercase
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1); // Only capitalize first letter, keep the rest unchanged
    }
  }).join(' ');
}



function titleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize only the first letter, leave the rest of the word unchanged
    })
    .join(" ");
}

const InstructorAnalytics = ({ courseName, course_id }) => {
  const [value, setValue] = useState(0);
  const [graphData, setGraphData] = useState([]);
  const [data, setData] = useState([]);
  const [maxMessages, setMaxMessages] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
      } else {
          console.error("Failed to remove notification:", response.statusText);
      }
    } catch (error) {
        console.error("Error removing completed notification:", error);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/analytics?course_id=${encodeURIComponent(course_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const analytics_data = await response.json();
          setData(analytics_data);
          const graphDataFormatted = analytics_data.map((module) => ({
            module: module.module_name,
            Messages: module.message_count,
          }));
          setGraphData(graphDataFormatted);
        } else {
          console.error("Failed to fetch analytics:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
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
            if (data.completionStatus === true) {
              // Notify the user
              console.log("Getting chatlogs is completed. Notifying the user and removing row from database.");
              removeCompletedNotification();
              setToastMessage("CSV generation is complete!");
              setToastOpen(true);
            } else if (data.completionStatus === false) {
              // Reopen WebSocket to listen for notifications
              console.log("Getting chatlogs is not completed. Re-opening the websocket.");
              reopenWebSocket(data.requestId);
            } else {
              console.log("Either chatlogs were not requested or instructor already received notification. No need to notify instructor or re-open websocket.");
            }
        } else {
            console.error("Failed to fetch notification status:", response.statusText);
        }
      } catch (error) {
          console.error("Error checking notification status:", error);
      }
    };

    const reopenWebSocket = (requestId) => {
      const wsUrl = constructWebSocketUrl();
      const ws = new WebSocket(wsUrl, "graphql-ws");

      ws.onopen = () => {
        console.log("WebSocket connection re-established");

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
          removeCompletedNotification();

          setToastMessage("CSV generation is complete!");
          setToastOpen(true);

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
    };

    fetchAnalytics();
    checkNotificationStatus();
  }, [course_id]);

  useEffect(() => {
    if (graphData.length > 0) {
      const max = Math.max(...graphData.map((data) => data.Messages));
      setMaxMessages(max);
    }
  }, [graphData]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleCloseToast = () => {
    setToastOpen(false);
  };

  return (
    <Container sx={{ flexGrow: 1, p: 3, marginTop: 9, overflow: "auto" }}>
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
        gutterBottom
      >
        {courseTitleCase(courseName)}
      </Typography>
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseToast} severity="info" sx={{ width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
      <Paper>
        <Box mb={4}>
          <Typography
            color="black"
            textAlign="left"
            paddingLeft={10}
            padding={2}
          >
            Message Count
          </Typography>
          {graphData.length > 0 ? (
            <LineChart
              width={900}
              height={300}
              data={graphData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="module"
                tick={{ fontSize: 12 }}
                tickFormatter={(tick) => titleCase(tick)}
              />
              <YAxis domain={[0, maxMessages + 3]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="Messages"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          ) : (
            <Typography
              variant="h6"
              color="textSecondary"
              textAlign="center"
              padding={4}
            >
              No data found
            </Typography>
          )}
        </Box>
      </Paper>

      <Tabs value={value} onChange={handleChange} aria-label="grade tabs">
        <Tab label="Insights" />
      </Tabs>

      {value === 0 ? (
        data.length > 0 ? (
          <Box mt={2}>
            {data.map((module, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{titleCase(module.module_name)}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box width="100%">
                    <Grid
                      container
                      spacing={1}
                      alignItems="center"
                      direction="column"
                    >
                      <Grid item width="80%">
                        <Typography textAlign="right">
                          Completion Percentage:{" "}
                          {module.perfect_score_percentage.toFixed(2)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={module.perfect_score_percentage}
                        />
                      </Grid>
                      <Grid item>
                        <Typography>Message Count</Typography>
                        <Typography>{module.message_count}</Typography>
                      </Grid>
                      <Grid item>
                        <Typography>Access Count</Typography>
                        <Typography>{module.access_count}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ) : (
          <Typography
            variant="h6"
            color="textSecondary"
            textAlign="center"
            padding={4}
          >
            No insights available
          </Typography>
        )
      ) : null}
    </Container>
  );
};

export default InstructorAnalytics;