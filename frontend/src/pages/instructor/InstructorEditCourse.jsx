import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

import {
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import PageContainer from "../Container";
import ImagesWithText from "../../components/ImagesWithText";
import FileManagement from "../../components/FileManagement";

const InstructorEditCourse = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [savedFiles, setSavedFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);

  const [imagesWithText, setImagesWithText] = useState([]);
  const [savedImagesWithText, setSavedImagesWithText] = useState([]);
  const [newImagesWithText, setNewImagesWithText] = useState([]);

  const location = useLocation();
  const [module, setModule] = useState(null);
  const { moduleData, course_id } = location.state || {};
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [allConcepts, setAllConcept] = useState([]);
  const handleBackClick = () => {
    window.history.back();
  };

  useEffect(() => {
    console.log(files);
  }, [files]);

  function convertDocumentFilesToArray(files) {
    const documentFiles = files.document_files;
    const resultArray = Object.entries(documentFiles).map(
      ([fileName, url]) => ({
        fileName,
        url,
      })
    );
    return resultArray;
  }

  function removeFileExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, "");
  }
  const fetchFiles = async () => {
    try {
      const { token, email } = await getAuthSessionAndEmail();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/get_all_files?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&module_name=${encodeURIComponent(moduleName)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const fileData = await response.json();
        setFiles(convertDocumentFilesToArray(fileData));
      } else {
        console.error("Failed to fetch files:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching Files:", error);
    }
    setLoading(false);
  };

  const fetchConcepts = async () => {
    try {
      const { token, email } = await getAuthSessionAndEmail();
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

  useEffect(() => {
    if (moduleData) {
      setModule(moduleData);
      setModuleName(moduleData.module_name);
      setConcept(moduleData.concept_name);
    }
    fetchConcepts();
  }, [moduleData]);

  useEffect(() => {
    if (module) {
      fetchFiles();
    }
  }, [module]);

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

  const updateModule = async () => {
    const selectedConcept = allConcepts.find((c) => c.concept_name === concept);
    const { token, email } = await getAuthSessionAndEmail();

    const editModuleResponse = await fetch(
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

    if (!editModuleResponse.ok) {
      throw new Error(editModuleResponse.statusText);
    }

    return editModuleResponse;
  };

  const deleteFiles = async (deletedFiles, token) => {
    const deletedFilePromises = deletedFiles.map((file_name) => {
      const fileType = getFileType(file_name);
      const fileName = removeFileExtension(file_name);
      return fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_file?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&module_name=${encodeURIComponent(
          moduleName
        )}&file_type=${encodeURIComponent(
          fileType
        )}&file_name=${encodeURIComponent(fileName)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
    });

    return await Promise.all(deletedFilePromises);
  };

  const uploadFiles = async (newFiles, token) => {
    const newFilePromises = newFiles.map((file) => {
      const fileType = getFileType(file.name);
      const fileName = removeFileExtension(file.name);
      return fetch(
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
        .then((response) => response.json())
        .then((presignedUrl) => {
          return fetch(presignedUrl.presignedurl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/pdf",
            },
            body: file,
          });
        });
    });

    return await Promise.all(newFilePromises);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double clicking
    setIsSaving(true);
    try {
      await updateModule();
      const { token } = await getAuthSessionAndEmail();
      await deleteFiles(deletedFiles, token);
      await uploadFiles(newFiles, token);

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

      setFiles((prevFiles) =>
        prevFiles.filter((file) => !deletedFiles.includes(file.fileName))
      );
      setSavedFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setDeletedFiles([]);
      setNewFiles([]);
    } catch (error) {
      console.error("Error fetching courses:", error);
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
    } finally {
      setIsSaving(false); // Reset the state after save operation is complete
    }
  };

  const getAuthSessionAndEmail = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    const { email } = await fetchUserAttributes();
    return { token, email };
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

        <FileManagement
          newFiles={newFiles}
          setNewFiles={setNewFiles}
          files={files}
          setFiles={setFiles}
          setDeletedFiles={setDeletedFiles}
          savedFiles={savedFiles}
          loading={loading}
        />

        <ImagesWithText
          imagesWithText={imagesWithText}
          setImagesWithText={setImagesWithText}
          savedImagesWithText={savedImagesWithText}
          setSavedImagesWithText={setSavedImagesWithText}
          newImagesWithText={newImagesWithText}
          setNewImagesWithText={setNewImagesWithText}
          loading={loading}
        />

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
