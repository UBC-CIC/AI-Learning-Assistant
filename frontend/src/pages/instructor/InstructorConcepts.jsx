import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Box, Toolbar, Typography, Paper } from "@mui/material";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  MRT_TableContainer,
  useMaterialReactTable,
} from "material-react-table";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const InstructorConcepts = ({ courseName, course_id }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
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
          const data = await response.json();
          console.log(data);
          setData(data);
        } else {
          console.error("Failed to fetch concepts:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching concepts:", error);
      }
    };

    fetchConcepts();
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: "concept_name",
        header: "Concept Name",
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

  const handleEditClick = (conceptData) => {
    navigate(`/course/${courseName}/edit-concept/${conceptData.concept_id}`, {
      state: { conceptData, course_id: course_id },
    });
  };

  const handleCreateConceptClick = () => {
    navigate(`/course/${courseName}/new-concept`, {
      state: { data, course_id },
    });
  };

  const handleSaveChanges = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken.toString();
      console.log(data);

      // Create an array of promises for updating concepts
      const updatePromises = data.map((concept, index) => {
        const conceptNumber = index + 1;

        return fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/edit_concept?concept_id=${encodeURIComponent(
            concept.concept_id
          )}&concept_number=${encodeURIComponent(conceptNumber)}`,
          {
            method: "PUT",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              concept_name: concept.concept_name,
              concept_number: conceptNumber,
            }),
          }
        ).then((response) => {
          if (!response.ok) {
            console.error(
              `Failed to update concept ${concept.concept_id}:`,
              response.statusText
            );
            toast.error("Concept Order Update Failed", {
              position: "top-center",
              autoClose: 1000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "colored",
            });
            return { success: false };
          } else {
            return response.json().then((updatedConcept) => {
              console.log(
                `Updated concept ${updatedConcept.concept_id} successfully.`
              );
              return { success: true };
            });
          }
        });
      });

      // Wait for all promises to complete
      const updateResults = await Promise.all(updatePromises);
      const allUpdatesSuccessful = updateResults.every(
        (result) => result.success
      );

      if (allUpdatesSuccessful) {
        toast.success("Concept Order Updated Successfully", {
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
        toast.error("Some concept updates failed", {
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
      toast.error("An error occurred while saving changes", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: "Bounce",
      });
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
          onClick={handleCreateConceptClick}
        >
          Create New Concept
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

export default InstructorConcepts;
