import React, { useState } from "react";
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

const InstructorModules = ({ courseId }) => {
  const navigate = useNavigate();

  // Sample data for modules
  const modules = [
    {
      id: "1",
      name: "Introduction to Course",
    },
    { id: "2", name: "Module 1: Basics" },
    {
      id: "3",
      name: "Module 2: Advanced Topics",
    },
  ];
  const [accessCode, setAccessCode] = useState("111111");

  const handleEditClick = (moduleId) => {
    navigate(`/course/${courseId}/edit-module/${moduleId}`);
  };

  const handleCreateModuleClick = () => {
    navigate(`/course/${courseId}/new-module`);
  };

  const handleGenerateAccessCode = () => {
    // replace with randomized logic to generate code
    const newAccessCode = Math.floor(100000 + Math.random()).toString();
    setAccessCode(newAccessCode);
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
        {courseId}
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Module Name</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>{module.name}</TableCell>
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
      <Box sx={{ marginTop: 2, display: "flex-end" }}>
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
      </Box>
    </Box>
  );
};

export default InstructorModules;
