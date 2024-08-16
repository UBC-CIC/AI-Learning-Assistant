import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
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
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

const FileUpload = () => {
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [additionalContent, setAdditionalContent] = useState("");
  const [files, setFiles] = useState([]);
  const [images, setImages] = useState([]);
  const [imagesWithText, setImagesWithText] = useState([]);
  const navigate = useNavigate();
  const { courseName } = useParams();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // todo: encode
  const API_DOC_ENDPOINT =
    "https://jfr5l5l0f5.execute-api.ca-central-1.amazonaws.com/default/getPresignedUrlTest";

  const API_IMG_ENDPOINT =
    "https://b1erczku4c.execute-api.ca-central-1.amazonaws.com/default/getPresignedUrlImages";

  const handleDocUpload = async () => {
    const f = files[0];

    // GET request: presigned URL
    const response = await axios({
      method: "GET",
      url: API_DOC_ENDPOINT,
      params: { fileName: f.name },
    });

    // PUT request: upload file to S3
    const result = await fetch(response.data.uploadURL, {
      method: "PUT",
      body: f["file"],
    });
  };

  const handleImageUpload = async () => {
    const f = files[0];

    // GET request: presigned URL
    const response = await axios({
      method: "GET",
      url: API_IMG_ENDPOINT,
      params: { fileName: f.name },
    });

    // PUT request: upload file to S3
    const result = await fetch(response.data.uploadURL, {
      method: "PUT",
      body: f["file"],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          await handleImageUpload(file);
        } else if (file.type.startsWith("application/")) {
          await handleDocUpload(file);
        } else {
          console.error(`Unsupported file type: ${file.type}`);
        }
      }

      // Add any additional logic needed after uploads
      console.log("All files uploaded successfully");
      toast.success("All files uploaded successfully");
    } catch (error) {
      console.error("Error during file uploads:", error);
      toast.error("Error uploading files.");
    }
  };

  const handleFileChange = (event) => {
    setFiles([...files, ...Array.from(event.target.files)]);
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
                    accept="image/jpeg"
                    type="file"
                    sx={{ paddingLeft: 3 }}
                    onChange={handleFileChange}
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
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </Grid>
      </Grid>
      <ToastContainer />
    </Box>
  );
};

export default FileUpload;
