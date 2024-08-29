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
const InstructorNewConcept = () => {
  const [conceptName, setConceptName] = useState("");
  const location = useLocation();
  const { data, course_id } = location.state || {};
  const [nextConceptNumber, setNextConceptNumber] = useState(data.length + 1);

  const handleBackClick = () => {
    window.history.back();
  };

  const handleInputChange = (e) => {
    setConceptName(e.target.value);
  };

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/create_concept?course_id=${encodeURIComponent(
          course_id
        )}&concept_number=${encodeURIComponent(nextConceptNumber)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            concept_name: conceptName,
          }),
        }
      );
      if (!response.ok) {
        console.error(`Failed to create concept`, response.statusText);
        toast.error("Concept Creation Failed", {
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
        console.log(`Updated Concept ${updatedModule.module_id} successfully.`);
        toast.success("Concept Created Successfully", {
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
    }
    setNextConceptNumber(nextConceptNumber + 1);
  };
  return (
    <PageContainer>
      <Paper style={{ padding: 25, width: "100%", overflow: "auto" }}>
        <Typography variant="h6">Create Concept </Typography>

        <TextField
          label="Concept Name"
          name="name"
          value={conceptName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
          inputProps={{ maxLength: 50 }}
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

export default InstructorNewConcept;
