import React, { useEffect, useState, useContext } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Toolbar,
} from "@mui/material";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { toast, ToastContainer } from "react-toastify";
import MobileStepper from "@mui/material/MobileStepper";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { useTheme } from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../App";

const CHARACTER_LIMIT = 1000;
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

const PromptSettings = ({ courseName, course_id }) => {
  const theme = useTheme();
  const [userPrompt, setUserPrompt] = useState("");
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = previousPrompts.length;
  const { isInstructorAsStudent } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isInstructorAsStudent) {
      navigate("/");
    }
  }, [isInstructorAsStudent, navigate]);

  // Function to convert UTC timestamp to local time
  const convertToLocalTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // or use .toLocaleDateString() and .toLocaleTimeString() for custom formatting
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const fetchPreviousPrompts = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/previous_prompts?course_id=${encodeURIComponent(
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
        setPreviousPrompts(data);
      } else {
        console.error("Failed to fetch previous prompts:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching previous prompts:", error);
    }
  };

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/get_prompt?course_id=${encodeURIComponent(course_id)}`,
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
          setUserPrompt(data.system_prompt);
        } else {
          console.error("Failed to fetch prompt:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching prompt:", error);
      }
    };

    fetchPrompt();
    fetchPreviousPrompts();
  }, [course_id]);

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { email } = await fetchUserAttributes();

      // Save current prompt and fetch previous prompts
      const requestBody = {
        prompt: `${userPrompt}`,
      };
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/prompt?course_id=${encodeURIComponent(
          course_id
        )}&instructor_email=${encodeURIComponent(email)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const newPrompt = {
          timestamp: new Date().toISOString(),
          previous_prompt: userPrompt,
        };
        setUserPrompt(data.system_prompt);
        fetchPreviousPrompts();
        toast.success("Prompt Updated successfully", {
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
        console.error("Failed to update prompt:", response.statusText);
        toast.error(`Failed to update prompt: ${response.statusText}`, {
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
      console.error("Error updating prompt:", error);
    }
  };

  return (
    <Container sx={{ maxHeight: "100vh", overflow: "auto", padding: 2 }}>
      <Toolbar />
      <Paper
        sx={{
          width: "100%",
          overflow: "auto",
          marginTop: 4,
          padding: 2,
        }}
      >
        <Box mb={1} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
          <Typography
            color="black"
            fontStyle="semibold"
            textAlign="left"
            variant="h6"
            gutterBottom
          >
            {courseTitleCase(courseName)} Prompt Settings
          </Typography>
          <Typography variant="h8">
            Changes to the prompt will be applied to the LLM for this specific
            course.
          </Typography>
          <Typography variant="h6">
            <br />
            Example
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={`Engage with the student by asking questions and conversing with them to identify any gaps in their understanding of the topic. If you identify gaps, address these gaps by providing explanations, answering the student's questions, and referring to the relevant context to help the student gain a comprehensive understanding of the topic.`}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>

        <Box mb={1} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
          <Typography variant="h6">Your Prompt</Typography>
          <Typography variant="h8">
            Warning:
            <br />
            Modifying the prompt in the text area below can significantly impact
            the quality and accuracy of the responses.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            variant="outlined"
            margin="normal"
            inputProps={{ maxLength: 1000 }}
            helperText={`${userPrompt.length}/${CHARACTER_LIMIT}`}
          />
        </Box>

        <Box mb={1}>
          <Typography variant="h6">Previous Prompts</Typography>
          <MobileStepper
            steps={previousPrompts.length}
            position="static"
            activeStep={activeStep}
            nextButton={
              <Button
                size="small"
                onClick={() => setActiveStep((prev) => prev + 1)}
                disabled={activeStep === previousPrompts.length - 1}
              >
                Next
                <KeyboardArrowRight />
              </Button>
            }
            backButton={
              <Button
                size="small"
                onClick={() => setActiveStep((prev) => prev - 1)}
                disabled={activeStep === 0}
              >
                <KeyboardArrowLeft />
                Back
              </Button>
            }
          />
          <Box sx={{ p: 2 }}>
            {previousPrompts.length === 0 ? (
              <Typography variant="body1">No previous prompts</Typography>
            ) : (
              <>
                <Typography variant="body1">
                  {previousPrompts[activeStep]?.previous_prompt}
                </Typography>
                {convertToLocalTime(previousPrompts[activeStep]?.timestamp) && (
                  <Typography variant="body2">
                    {convertToLocalTime(previousPrompts[activeStep]?.timestamp)}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            width="100%"
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
    </Container>
  );
};
export default PromptSettings;
