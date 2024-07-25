import React from "react";
// components
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "../../components/AdminHeader";
import AdminInstructors from "./AdminInstructors";
import AdminCourses from "./AdminCourses";
import AdminCreateCourse from "./AdminCreateCourse";
import PageContainer from "../Container";
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
  const [selectedComponent, setSelectedComponent] =
    useState("AdminInstructors");

  // sidebar routing
  const renderComponent = () => {
    switch (selectedComponent) {
      case "AdminInstructors":
        return <AdminInstructors />;
      case "AdminCourses":
        return <AdminCourses />;
      case "AdminCreateCourse":
        return <AdminCreateCourse />;
      default:
        return <AdminInstructors />;
    }
  };

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
        <AdminSidebar setSelectedComponent={setSelectedComponent} />
        {renderComponent()}
      </PageContainer>
    </div>
  );
};

export default AdminHomepage;
