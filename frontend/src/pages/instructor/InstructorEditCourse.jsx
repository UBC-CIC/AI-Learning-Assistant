import React, { useState, useEffect, useContext, createContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AWS from "aws-sdk";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PageContainer from "../Container";

const InstructorEditCourse = () => {
  const { courseName, moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [newFiles, setNewFiles] = useState([]); // new files uploaded
  const [files, setFiles] = useState([]); // existing files already uploaded
  const [imagesWithText, setImagesWithText] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { moduleData, course_id } = location.state || {};
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [allConcepts, setAllConcept] = useState([]);
  const handleBackClick = () => {
    window.history.back();
  };

  function removeFileExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, '');
  }
  const handleDownloadFile = (file) => {
    const url = window.URL.createObjectURL(new Blob([file]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", file.name);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  useEffect(() => {
    console.log(files);
  }, [files]);

  useEffect(() => {
    console.log(imagesWithText);
  }, [imagesWithText]);

  useEffect(() => {
    if (moduleData) {
      setModule(moduleData);
      setModuleName(moduleData.module_name);
      setConcept(moduleData.concept_name);
    }
    const fetchConcepts = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/view_concepts?course_id=${encodeURIComponent(course_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const conceptData = await response.json();
          setAllConcept(conceptData);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchConcepts();
  }, [moduleData]);

  const handleDelete = async () => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_module?module_id=${encodeURIComponent(
          module.module_id
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        toast.success("Successfully Deleted", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        setTimeout(function () {
          handleBackClick();
        }, 1000);
      } else {
        console.error("Failed to delete module");
        toast.error("Failed to delete module", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Failed to delete module");
      toast.error("Failed to delete module", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };
  const handleInputChange = (e) => {
    setModuleName(e.target.value);
  };

  const handleConceptInputChange = (e) => {
    console.log(e);
    setConcept(e.target.value);
  };

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event);
    const existingFileNames = files.map((file) => file.name);

    // Filter out files with names that already exist
    const newFiles = uploadedFiles.filter(
      (file) => !existingFileNames.includes(file.name)
    );

    if (newFiles.length < uploadedFiles.length) {
      toast.error("Some files were not uploaded because they already exist.", {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }

    setFiles([...files, ...newFiles]);
    console.log(newFiles);
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    const { email } = await fetchUserAttributes();
    // Assuming 'files' is an array of file objects with the necessary properties
    for (const file of newFiles) {
      const fileType = getFileType(file.name);
      const fileName = removeFileExtension(file.name);
      console.log(fileName)
      console.log(fileType);
      console.log(course_id)
      console.log(module.module_id)
      console.log(moduleName)
      await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/generate_presigned_url?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&module_name=${encodeURIComponent(
          moduleName
        )}&file_type=${encodeURIComponent(
          fileType
        )}&file_name=${encodeURIComponent(fileName)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      )
        .then((response) => {
          console.log("url", response);
          fetch(`${response.body.presignedurl}`, {
            method: "PUT",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: file,
          });
        })
        .then((response) => {
          console.log(response);
        })
        .catch((err) => {
          toast.error("Module failed to update", {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
          });
        });
    }
  };

  const handleRemoveFile = (file_name) => {
    const updatedFiles = files.filter((file) => file.name !== file_name);
    setFiles(updatedFiles);
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

  const getFileType = (filename) => {
    // Get the file extension by splitting the filename on '.' and taking the last part
    const parts = filename.split(".");

    // Check if there's at least one '.' in the filename and return the last part
    if (parts.length > 1) {
      return parts.pop();
    } else {
      return ""; // Return an empty string if there's no file extension
    }
  };

  const handleSave = async () => {
    const selectedConcept = allConcepts.find((c) => c.concept_name === concept);
    console.log(
      "Module saved:",
      module,
      selectedConcept,
      files,
      imagesWithText
    );
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/edit_module?module_id=${encodeURIComponent(
          module.module_id
        )}&instructor_email=${encodeURIComponent(
          email
        )}&concept_id=${encodeURIComponent(selectedConcept.concept_id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            module_name: moduleName,
          }),
        }
      );
      if (response.ok) {
        toast.success("Module updated successfully", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } else {
        toast.error("Module failed to update", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  if (!module) return <Typography>Loading...</Typography>;

  return (
    <PageContainer>
      <Paper style={{ padding: 25, width: "100%", overflow: "auto" }}>
        <Typography variant="h6">Edit Module {module.module_name} </Typography>

        <TextField
          label="Module Name"
          name="name"
          value={moduleName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 50 }}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel id="concept-select-label">Concept</InputLabel>
          <Select
            labelId="concept-select-label"
            id="concept-select"
            value={concept}
            onChange={handleConceptInputChange}
            label="Concept"
            sx={{ textAlign: "left" }}
          >
            {allConcepts.map((concept) => (
              <MenuItem key={concept.concept_id} value={concept.concept_name}>
                {concept.concept_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ border: 1, borderRadius: 3, borderColor: "grey.400", p: 1 }}>
          <Typography variant="h6" sx={{ p: 1 }}>
            Existing Files
          </Typography>
          {files.map((file) => (
            <div key={file.id}>
              <Typography variant="body2">{file.name}</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleDownloadFile(file)}
              >
                Download
              </Button>
              <IconButton onClick={() => handleRemoveFile(file.name)}>
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
                  accept=".pdf,.docx,.pptx,.txt,.xlsx,.xps,.mobi,.cbz"
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
                  accept=".bmp,.eps,.gif,.icns,.ico,.im,.jpeg,.jpg,.j2k,.jp2,.msp,.pcx,.png,.ppm,.pgm,.pbm,.sgi,.tga,.tiff,.tif,.webp,.xbm"
                  style={{ paddingLeft: 10 }}
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
          <Grid item xs={4}>
            <Box display="flex" gap={6}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackClick}
                sx={{ width: "30%" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDelete}
                sx={{ width: "30%" }}
              >
                Delete
              </Button>
            </Box>
          </Grid>
          <Grid item xs={4}></Grid>
          <Grid item xs={4}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              style={{ width: "30%" }}
            >
              Save
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </PageContainer>
  );
};

export default InstructorEditCourse;
