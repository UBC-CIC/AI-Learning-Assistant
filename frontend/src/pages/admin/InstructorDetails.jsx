import React, { useState } from "react";
import {
  Typography,
  Box,
  Toolbar,
  Paper,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  OutlinedInput,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
} from "@mui/material";

// populate with all available courses
const allCourses = ["Course 1", "Course 2", "Course 3", "Course 4", "Course 5"];

//populate with dummy data
const dummyData = {
  "John Doe": {
    email: "john.doe@example.com",
    activeCourses: ["Course 1", "Course 2"],
    status: "Active",
  },
  "Jane Smith": {
    email: "jane.smith@example.com",
    activeCourses: ["Course 3"],
    status: "Inactive",
  },
  "Bob Johnson": {
    email: "bob.johnson@example.com",
    activeCourses: ["Course 4", "Course 5", "Course 6"],
    status: "Active",
  },
};

const InstructorDetails = ({ instructorName, onBack }) => {
  const instructor = dummyData[instructorName];
  const [activeCourses, setActiveCourses] = useState(instructor.activeCourses);
  const [status, setStatus] = useState(instructor.status === "Active");

  if (!instructor) {
    return <Typography>No data found for this instructor.</Typography>;
  }

  const handleCoursesChange = (event) => {
    setActiveCourses(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.checked);
  };

  const handleSave = () => {
    // Add save logic here
    console.log("Instructor Details Saved");
  };

  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, p: 3, marginTop: 1, textAlign: "left" }}
    >
      <Toolbar />
      <Paper sx={{ p: 2, marginBottom: 4, textAlign: "left" }}>
        <Typography variant="h5" sx={{ marginBottom: 2, p: 1 }}>
          Instructor: {instructorName}
        </Typography>
        <Divider sx={{ p: 1, marginBottom: 3 }} />
        <Typography variant="h7" sx={{ marginBottom: 1, p: 1 }}>
          Email: {instructor.email}
        </Typography>
        <FormControl sx={{ width: "100%", marginBottom: 2, marginTop: 5 }}>
          <InputLabel id="active-courses-label">Active Courses</InputLabel>
          <Select
            labelId="active-courses-label"
            multiple
            value={activeCourses}
            onChange={handleCoursesChange}
            input={
              <OutlinedInput id="select-multiple-chip" label="Active Courses" />
            }
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {allCourses.map((course) => (
              <MenuItem key={course} value={course}>
                {course}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={status} onChange={handleStatusChange} />}
          label={status ? "Active" : "Inactive"}
        />
      </Paper>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Button
            variant="contained"
            onClick={onBack}
            sx={{ width: "30%", mx: "left" }}
          >
            Back
          </Button>
        </Grid>
        <Grid item xs={6} container justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ width: "30%", mx: "right" }}
          >
            Save
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InstructorDetails;
