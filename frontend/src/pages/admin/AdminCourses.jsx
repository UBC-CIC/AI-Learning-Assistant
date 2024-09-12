import { useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
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
const createData = (course, instructor, status, id) => {
  console.log(status);
  return { course, instructor, status, id };
};

function getCourseInfo(coursesArray) {
  return coursesArray.map((course) =>
    createData(
      `${course.course_department} ${course.course_number}`,
      `${course.course_access_code}`,
      `${course.course_student_access}`,
      `${course.course_id}`
    )
  );
}

export const AdminCourses = ({ setSelectedCourse }) => {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}admin/courses`,
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
          setRows(getCourseInfo(data));
          setLoading(false);
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

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
  };

  return (
    <div>
      <Box component="main" sx={{ flexGrow: 1, p: 2, marginTop: 0.5 }}>
        <Toolbar />
        <Paper
          sx={{
            width: "150%",
            overflow: "hidden",
            marginTop: 1,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              padding: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              color="black"
              fontStyle="semibold"
              textAlign="left"
              variant="h6"
            >
              Courses
            </Typography>
          </Box>
          <TableContainer>
            <TextField
              label="Search by User"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ margin: 1, width: "90%", alignContent: "left" }}
              InputProps={{ sx: { fontSize: 12 } }}
              InputLabelProps={{ sx: { fontSize: 12 } }}
            />
            <Table aria-label="user table">
              {!loading ? (
                <>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: "30%", fontSize: 12 }}>
                        Course
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        Course Access Code
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Status</TableCell>
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
                          onClick={() => handleCourseClick({ row })}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.course.toUpperCase()}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.instructor}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              color={
                                row.status === "true" ? "primary" : "secondary"
                              }
                              sx={{ fontSize: 10, padding: "4px 8px" }}
                            >
                              {row.status === "true" ? "Active" : "Inactive"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </>
              ) : (
                <>loading...</>
              )}
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
                    sx={{
                      fontSize: 12,
                      minWidth: 400,
                    }}
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
