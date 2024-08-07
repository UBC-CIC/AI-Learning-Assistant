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
  const [chatHistory, setChatHistory] = useState("Chat history");

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
            rows={4}
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
