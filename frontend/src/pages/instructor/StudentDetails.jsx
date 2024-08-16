import React, { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
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

const StudentDetails = () => {
  const { studentId } = useParams();
  const location = useLocation();
  const { student } = location.state;
  const [unenroll, setUnenroll] = useState(false);
  const [chatHistory, setChatHistory] = useState(`
  24/08/12: 
  Student: Can you explain what data abstraction is?
  LLM: Data abstraction is the process of hiding the details of how data is stored or maintained while providing a simple interface for interacting with that data. 
  Student: So it's like simplifying complex details?
  LLM: Exactly! It allows users to work with data without needing to know the underlying complexities.
  Student: That makes sense! Can you give an example?
  LLM: Sure! Consider a database. When you perform operations like reading or writing data, you don't need to know how the data is physically stored on the disk. The database management system handles all that complexity, and you just interact with the data at a higher level.

  24/08/13:
  Student: I'm still struggling to understand data abstraction in programming. Can you help?
  LLM: Of course! What concepts are you struggling with? 
  `);

  const handleToggle = () => {
    setUnenroll(!unenroll);
  };

  return (
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
          />
          <Button variant="contained" color="primary">
            Save
          </Button>
        </Box>
      </Paper>
    </PageContainer>
  );
};

export default StudentDetails;
