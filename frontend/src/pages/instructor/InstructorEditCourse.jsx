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

const InstructorEditCourse = () => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metadata, setMetadata] = useState({});

  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [savedFiles, setSavedFiles] = useState([]);
  const [deletedFiles, setDeletedFiles] = useState([]);

  const location = useLocation();
  const [module, setModule] = useState(null);
  const { moduleData, course_id } = location.state || {};
  const [moduleName, setModuleName] = useState("");
  const [concept, setConcept] = useState("");
  const [allConcepts, setAllConcept] = useState([]);

  useEffect(() => {
    console.log(metadata);
  }, [metadata]);
  const handleBackClick = () => {
    window.history.back();
  };

  function convertDocumentFilesToArray(files) {
    const documentFiles = files.document_files;
    const imageFiles = files.image_files;
    console.log("imagefiles", imageFiles);
    const resultArray = Object.entries({
      ...documentFiles,
      ...imageFiles,
    }).map(([fileName, url]) => ({
      fileName,
      url,
    }));

    const metadata = resultArray.reduce((acc, { fileName, url }) => {
      acc[fileName] = url.metadata;
      return acc;
    }, {});

    setMetadata(metadata);
    console.log("res", resultArray, metadata);
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
        console.log("filedata", fileData);
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
      const token = session.tokens.idToken.toString();
      const s3Response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_module_s3?course_id=${encodeURIComponent(
          course_id
        )}&module_id=${encodeURIComponent(
          module.module_id
        )}&module_name=${encodeURIComponent(module.module_name)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!s3Response.ok) {
        throw new Error("Failed to delete module from S3");
      }
      const moduleResponse = await fetch(
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

      if (moduleResponse.ok) {
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
        setTimeout(() => {
          handleBackClick();
        }, 1000);
      } else {
        throw new Error("Failed to delete module");
      }
    } catch (error) {
      console.error(error.message);
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
    setConcept(e.target.value);
  };
  const getFileType = (filename) => {
    // Get the file extension by splitting the filename on '.' and taking the last part
    const parts = filename.split(".");

    // Check if there's at least one '.' in the filename and return the last part
    if (parts.length > 1) {
      return parts.pop();
    } else {
      return "";
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
  };

  const uploadFiles = async (newFiles, token) => {
    const successfullyUploadedFiles = [];

    const newFilePromises = newFiles.map(async (file) => {
      const fileType = getFileType(file.name);
      const fileName = removeFileExtension(file.name);

      try {
        const response = await fetch(
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
        );

        if (!response.ok) {
          throw new Error("Failed to fetch presigned URL");
        }

        const presignedUrl = await response.json();
        const uploadResponse = await fetch(presignedUrl.presignedurl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        // Add file to the successful uploads array
        successfullyUploadedFiles.push(file);
      } catch (error) {
        console.error(error.message);
      }
    });

    // Wait for all uploads to complete
    await Promise.all(newFilePromises);

    // Update state with successfully uploaded files
    setSavedFiles((prevFiles) => [...prevFiles, ...successfullyUploadedFiles]);
  };

  const handleSave = async () => {
    if (isSaving) return; // Prevent double clicking
    setIsSaving(true);
    try {
      await updateModule();
      const { token } = await getAuthSessionAndEmail();
      await deleteFiles(deletedFiles, token);
      await uploadFiles(newFiles, token);
      await updateMetaData(files, token);
      await updateMetaData(savedFiles, token);
      setFiles((prevFiles) =>
        prevFiles.filter((file) => !deletedFiles.includes(file.fileName))
      );

      setDeletedFiles([]);
      setNewFiles([]);
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
      setIsSaving(false);
    }
  };

  const updateMetaData = (files, token) => {
    console.log(files);
    files.forEach((file) => {
      console.log(file);
      const fileNameWithExtension =
        file.fileName || file.name || file.image.name;
      const fileMetadata = metadata[fileNameWithExtension] || "";
      const fileName = removeFileExtension(fileNameWithExtension);
      const fileType = getFileType(fileNameWithExtension);
      return fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/update_metadata?&module_id=${encodeURIComponent(
          module.module_id
        )}&filename=${encodeURIComponent(
          fileName
        )}&filetype=${encodeURIComponent(fileType)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ metadata: fileMetadata }),
        }
      );
    });
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
          setSavedFiles={setSavedFiles}
          loading={loading}
          metadata={metadata}
          setMetadata={setMetadata}
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
