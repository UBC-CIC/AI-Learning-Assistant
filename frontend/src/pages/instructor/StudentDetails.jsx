import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { toast, ToastContainer } from "react-toastify";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "react-toastify/dist/ReactToastify.css";
import PageContainer from "../Container";
import {
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const handleBackClick = () => {
  window.history.back();
};

const formatMessages = (messages) => {
  // Define the specific message to highlight
  const masteryMessage =
    "Congratulations! You have achieved competency over this module! Please try other modules to continue your learning journey! :)";

  // Helper function to format date as YY/MM/DD
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date
      .toLocaleDateString(undefined, {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
    const date = formatDate(message.time_sent);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {});

  // Format the grouped messages
  const formattedMessages = Object.keys(groupedMessages)
    .map((date) => {
      const messagesForDate = groupedMessages[date]
        .map((message) => {
          const speaker = message.student_sent ? "Student" : "LLM";
          const messageContent = message.message_content.trim();
          // Check for the specific LLM message to highlight
          const formattedMessage =
            !message.student_sent && messageContent === masteryMessage
              ? `STUDENT ACHIEVED COMPETENCY\n${speaker}: ${messageContent}`
              : `${speaker}: ${messageContent}`;
          return formattedMessage;
        })
        .join("\n");

      return `${date}:\n${messagesForDate}`;
    })
    .join("\n\n");

  return formattedMessages;
};

const StudentDetails = () => {
  const { studentId } = useParams();
  const location = useLocation();
  const { course_id, student } = location.state;
  const textFieldRef = useRef(null);
  const [tabs, setTabs] = useState([]);
  const [sessions, setSessions] = useState({
    "Tab 1": [
      {
        sessionName: "Session 1",
        messages: [
          {
            student_sent: true,
            message_content: "Hello!",
            time_sent: "2024-09-25T14:48:00.000Z",
          },
          {
            student_sent: false,
            message_content: "Hi there!",
            time_sent: "2024-09-25T14:50:00.000Z",
          },
        ],
      },
      {
        sessionName: "Session 2",
        messages: [
          {
            student_sent: true,
            message_content: "How are you?",
            time_sent: "2024-09-26T10:30:00.000Z",
          },
          {
            student_sent: false,
            message_content: "Doing well, thanks!",
            time_sent: "2024-09-26T10:32:00.000Z",
          },
        ],
      },
    ],
    "Tab 2": [
      {
        sessionName: "Session 3",
        messages: [
          {
            student_sent: true,
            message_content: "What is the next task?",
            time_sent: "2024-09-27T08:15:00.000Z",
          },
          {
            student_sent: false,
            message_content: "The next task is to complete module 3.",
            time_sent: "2024-09-27T08:20:00.000Z",
          },
        ],
      },
    ],
  });
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/student_modules_messages?course_id=${encodeURIComponent(
            course_id
          )}&student_email=${encodeURIComponent(student.email)}`,
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
          setSessions(data);
          setTabs(Object.keys(data));
        } else {
          console.error("Failed to fetch students:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchHistory();
  }, [course_id, student.email]);

  useEffect(() => {
    if (textFieldRef.current) {
      textFieldRef.current.scrollTop = textFieldRef.current.scrollHeight;
    }
  }, [sessions]);

  const handleUnenroll = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_student?course_id=${encodeURIComponent(
          course_id
        )}&user_email=${encodeURIComponent(
          student.email
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
        toast.success("Student unenrolled successfully", {
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
          handleBackClick();
        }, 1000);
      } else {
        console.error("Failed to fetch students:", response.statusText);
        toast.error("Failed to unenroll student", {
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
      console.error("Error fetching data:", error);
    }
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <PageContainer>
        <IconButton
          onClick={handleBackClick}
          sx={{ position: "absolute", top: 44, left: 30 }}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Paper
          sx={{
            width: "100%",
            overflow: "auto",
            padding: 2,
            overflowY: "scroll",
          }}
        >
          <Box mb={2} sx={{ flexGrow: 1, p: 3, textAlign: "left", mt: 6 }}>
            <Typography variant="h5">Student Name: {studentId}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ mb: 4 }} variant="body1">
              Email: {student.email}
            </Typography>

            {/* Unenroll Button */}
            <Button
              onClick={handleDialogOpen} // Open dialog on button click
              sx={{ marginBottom: 6 }}
              variant="contained"
              color="primary"
            >
              Unenroll Student
            </Button>

            {/* Dialog Component */}
            <Dialog
              open={dialogOpen}
              onClose={handleDialogClose}
              aria-labelledby="confirm-unenroll-dialog"
            >
              <DialogTitle id="confirm-unenroll-dialog">
                Confirm Unenroll
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to unenroll the student from this
                  course?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDialogClose} color="primary">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleDialogClose();
                    handleUnenroll(); // Call unenroll function on confirm
                  }}
                  color="red"
                >
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>

            <Typography variant="h5" sx={{ mb: 2 }}>
              Chat History:
            </Typography>

            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                overflowX: "auto",
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabs.map((tabName, index) => (
                  <Tab key={index} label={tabName} />
                ))}
              </Tabs>
            </Box>

            {/* Render accordion for each session */}
            {sessions[tabs[activeTab]]?.length > 0 ? (
              sessions[tabs[activeTab]].map((session, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{session.sessionName}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      label="Chat History"
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={10}
                      value={formatMessages(session.messages)}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{ my: 2 }}
                      inputRef={textFieldRef}
                    />
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography sx={{ ml: 2, mt: 4 }} variant="body1">
                Student has not entered the module yet.
              </Typography>
            )}
          </Box>
        </Paper>
      </PageContainer>
      <ToastContainer />
    </>
  );
};

export default StudentDetails;
