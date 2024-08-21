import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Box,
  Toolbar,
  Typography,
  Paper,
} from "@mui/material";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  MRT_TableContainer,
  useMaterialReactTable,
} from 'material-react-table';

const InstructorConcepts = ({ courseName, course_id }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [accessCode, setAccessCode] = useState("loading...");

  useEffect(() => {
    // Fetch modules from API or use initial data
    const fetchModules = async () => {
      // Simulate fetching from an API
      const modulesData = [
        {
          module_id: "02f1adde-95ef-434c-87e7-c5789d9a3dce",
          module_name: "program structure",
          concept_name: "basics",
        },
        {
          module_id: "493b210a-a04e-4069-8f7e-df101226a101",
          module_name: "method and calls",
          concept_name: "basics",
        },
        // Additional modules...
      ];
      setData(modulesData);
    };

    fetchModules();
  }, []);

  const columns = useMemo(() => [
    {
      accessorKey: 'module_name',
      header: 'Module Name',
    },
    {
      accessorKey: 'concept_name',
      header: 'Concept',
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      Cell: ({ row }) => (
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleEditClick(row.original.module_id)}
        >
          Edit
        </Button>
      ),
    },
  ], []);

  const table = useMaterialReactTable({
    autoResetPageIndex: false,
    columns,
    data,
    enableRowOrdering: true,
    enableSorting: false,
    muiRowDragHandleProps: ({ table }) => ({
      onDragEnd: () => {
        const { draggingRow, hoveredRow } = table.getState();
        if (hoveredRow && draggingRow) {
          data.splice(
            hoveredRow.index,
            0,
            data.splice(draggingRow.index, 1)[0],
          );
          setData([...data]);
        }
      },
    }),
  });

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
  }, [course_id]);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}instructor/view_modules?course_id=${encodeURIComponent(course_id)}`,
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
          setData(moduleData);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchModules();
  }, [course_id]);

  const handleEditClick = (moduleId) => {
    navigate(`/course/${courseName}/edit-module/${moduleId}`);
  };

  const handleCreateModuleClick = () => {
    navigate(`/course/${courseName}/new-module`);
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

  const handleLogModulesClick = () => {
    console.log(data);
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
        <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
          <MRT_TableContainer table={table} />
        </Box>
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
        <Button
          variant="contained"
          color="secondary"
          onClick={handleLogModulesClick}
        >
          Log Modules in Order
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

export default InstructorConcepts;
