import React, { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  OutlinedInput,
  Chip,
} from "@mui/material";

export const AdminCreateCourse = () => {
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [selectedInstructors, setSelectedInstructors] = useState([]);

  const instructors = [
    { id: 1, name: "Instructor 1" },
    { id: 2, name: "Instructor 2" },
    { id: 3, name: "Instructor 3" },
  ];

  const handleCreate = () => {
    // Handle the create course logic here
    console.log({
      courseName,
      courseDescription,
      selectedInstructors,
    });
  };

  const handleChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedInstructors(
      // On autofill we get a stringified value.
      typeof value === "string" ? value.split(",") : value
    );
  };

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 10 }}>
      <form noValidate autoComplete="off">
        <TextField
          fullWidth
          label="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Course Description"
          value={courseDescription}
          onChange={(e) => setCourseDescription(e.target.value)}
          margin="normal"
          multiline
          rows={4}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel id="instructor-select-label">Instructor</InputLabel>
          <Select
            labelId="instructor-select-label"
            multiple
            value={selectedInstructors}
            onChange={handleChange}
            input={
              <OutlinedInput id="select-multiple-chip" label="Instructors" />
            }
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {instructors.map((instructor) => (
              <MenuItem key={instructor.id} value={instructor.name}>
                {instructor.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreate}
          fullWidth
          sx={{ mt: 2 }}
        >
          CREATE
        </Button>
      </form>
    </Box>
  );
};

export default AdminCreateCourse;
