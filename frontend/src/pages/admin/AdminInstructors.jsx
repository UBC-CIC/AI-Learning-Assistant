import {
  Typography,
  Box,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { useState, useEffect } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const fetchInstructors = async () => {
  try {
    const session = await fetchAuthSession();
    const userAtrributes = await fetchUserAttributes();
    const token = session.tokens.idToken.toString();
    const adminEmail = userAtrributes.email;
    console.log("admin email", adminEmail);

    const response = await fetch(
      `${
        import.meta.env.VITE_API_ENDPOINT
      }admin/instructors?instructor_email=${adminEmail}`,
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

const createData = (user, last, email) => {
  return { user, last, email };
};

function getInstructorInfo(coursesArray) {
  return coursesArray.map((instructor) =>
    createData(
      instructor.first_name || "Waiting for user to sign in",
      instructor.last_name || "Waiting for user to sign in",
      instructor.user_email
    )
  );
}

export const AdminInstructors = ({ setSelectedInstructor }) => {
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const data = await fetchInstructors();
        setInstructors(data);
      } catch (error) {
        console.log("error loading data");
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, []);

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }admin/instructors?instructor_email=replace`,
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
          setRows(getInstructorInfo(data));
          setLoading(false);
          console.log("Instructors data:", data);
        } else {
          console.error("Failed to fetch instructors:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching instructors:", error);
      }
    };

    fetchInstructors();
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

  const filteredRows = rows.filter(
    (row) =>
      row &&
      row.user &&
      row.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (user) => {
    setSelectedInstructor(user);
  };

  const handleAddInstructor = async (email) => {
    try {
      const session = await fetchAuthSession();
      const userAtrributes = await fetchUserAttributes();
      const token = session.tokens.idToken.toString();
      const adminEmail = userAtrributes.email;
      console.log("admin email", email);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }admin/elevate_instructor?email=${email}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Error Status: ${response.status}`);
      }
      const data = await response.json();
      setInstructors((prevInstructors) => [
        ...prevInstructors,
        {
          first_name: "Waiting for user to sign in",
          last_name: "Waiting for user to sign in",
          user_email: email,
        },
      ]);
  
      // Optionally, you can also update the rows state if needed
      setRows((prevRows) => [
        ...prevRows,
        {
          user: "Waiting for user to sign in",
          last: "Waiting for user to sign in",
          email: email,
        },
      ]);
    } catch (error) {
      console.error("Error elevating instructor", error);
    }
  };

  return (
    <div>
      <Box component="main" sx={{ flexGrow: 1, p: 2, marginTop: 0.5 }}>
        <Toolbar />
        <Typography
          color="black"
          fontStyle="semibold"
          textAlign="left"
          variant="body1"
        >
          Manage Instructors
        </Typography>
        <Paper sx={{ width: "150%", overflow: "hidden", marginTop: 1 }}>
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
                        First Name
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Last Name</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>Email</TableCell>
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
                          onClick={() => handleRowClick({ row })}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.user}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.last}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.email}
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
          <Button
            variant="contained"
            color="primary"
            sx={{ marginBottom: 2 }}
            onClick={handleClickOpen}
          >
            Add Instructors
          </Button>
        </Paper>
      </Box>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: "form",
          onSubmit: (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const formJson = Object.fromEntries(formData.entries());
            const email = formJson.email;
            handleAddInstructor(email);
          },
        }}
      >
        <DialogTitle>Add an Instructor</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the email of the instructor here
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="name"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Submit</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdminInstructors;
