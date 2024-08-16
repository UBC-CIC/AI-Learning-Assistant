import React, { useState, useEffect, useContext, createContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AWS from "aws-sdk";
import {
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Box,
  Toolbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PageContainer from "../Container";

const sampleModule = {
  id: "1",
  name: "Introduction to Course",
  concept: "Overview of the course.",
  content: "This is the content of the module.",
  files: [
    { id: "file1", name: "file1.pdf" },
    { id: "file2", name: "file2.docx" },
  ],
  imagesWithText: [{ id: "img1", image: "", text: "Image description" }],
};

const InstructorEditCourse = () => {
  const { courseName, moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [newFiles, setNewFiles] = useState([]); // new files uploaded
  const [files, setFiles] = useState([]); // existing files already uploaded
  const [imagesWithText, setImagesWithText] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { lastVisitedComponent } = location.state || {};

  const handleBackClick = () => {
    navigate(`/course/${courseName}`, {
      state: { courseName, lastVisitedComponent: "InstructorModules" },
    });
  };

  useEffect(() => {
    if (moduleId === sampleModule.id) {
      setModule(sampleModule);
      setImagesWithText(sampleModule.imagesWithText);
    }
  }, [moduleId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setModule({ ...module, [name]: value });
  };

  const handleFileChange = (e) => {
    setFiles([...files, ...Array.from(event.target.files)]);
  };

  const handleRemoveFile = (fileId) => {
    // Implement file removal logic (API call)
    const updatedFiles = module.files.filter((file) => file.id !== fileId);
    setModule({ ...module, files: updatedFiles });
  };

  const handleRemoveNewFile = (index) => {
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

  const handleSave = () => {
    // Save logic (include new files and images with text)
    console.log("Module saved:", module, newFiles, imagesWithText);
  };

  if (!module) return <Typography>Loading...</Typography>;

  return (
    <PageContainer>
      <Paper style={{ padding: 25, width: "100%", overflow: "auto" }}>
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
          label="Concept"
          name="concept"
          value={module.concept}
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

        <Box sx={{ border: 1, borderRadius: 3, borderColor: "grey.400", p: 1 }}>
          <Typography variant="h6" sx={{ p: 1 }}>
            Existing Files
          </Typography>
          {module.files.map((file) => (
            <div key={file.id}>
              <Typography variant="body2">{file.name}</Typography>
              <IconButton onClick={() => handleRemoveFile(file.id)}>
                <DeleteIcon />
              </IconButton>
            </div>
          ))}
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
                  onChange={(e) => handleFileUpload(e.target.files)}
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
                        onClick={() => handleRemoveNewFile(index)}
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
        </Box>

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
                  sx={{ paddingLeft: 10 }}
                  onChange={(e) =>
                    handleImageWithTextChange(index, "image", e.target.files[0])
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
            sx={{ margin: 2 }}
          >
            Add Another
          </Button>
        </Box>

        <Grid container spacing={2} style={{ marginTop: 16 }}>
          <Grid item xs={6}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBackClick}
              width="30%"
              justifyContent="left"
            >
              Cancel
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              width="30%"
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </PageContainer>
  );
};

export default InstructorEditCourse;
