import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Box, Toolbar, Typography, Paper } from "@mui/material";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import {
  MRT_TableContainer,
  useMaterialReactTable,
} from "material-react-table";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const InstructorModules = ({ courseName, course_id }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const columns = useMemo(
    () => [
      {
        accessorKey: "module_name",
        header: "Module Name",
      },
      {
        accessorKey: "concept_name",
        header: "Concept",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleEditClick(row.original)}
          >
            Edit
          </Button>
        ),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    autoResetPageIndex: false,
    columns,
    data,
    enableRowOrdering: true,
    enableSorting: false,
    initialState: { pagination: { pageSize: 1000, pageIndex: 1 } },
    muiRowDragHandleProps: ({ table }) => ({
      onDragEnd: () => {
        const { draggingRow, hoveredRow } = table.getState();
        if (hoveredRow && draggingRow) {
          data.splice(
            hoveredRow.index,
            0,
            data.splice(draggingRow.index, 1)[0]
          );
          setData([...data]);
        }
      },
    }),
  });

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
          setData(moduleData);
          console.log("data", moduleData);
        } else {
          console.error("Failed to fetch modules:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    };

    fetchModules();
  }, [course_id]);

  const handleEditClick = (moduleData) => {
    navigate(`/course/${courseName}/edit-module/${moduleData.module_id}`, {
      state: { moduleData, course_id: course_id },
    });
  };

  const handleCreateModuleClick = () => {
    navigate(`/course/${courseName}/new-module`, {
      state: { data, course_id },
    });
  };
  const handleSaveChanges = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      const { signInDetails } = await getCurrentUser();

      for (let i = 0; i < data.length; i++) {
        const module = data[i];
        const moduleNumber = i + 1;

        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/reorder_module?module_id=${encodeURIComponent(
            module.module_id
          )}&module_number=${moduleNumber}&instructor_email=${encodeURIComponent(
            signInDetails.loginId
          )}`,
          {
            method: "PUT",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              module_name: module.module_name,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            `Failed to update module ${module.module_id}:`,
            response.statusText
          );
          toast.error("Module Order Update Failed", {
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
          console.log(
            `Updated module ${updatedModule.module_id} successfully.`
          );
        }
      }
      toast.success("Module Order Updated Successfully", {
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
      console.error("Error saving changes:", error);
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
        <Button variant="contained" color="primary" onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </Box>
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
    </Box>
  );
};

export default InstructorModules;
