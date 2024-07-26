import React, { useState } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Chip,
  Typography,
  OutlinedInput,
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
    setSelectedInstructors(event.target.value);
  };

  const inputStyles = {
    width: "100%",
    margin: "8px 0",
    padding: "8px",
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    color: "black",
  };

  const labelStyles = {
    marginBottom: "3px",
    display: "block",
    textAlign: "left",
    color: "#000",
    mx: "left",
  };

  console.log(selectedInstructors);
  return (
    <Box sx={{ maxWidth: 500, mx: "left", mt: 7, p: 4 }}>
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
      >
        Create a new course
      </Typography>
      <form noValidate autoComplete="off">
        <TextField
          fullWidth
          label="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          margin="normal"
          backgroundColor="default"
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
        <FormControl fullWidth sx={{ marginBottom: 2, marginTop: 2 }}>
          <InputLabel id="select-instructors-label">
            Assign Instructors
          </InputLabel>
          <Select
            labelId="select-instructors-label"
            multiple
            value={selectedInstructors}
            onChange={handleChange}
            input={
              <OutlinedInput
                id="select-multiple-chip"
                label="Assign Instructors"
              />
            }
            renderValue={(selected) => (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  backgroundColor: "transparent",
                  color: "black",
                }}
              >
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
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.5,
            backgroundColor: "transparent",
            color: "black",
          }}
        >
          {selectedInstructors.map((value) => (
            <Chip key={value} label={value} />
          ))}
        </Box>
        {/* <div>
          <label style={labelStyles}>
            Assign Instructors:
            <select
              multiple
              value={selectedInstructors}
              onChange={handleChange}
              style={inputStyles}
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.name}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            margin: "8px 0",
            backgroundColor: "transparent",
            color: "black",
          }}
        >
          {selectedInstructors.map((value) => (
            <Chip key={value} label={value} />
          ))}
        </div> */}
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
