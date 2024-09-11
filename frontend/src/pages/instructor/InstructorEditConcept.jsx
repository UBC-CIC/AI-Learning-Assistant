import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";
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
import PageContainer from "../Container";
const InstructorEditConcept = () => {
  const location = useLocation();
  const { conceptData, course_id } = location.state || {};
  const [conceptName, setConceptName] = useState(conceptData.concept_name);
  const [data, setData] = useState([]);
  console.log(conceptData);
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/view_modules?course_id=${encodeURIComponent(course_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const moduleData = await response.json();
          console.log("module data", moduleData);
          const filteredData = moduleData.filter(
            (module) => module.concept_name === conceptData.concept_name
          );
          setData(filteredData);
          console.log("filtered data", filteredData);
        } else {
          console.error("Failed to fetch modules:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    };
    fetchModules();
  }, [course_id]);
  const handleBackClick = () => {
    window.history.back();
  };
  const handleDelete = async () => {
    const session = await fetchAuthSession();
    const authtoken = session.tokens.idToken.toString();
    const deletePromises = data.map((module) =>
      fetch(
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
            Authorization: authtoken,
            "Content-Type": "application/json",
          },
        }
      )
    );

    // Execute all delete requests concurrently
    await Promise.all(deletePromises);
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/delete_concept?concept_id=${encodeURIComponent(
          conceptData.concept_id
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
        console.error("Failed to delete concept");
        toast.error("Failed to delete concept", {
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
      console.error("Failed to delete concept");
      toast.error("Failed to delete concept", {
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
    setConceptName(e.target.value);
  };

  const handleSave = async () => {
    if (!conceptName.trim()) {
      toast.error("Concept Name is required.", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/edit_concept?concept_id=${encodeURIComponent(
          conceptData.concept_id
        )}&concept_number=${encodeURIComponent(conceptData.concept_number)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ concept_name: conceptName }),
        }
      );
      if (response.ok) {
        toast.success("Successfully Updated Concept", {
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
        console.error("Failed to update concept");
        toast.error("Failed to update concept", {
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
      console.error("Failed to update concept");
      toast.error("Failed to update concept", {
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
  return (
    <PageContainer>
      <Paper style={{ padding: 25, width: "100%", overflow: "auto" }}>
        <Typography variant="h6">
          Edit Concept {conceptData.concept_name}{" "}
        </Typography>

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

export default InstructorEditConcept;
