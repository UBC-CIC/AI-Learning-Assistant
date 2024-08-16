import React, { useState } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Toolbar,
} from "@mui/material";

const PromptSettings = ({ courseName, course_id }) => {
  const [userPrompt, setUserPrompt] = useState("");

  const handleSave = () => {
    // Logic to save the user's prompt
    console.log("User prompt saved:", userPrompt);
  };

  return (
    <Container overflow="auto">
      <Toolbar />
      <Paper
        sx={{
          width: "100%",
          overflow: "auto",
          marginTop: 4,
          padding: 2,
          overflowY: "scroll",
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
            {courseName} Prompt Settings
          </Typography>
          <Typography variant="h8">
            Changes to the prompt will be applied to the LLM for this specific
            course.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={`client = anthropic.Client(api_key="YOUR_API_KEY")
            response = client.messages.create(
                model="claude-2.1",
                system="Respond only in Spanish.", # <-- system prompt
                messages=[
                    {"role": "user", "content": "Hello, Claude!"} # <-- user prompt
                ]
            )
            print(response.message)`}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>

        <Box mb={1} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
          <Typography variant="h6">Your Prompt</Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            variant="outlined"
            margin="normal"
          />
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
    </Container>
  );
};

export default PromptSettings;
