import { useState } from "react";
import {
  Button,
  Typography,
  IconButton,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const FileManagement = ({
  newFiles,
  setNewFiles,
  files,
  setFiles,
  setDeletedFiles,
  savedFiles,
  setSavedFiles,
  loading,
  savedImagesWithText,
  setSavedImagesWithText,
  deletedImagesWithText,
  setDeletedImagesWithText,
  metadata,
  setMetadata
}) => {
  const handleMetadataChange = (fileName, value) => {
    setMetadata((prev) => ({ ...prev, [fileName]: value }));
  };

  const handleDownloadClick = (url) => {
    window.open(url, "_blank");
  };


  

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event);
    const existingFileNames = files.map((file) => file.fileName);
    const savedFileNames = savedFiles.map((file) => file.name);
    const newFileNames = newFiles.map((file) => file.name);
    const allFileNames = [
      ...existingFileNames,
      ...savedFileNames,
      ...newFileNames,
    ];

    // Filter out files with names that already exist
    const newFile = uploadedFiles.filter(
      (file) => !allFileNames.includes(file.name)
    );

    if (newFile.length < uploadedFiles.length) {
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

    setNewFiles([...newFiles, ...newFile]);
  };

  const handleDownloadFile = (file) => {
    const url = window.URL.createObjectURL(new Blob([file]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", file.name);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const handleRemoveFile = async (file_name) => {
    setDeletedFiles((prevDeletedFiles) => [...prevDeletedFiles, file_name]);
    const updatedFiles = files.filter((file) => file.fileName !== file_name);
    setFiles(updatedFiles);
  };

  const handleSavedRemoveFile = async (file_name) => {
    setDeletedFiles((prevDeletedFiles) => [...prevDeletedFiles, file_name]);
    const updatedFiles = files.filter((file) => file.fileName !== file_name);
    setSavedFiles(updatedFiles);
  };

  const handleRemoveNewFile = (file_name) => {
    const updatedFiles = newFiles.filter((file) => file.name !== file_name);
    setNewFiles(updatedFiles);
  };

  const handleRemoveSavedImage = (imgFileObject) => {
    setDeletedImagesWithText((prevDeletedFiles) => [
      ...prevDeletedFiles,
      imgFileObject,
    ]);
    const updatedFiles = savedFiles.filter(
      (file) => file.image.name !== imgFileObject.name
    );
    setSavedImagesWithText(updatedFiles);
  };
  return (
    <Box sx={{ border: 1, borderRadius: 3, borderColor: "grey.400", p: 1 }}>
      <Typography variant="h6" sx={{ pt: 1 }}>
        Files
      </Typography>
      <Card
        variant="outlined"
        component="label"
        sx={{ textAlign: "center", p: 0, cursor: "pointer" }}
      >
        <CardContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
      <Typography variant="h7" fontWeight={"bold"} sx={{ pb: 3 }}>
        Uploaded Files
      </Typography>
      {!loading ? (
        <Box sx={{ ml: 8, mr: 8 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell align='center' >Meta Data</TableCell> {/* New Meta Data column */}
                <TableCell align="right" sx={{ pr: 5 }}>
                  Download
                </TableCell>
                <TableCell align="right">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...files, ...savedFiles, ...newFiles, ...savedImagesWithText]
                .sort((a, b) => {
                  if (newFiles.includes(a) && !newFiles.includes(b)) return 1;
                  if (!newFiles.includes(a) && newFiles.includes(b)) return -1;

                  const nameA = a.fileName || a.name;
                  const nameB = b.fileName || b.name;

                  if (nameA < nameB) return -1;
                  if (nameA > nameB) return 1;

                  return 0;
                })
                .map((file, index) => {
                  const fileName =
                    file.fileName || file.name || file.image.name;
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: newFiles.includes(file)
                              ? "#db1212"
                              : "inherit",
                          }}
                        >
                          {fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          variant="outlined"
                          fullWidth
                          placeholder="Enter meta data"
                          multiline
                          maxRows={4}
                          value={metadata[fileName] || ""}
                          onChange={(e) =>
                            handleMetadataChange(fileName, e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            if (file.url) {
                              handleDownloadClick(file.url);
                            } else if (file.fileName) {
                              handleDownloadFile(file);
                            } else {
                              handleDownloadFile(file.image);
                            }
                          }}
                        >
                          Download
                        </Button>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => {
                            if (file.fileName) {
                              handleRemoveFile(file.fileName);
                            } else if (savedFiles.includes(file)) {
                              handleSavedRemoveFile(file.name);
                            } else if (file.name) {
                              handleRemoveNewFile(file.name);
                            } else {
                              handleRemoveSavedImage(file.image);
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Box>
      ) : (
        <div>loading...</div>
      )}
    </Box>
  );
};

export default FileManagement;
