import React from "react";
// MUI
import {
  Typography,
  Box,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  TableFooter,
  TablePagination,
} from "@mui/material";
import { useState, useEffect } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

// fetch instructor data from api
const fetchInstructors = async () => {
  try {
    // Get session and token
    const session = await fetchAuthSession();
    const userAtrributes = await fetchUserAttributes();
    const token = session.tokens.idToken.toString();
    const adminEmail = userAtrributes.email;
    console.log("admin email", adminEmail);

    // Make the API request
    const response = await fetch(
      `${
        import.meta.env.VITE_API_ENDPOINT
      }/admin/instructors?instructor_email=${encodeURIComponent(adminEmail)}`,
      {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Response from backend:", data);
    return data;
  } catch (error) {
    console.error("Error fetching instructors:", error);
    return [];
  }
};

// populate with dummy data
const createData = (user, email, status) => {
  return { user, email, status };
};

const initialRows = [
  createData("John Doe", "john.doe@example.com", "Active"),
  createData("Jane Smith", "jane.smith@example.com", "Inactive"),
  createData("Bob Johnson", "bob.johnson@example.com", "Active"),
];

export const AdminInstructors = ({ setSelectedInstructor }) => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const data = await fetchInstructors();
        setInstructors(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, []);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRows = rows.filter((row) =>
    row.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (user) => {
    setSelectedInstructor(user);
  };

  return (
    <div>
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
        <Toolbar />
        <Typography
          color="black"
          fontStyle="semibold"
          textAlign="left"
          variant="h6"
        >
          Manage Instructors
        </Typography>
        <Paper sx={{ width: "170%", overflow: "hidden", marginTop: 2 }}>
          <TableContainer>
            <TextField
              label="Search by User"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ margin: 2, width: "95%", alignContent: "left" }}
            />
            <Table aria-label="user table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "35%" }}>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow
                      key={index}
                      onClick={() => handleRowClick(row.user)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>{row.user}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color={
                            row.status === "Active" ? "primary" : "secondary"
                          }
                        >
                          {row.status}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredRows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </div>
  );
};

export default AdminInstructors;
