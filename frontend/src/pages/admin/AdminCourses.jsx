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
  OutlinedInput,
} from "@mui/material";
import { useState } from "react";

// populate with dummy data
const createData = (course, instructor, status) => {
  return { course, instructor, status };
};

const initialRows = [
  createData("CPSC XXX", "john.doe@example.com", "Active"),
  createData("CPSC XXX", "jane.smith@example.com", "Inactive"),
  createData("CPSC XXX", "bob.johnson@example.com", "Active"),
];

export const AdminCourses = ({ setSelectedCourse }) => {
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
    row.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
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
          Courses
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
                  <TableCell sx={{ width: "35%" }}>Course</TableCell>
                  <TableCell>Instructor</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow
                      key={index}
                      onClick={() => handleCourseClick(row.course)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>{row.course}</TableCell>
                      <TableCell>{row.instructor}</TableCell>
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

export default AdminCourses;
