import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageContainer from "../Container";
import {
  Box,
  Typography,
  Divider,
  Switch,
  TextField,
  Button,
  Paper,
} from "@mui/material";

const formatMessages = (messages) => {
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
          return `${speaker}: ${message.message_content.trim()}`; // Remove extra newlines and spaces
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
  const [unenroll, setUnenroll] = useState(false);
  const [chatHistory, setChatHistory] = useState(`
  loading...
  `);
  const textFieldRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/view_student_messages?course_id=${encodeURIComponent(
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
          const formattedMessages = formatMessages(data);
          setChatHistory(formattedMessages);
        } else {
          console.error("Failed to fetch students:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchHistory();
  }, [course_id, student.email]); // Add dependencies for course_id and student.email

  useEffect(() => {
    if (textFieldRef.current) {
      textFieldRef.current.scrollTop = textFieldRef.current.scrollHeight;
    }
  }, [chatHistory]); // Auto-scroll when chatHistory changes

  const handleToggle = () => {
    setUnenroll(!unenroll);
  };

  const handleUnenroll = () => {
    if (unenroll) {
      deleteStudent();
    } else {
      console.log("unenrolling");
      toast.success("Saved Successfully", {
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

  const deleteStudent = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { signInDetails } = await getCurrentUser();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_student?course_id=${encodeURIComponent(
          course_id
        )}&user_email=${encodeURIComponent(
          student.email
        )}&instructor_email=${encodeURIComponent(signInDetails.loginId)}`,
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

  return (
    <>
      <PageContainer>
        <Paper
          sx={{
            width: "100%",
            overflow: "auto",
            marginTop: 4,
            padding: 2,
            overflowY: "scroll",
          }}
        >
          <Box mb={2} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
            <Typography variant="h5">Student Name: {studentId}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1">Email: {student.email}</Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body1">Unenroll from Course:</Typography>
              <Switch checked={unenroll} onChange={handleToggle} />
            </Box>
            <TextField
              label="Chat History"
              variant="outlined"
              fullWidth
              multiline
              rows={10}
              value={chatHistory}
              InputProps={{
                readOnly: true,
              }}
              sx={{ my: 2 }}
              inputRef={textFieldRef} // Attach the ref
            />
            <Button
              onClick={() => {
                handleUnenroll();
              }}
              variant="contained"
              color="primary"
            >
              Save
            </Button>
          </Box>
        </Paper>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </PageContainer>
    </>
  );
};

export default StudentDetails;
