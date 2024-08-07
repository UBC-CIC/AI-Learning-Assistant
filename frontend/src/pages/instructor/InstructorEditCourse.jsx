import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { TextField, Button, Paper, Typography } from "@mui/material";
import PageContainer from "../Container";

// Sample data (replace)
const sampleModule = {
  id: "1",
  name: "Introduction to Course",
  description: "Overview of the course.",
  content: "This is the content of the module.",
};

const InstructorEditCourse = () => {
  const { courseName, moduleId } = useParams();
  const [module, setModule] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { lastVisitedComponent } = location.state || {};

  const handleBackClick = () => {
    navigate(`/course/${courseName}`, {
      state: { courseName, lastVisitedComponent: "InstructorModules" },
    });
  };

  useEffect(() => {
    // Fetch module data by ID (for now, use the sample data)
    if (moduleId === sampleModule.id) {
      setModule(sampleModule);
    }
  }, [moduleId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setModule({ ...module, [name]: value });
  };

  const handleSave = () => {
    // Save module data (for now, log to console)
    console.log("Module saved:", module);
  };

  if (!module) return <Typography>Loading...</Typography>;

  return (
    <PageContainer>
      <Paper style={{ padding: 16 }}>
        <Typography variant="h6">Edit Module {moduleId} </Typography>
        <TextField
          label="Module Name"
          name="name"
          value={module.name}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          name="description"
          value={module.description}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Content"
          name="content"
          value={module.content}
          onChange={handleInputChange}
          fullWidth
          multiline
          rows={6}
          margin="normal"
        />
        <Button variant="contained" color="primary" onClick={handleBackClick}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave}>
          Save
        </Button>
      </Paper>
    </PageContainer>
  );
};

export default InstructorEditCourse;
