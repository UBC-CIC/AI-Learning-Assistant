import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Toolbar,
  Typography,
} from "@mui/material";
import { fetchAuthSession } from "aws-amplify/auth";

const InstructorModules = ({ courseName, course_id }) => {
  const navigate = useNavigate();
  console.log('course_name',courseName)
  console.log(course_id)
  // Sample data for modules
  const modules = [
    {
      id: "1",
      concept: "Introduction",
      name: "Module 1: Introduction",
    },
    { id: "2", concept: "Basics", name: "Module 2: Basics" },
    {
      id: "3",
      concept: "Advanced",
      name: "Module 3: Advanced Topics",
    },
  ];
  const [accessCode, setAccessCode] = useState("loading...");
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}instructor/get_access_code?course_id=${encodeURIComponent(course_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setAccessCode(data.course_access_code);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCode();
  },[])

  const handleEditClick = (moduleId) => {
    navigate(`/course/${courseName}/edit-module/${moduleId}`);
  };

  const handleCreateModuleClick = () => {
    navigate(`/course/${courseName}/new-module`);
  };

  const handleCreateConceptClick = () => {
    navigate(`/course/${courseName}/new-concept`);
  };


  const handleGenerateAccessCode = async () => {
    try {
      const session = await fetchAuthSession();
      var token = session.tokens.idToken.toString();
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}instructor/generate_access_code?course_id=${encodeURIComponent(course_id)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setAccessCode(data.access_code);
      } else {
        console.error("Failed to fetch courses:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, p: 3, marginTop: 1, overflow: "auto" }}
    >
      <Toolbar />
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
      >
        {courseName}
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Module Name</TableCell>
              <TableCell>Concept</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>{module.name}</TableCell>
                <TableCell>{module.concept}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleEditClick(module.id)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Box
        sx={{
          marginTop: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateModuleClick}
        >
          Create New Module
        </Button>
      </Box>
      <Paper
        sx={{
          marginTop: 5,
          display: "flex-start",
          p: 5,
          width: "50%",
        }}
      >
        <Typography variant="subtitle1" color="black">
          Access Code: {accessCode}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleGenerateAccessCode}
        >
          Generate New Access Code
        </Button>
      </Paper>
    </Box>
  );
};

export default InstructorModules;
