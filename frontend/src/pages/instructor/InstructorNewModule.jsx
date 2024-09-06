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
import FileManagement from "../../components/FileManagement";
import ImagesWithText from "../../components/ImagesWithText";
export const InstructorNewModule = ({ courseId }) => {
  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [savedFiles, setSavedFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [metadata, setMetadata] = useState({});


  const [savedImagesWithText, setSavedImagesWithText] = useState([]);
  const [newImagesWithText, setNewImagesWithText] = useState([]);
  const [deletedImagesWithText, setDeletedImagesWithText] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [allConcepts, setAllConcept] = useState([]);
  const location = useLocation();
  const { data, course_id } = location.state || {};
  const [nextModuleNumber, setNextModuleNumber] = useState(data.length + 1);
  const handleBackClick = () => {
    window.history.back();
  };

  function removeFileExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, "");
  }

  const getFileType = (filename) => {
    const parts = filename.split(".");
    if (parts.length > 1) {
      return parts.pop();
    } else {
      return "";
    }
  };

  useEffect(() => {
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
  }, [courseId]);

  const handleInputChange = (e) => {
    setModuleName(e.target.value);
  };

  const handleConceptInputChange = (e) => {
    console.log(e);
    setConcept(e.target.value);
  };
  const uploadFiles = async (newFiles, token, moduleid) => {
    const newFilePromises = newFiles.map((file) => {
      const fileType = getFileType(file.name);
      const fileName = removeFileExtension(file.name);
      return fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/generate_presigned_url?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          moduleid
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
              "Content-Type": file.type,
            },
            body: file,
          });
        });
    });

    return await Promise.all(newFilePromises);
  };

  const uploadImagesWithText = async (newImagesWithText, token, moduleid) => {
    const newFilePromises = newImagesWithText.map((file) => {
      const fileType = getFileType(file.image.name);
      const fileName = removeFileExtension(file.image.name);
      return fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/generate_presigned_url?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          moduleid
        )}&module_name=${encodeURIComponent(
          moduleName
        )}&file_type=${encodeURIComponent(
          fileType
        )}&file_name=${encodeURIComponent(
          fileName
        )}&txt_file_contents=${encodeURIComponent(file.text)}`,
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
          console.log('presignedurl', presignedUrl);
          return fetch(presignedUrl.presignedurl, {
            method: "PUT",
            headers: {
              "Content-Type": file.image.type,
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

    const selectedConcept = allConcepts.find((c) => c.concept_name === concept);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { email } = await fetchUserAttributes();
      console.log(
        "sign in details",
        course_id,
        selectedConcept.concept_id,
        nextModuleNumber,
        moduleName,
        email
      );
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/create_module?course_id=${encodeURIComponent(
          course_id
        )}&concept_id=${encodeURIComponent(
          selectedConcept.concept_id
        )}&module_name=${encodeURIComponent(
          moduleName
        )}&module_number=${encodeURIComponent(
          nextModuleNumber
        )}&instructor_email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        console.error(`Failed to create module`, response.statusText);
        toast.error("Module Creation Failed", {
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
        const updatedModule = await response.json();
        console.log(`Created module ${updatedModule.module_id} successfully.`);
        await uploadFiles(newFiles, token, updatedModule.module_id);
        console.log("to be uploaded", newImagesWithText);
        await uploadImagesWithText(
          newImagesWithText,
          token,
          updatedModule.module_id
        );
        setFiles((prevFiles) =>
          prevFiles.filter((file) => !deletedFiles.includes(file.fileName))
        );
        setSavedFiles((prevFiles) => [...prevFiles, ...newFiles]);
        setSavedImagesWithText((prevImagesWithText) => [
          ...prevImagesWithText,
          ...newImagesWithText,
        ]);
        setNewImagesWithText([]);
        setDeletedImagesWithText([]);
        setDeletedFiles([]);
        setNewFiles([]);
        toast.success("Module Created Successfully", {
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
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
      setTimeout(function () {
        handleBackClick();
      }, 1000);
    }
    setNextModuleNumber(nextModuleNumber + 1);
  };
  return (
    <PageContainer>
      <Paper style={{ padding: 25, width: "100%", overflow: "auto" }}>
        <Typography variant="h6">Create Module </Typography>

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
          setSavedFiles={setSavedFiles}
          loading={loading}
          savedImagesWithText={savedImagesWithText}
          setSavedImagesWithText={setSavedImagesWithText}
          deletedImagesWithText={deletedImagesWithText}
          setDeletedImagesWithText={setDeletedImagesWithText}
          metadata={metadata}
          setMetadata={setMetadata}
        />

        <ImagesWithText
          newImagesWithText={newImagesWithText}
          setNewImagesWithText={setNewImagesWithText}
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

export default InstructorNewModule;
