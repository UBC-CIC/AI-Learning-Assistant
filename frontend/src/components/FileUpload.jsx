import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";

const FileUpload = () => {
  const [moduleName, setModuleName] = useState("");
  const [course, setCourse] = useState("");
  const [additionalContent, setAdditionalContent] = useState("");
  const [files, setFiles] = useState([]);

  const handleFileChange = (event) => {
    setFiles([...files, ...Array.from(event.target.files)]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic here
    console.log("Module Name:", moduleName);
    console.log("Course:", course);
    console.log("Additional Content:", additionalContent);
    console.log("Files:", files);
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ width: "95%", mt: 3, margin: 3 }}
    >
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Module Name"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            variant="outlined"
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            variant="outlined"
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Content"
            value={additionalContent}
            onChange={(e) => setAdditionalContent(e.target.value)}
            variant="outlined"
            multiline
            rows={4}
            required
          />
        </Grid>
        <Typography
          color="black"
          fontStyle="semibold"
          textAlign="left"
          variant="h7"
          mt={3}
          ml={3}
        >
          Add slides
        </Typography>
        <Grid item xs={12}>
          <Card
            variant="outlined"
            component="label"
            sx={{ textAlign: "center", p: 0, cursor: "pointer" }}
          >
            <CardContent>
              <input
                accept="application/pdf"
                type="file"
                multiple
                hidden
                onChange={handleFileChange}
              />
              <IconButton
                color="primary"
                aria-label="upload files"
                component="span"
              >
                <CloudUploadIcon sx={{ fontSize: 40 }} />
              </IconButton>
              <Typography variant="body1" color="textSecondary">
                Click to upload file
              </Typography>
            </CardContent>
          </Card>
          {files.length > 0 && (
            <Box mt={2}>
              <Typography variant="body2">
                <strong>Selected Files:</strong>
              </Typography>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    {file.name}
                    <Button
                      onClick={() => handleRemoveFile(index)}
                      color="error"
                      sx={{ ml: 2 }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </Grid>
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            width="20%"
            sx={{ mt: 2, justifyContent: "left" }}
          >
            Submit
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FileUpload;
