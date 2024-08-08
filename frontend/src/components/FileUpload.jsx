import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import DeleteIcon from "@mui/icons-material/Delete";

const FileUpload = () => {
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [additionalContent, setAdditionalContent] = useState("");
  const [files, setFiles] = useState([]);
  const [imagesWithText, setImagesWithText] = useState([]);
  const navigate = useNavigate();
  const { courseName } = useParams();

  const handleFileChange = (event) => {
    setFiles([...files, ...Array.from(event.target.files)]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic here
    console.log("Module Name:", moduleName);
    console.log("Concept:", concept);
    console.log("Additional Content:", additionalContent);
    console.log("Files and images:", files, imagesWithText);
  };

  const handleBackClick = () => {
    navigate(`/course/${courseName}`, {
      state: { courseName, lastVisitedComponent: "InstructorModules" },
    });
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleImageWithTextChange = (index, field, value) => {
    const updatedImages = [...imagesWithText];
    updatedImages[index][field] = value;
    setImagesWithText(updatedImages);
  };

  const handleAddImageWithText = () => {
    setImagesWithText([
      ...imagesWithText,
      { id: Date.now(), image: "", text: "" },
    ]);
  };

  const handleRemoveImageWithText = (id) => {
    const updatedImages = imagesWithText.filter((img) => img.id !== id);
    setImagesWithText(updatedImages);
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
            label="Concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
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
          <Box
            sx={{
              border: 1,
              borderRadius: 3,
              borderColor: "grey.400",
              p: 1,
              marginY: 2,
            }}
          >
            <Typography variant="h6" style={{ marginTop: 16 }} sx={{ p: 1 }}>
              Images with Text
            </Typography>

            {imagesWithText.map((img, index) => (
              <Grid container spacing={2} key={img.id}>
                <Grid item xs={12}>
                  <input
                    type="file"
                    sx={{ paddingLeft: 3 }}
                    onChange={(e) =>
                      handleImageWithTextChange(
                        index,
                        "image",
                        e.target.files[0]
                      )
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Text"
                    value={img.text}
                    onChange={(e) =>
                      handleImageWithTextChange(index, "text", e.target.value)
                    }
                    sx={{ width: "50%" }}
                    margin="normal"
                  />
                  <IconButton onClick={() => handleRemoveImageWithText(img.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddImageWithText}
            >
              Add Another
            </Button>
          </Box>
        </Grid>

        <Grid item xs={6}>
          <Button variant="contained" color="primary" onClick={handleBackClick}>
            Cancel
          </Button>
        </Grid>
        <Grid item xs={6}>
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
