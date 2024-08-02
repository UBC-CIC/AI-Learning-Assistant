import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
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
  TableFooter,
  TablePagination,
  Button,
} from "@mui/material";
import PageContainer from "../Container";
import InstructorHeader from "../../components/InstructorHeader";
import InstructorSidebar from "./InstructorSidebar";
import InstructorAnalytics from "./InstructorAnalytics";
import InstructorEditCourse from "./InstructorEditCourse";
import InstructorOverview from "./InstructorOverview";
import PromptSettings from "./PromptSettings";
import ViewStudents from "./ViewStudents";

const createData = (course, date, status) => {
  return { course, date, status };
};

const initialRows = [
  createData("CPSC221", "Sept - Dec 2023", "Active"),
  createData("CPSC210", "Jan - April 2023", "Inactive"),
  createData("CPSC210", "Sept - Dec 2023", "Active"),
];

// course details page
const CourseDetails = () => {
  const { courseId } = useParams();
  const [selectedComponent, setSelectedComponent] = useState(
    "InstructorAnalytics"
  );

  const renderComponent = () => {
    switch (selectedComponent) {
      case "InstructorAnalytics":
        return <InstructorAnalytics courseId={courseId} />;
      case "InstructorEditCourse":
        return <InstructorEditCourse courseId={courseId} />;
      case "PromptSettings":
        return <PromptSettings courseId={courseId} />;
      case "ViewStudents":
        return <ViewStudents courseId={courseId} />;
      default:
        return <InstructorAnalytics courseId={courseId} />;
    }
  };
  return (
    <PageContainer>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        elevation={1}
      >
        <InstructorHeader />
      </AppBar>
      <InstructorSidebar setSelectedComponent={setSelectedComponent} />
      {renderComponent()}
    </PageContainer>
  );
};

const InstructorHomepage = () => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const navigate = useNavigate();
  // connect to api data
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const userAtrributes = await fetchUserAttributes();
        const email = userAtrributes.email;
        console.log("instructor email", email);
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/courses?email=${encodeURIComponent(email)}`,
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
          // setRows(getInstructorInfo(data));
          // setLoading(false);
          console.log("Instructors course data:", data);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
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
    row.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PageContainer>
            <AppBar
              position="fixed"
              sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
              elevation={1}
            >
              <InstructorHeader />
            </AppBar>
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
              <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
                <TableContainer>
                  <TextField
                    label="Search by Course"
                    variant="outlined"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    sx={{ margin: 2, width: "95%", alignContent: "left" }}
                  />
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
                        .slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage
                        )
                        .map((row, index) => (
                          <TableRow
                            key={index}
                            onClick={() => handleRowClick(row.course)}
                            style={{ cursor: "pointer" }}
                          >
                            <TableCell>{row.course}</TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                color={
                                  row.status === "Active"
                                    ? "primary"
                                    : "secondary"
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
        }
      />
      <Route path=":courseId/*" element={<CourseDetails />} />
    </Routes>
  );
};

export default InstructorHomepage;
