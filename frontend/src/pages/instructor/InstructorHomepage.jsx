import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
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
import PromptSettings from "./PromptSettings";
import ViewStudents from "./ViewStudents";
import InstructorModules from "./InstructorModules";
import InstructorNewModule from "./InstructorNewModule";
import StudentDetails from "./StudentDetails";
import InstructorNewConcept from "./InstructorNewConcept";

// course details page
const CourseDetails = () => {
  const location = useLocation();
  console.log("Location object:", location); // Debugging line
  const { courseName } = useParams();
  const [selectedComponent, setSelectedComponent] = useState(
    "InstructorAnalytics"
  );
  const { course_id } = location.state;

  const renderComponent = () => {
    switch (selectedComponent) {
      case "InstructorAnalytics":
        return (
          <InstructorAnalytics courseName={courseName} course_id={course_id} />
        );
      case "InstructorEditCourse":
        return (
          <InstructorModules courseName={courseName} course_id={course_id} />
        );
      case "PromptSettings":
        return <PromptSettings courseName={courseName} course_id={course_id} />;
      case "ViewStudents":
        return <ViewStudents courseName={courseName} course_id={course_id} />;
      default:
        return (
          <InstructorAnalytics courseName={courseName} course_id={course_id} />
        );
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
  const [rows, setRows] = useState([]);
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
        const { signInDetails } = await getCurrentUser();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/courses?email=${encodeURIComponent(signInDetails.loginId)}`,
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
          const formattedData = data.map((course) => ({
            course: course.course_name,
            date: new Date().toLocaleDateString(), // REPLACE
            status: course.course_student_access ? "Active" : "Inactive",
            id: course.course_id,
          }));
          setRows(formattedData);
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

  const handleRowClick = (courseName, course_id) => {
    navigate(`/course/${courseName}`, { state: { course_id } });
   // console.log("state", state);
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
              <Paper sx={{ width: "80%", overflow: "hidden", margin: "0 auto", padding: 2 }}>
                <TextField
                  label="Search by Course"
                  variant="outlined"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  sx={{ width: "100%", marginBottom: 2 }}
                />
                <TableContainer sx={{ width: "100%" }}>
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
                            onClick={() => handleRowClick(row.course, row.id)}
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
      <Route exact path=":courseName/*" element={<CourseDetails />} />
      <Route
        path=":courseName/edit-module/:moduleId"
        element={<InstructorEditCourse />}
      />
      <Route path=":courseName/new-module" element={<InstructorNewModule />} />
      <Route path=":courseName/new-concept" element={<InstructorNewConcept />} />
      <Route
        path=":courseName/student/:studentId"
        element={<StudentDetails />}
      />
    </Routes>
  );
  
  
};

export default InstructorHomepage;
