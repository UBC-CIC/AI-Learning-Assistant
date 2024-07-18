import React from "react";
import { useState } from "react";
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
// components
import Analytics from "./InstructorAnalytics";
import EditCourse from "./InstructorEditCourse";
import PromptSettings from "./PromptSettings";

// populate with dummy data
const createData = (course, date, status) => {
  return { course, date, status };
};

const initialRows = [
  createData("CPSC 221", "Sept - Dec 2023", "Active"),
  createData("CPSC 210", "Jan - April 2023", "Inactive"),
  createData("CPSC 210", "Sept - Dec 2023", "Active"),
];

export const InstructorOverview = () => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedComponent, setSelectedComponent] =
    useState("InstructorHomepage");

  // sidebar routing
  const renderComponent = () => {
    switch (selectedComponent) {
      case "Analytics":
        return <Analytics />;
      case "EditCourse":
        return <EditCourse />;
      case "InstructorHomepage":
        return <InstructorHomepage />;
      case "PromptSettings":
        return <PromptSettings />;
      default:
        return <InstructorHomepage />;
    }
  };

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
          Your Courses
        </Typography>
        <Button> Add new course</Button>
        <Paper sx={{ width: "180%", overflow: "hidden", marginTop: 2 }}>
          <TableContainer>
            <Table aria-label="course table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "35%" }}>Course</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.course}</TableCell>
                      <TableCell>{row.date}</TableCell>
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

export default InstructorOverview;
