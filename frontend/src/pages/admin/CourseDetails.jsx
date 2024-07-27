import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Switch,
  Typography,
  Paper,
  FormControlLabel,
  Toolbar,
  Divider,
} from "@mui/material";

// Dummy data
const allInstructors = [
  "John Doe",
  "Jane Smith",
  "Bob Johnson",
  "Alice Williams",
  "Michael Brown",
];

const CourseDetails = ({ courseName, onBack }) => {
  const [activeInstructors, setActiveInstructors] = useState([
    "John Doe",
    "Jane Smith",
  ]);
  const [isActive, setIsActive] = useState(true);

  const handleInstructorsChange = (event) => {
    setActiveInstructors(event.target.value);
  };

  const handleStatusChange = (event) => {
    setIsActive(event.target.checked);
  };

  const handleSave = () => {
    // Save logic
    console.log("Course Details Saved");
  };

  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, p: 3, marginTop: 1, textAlign: "left" }}
    >
      <Toolbar />
      <Paper sx={{ padding: 2, marginBottom: 2 }}>
        <Typography variant="h4" sx={{ marginBottom: 0 }}>
          {courseName}
        </Typography>
        <Divider sx={{ p: 1, marginBottom: 3 }} />
        <FormControl fullWidth sx={{ marginBottom: 2 }}>
          <InputLabel id="select-instructors-label">
            Active Instructors
          </InputLabel>
          <Select
            labelId="select-instructors-label"
            multiple
            value={activeInstructors}
            onChange={handleInstructorsChange}
            input={
              <OutlinedInput
                id="select-multiple-chip"
                label="Active Instructors"
              />
            }
            renderValue={(selected) => (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                }}
              >
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {allInstructors.map((instructor) => (
              <MenuItem key={instructor} value={instructor}>
                {instructor}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={isActive} onChange={handleStatusChange} />}
          label={isActive ? "Active" : "Inactive"}
        />
      </Paper>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Button variant="contained" onClick={onBack} sx={{ width: "30%" }}>
            Back
          </Button>
        </Grid>
        <Grid item xs={6} sx={{ textAlign: "right" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ width: "30%" }}
          >
            Save
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CourseDetails;
