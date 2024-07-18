import React from "react";
// components
import PageContainer from "../Container";
import AdminHeader from "../../components/AdminHeader";
import AdminSidebar from "./AdminSidebar";
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
import { useState } from "react";

// populate with dummy data
const createData = (user, email, status) => {
  return { user, email, status };
};

const initialRows = [
  createData("John Doe", "john.doe@example.com", "Active"),
  createData("Jane Smith", "jane.smith@example.com", "Inactive"),
  createData("Bob Johnson", "bob.johnson@example.com", "Active"),
];

export const AdminHomepage = () => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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

  return (
    <div>
      <PageContainer>
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
          elevation={1}
        >
          <AdminHeader />
        </AppBar>
        <AdminSidebar />
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
          <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
            <TableContainer>
              <TextField
                label="Search by User"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ margin: 2, width: "100%", alignContent: "left" }}
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
                      <TableRow key={index}>
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
      </PageContainer>
    </div>
  );
};

export default AdminHomepage;