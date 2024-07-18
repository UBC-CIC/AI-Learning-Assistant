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
import PageContainer from "../Container";
import InstructorHeader from "../../components/InstructorHeader";
import InstructorSidebar from "./InstructorSidebar";
import InstructorAnalytics from "./InstructorAnalytics";
import InstructorEditCourse from "./InstructorEditCourse";
import InstructorOverview from "./InstructorOverview";
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

export const InstructorHomepage = () => {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedComponent, setSelectedComponent] =
    useState("InstructorOverview");

  // sidebar routing
  const renderComponent = () => {
    switch (selectedComponent) {
      case "InstructorAnalytics":
        return <InstructorAnalytics />;
      case "InstructorEditCourse":
        return <InstructorEditCourse />;
      case "InstructorOverview":
        return <InstructorOverview />;
      case "PromptSettings":
        return <PromptSettings />;
      default:
        return <InstructorOverview />;
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
          <InstructorHeader />
        </AppBar>
        <InstructorSidebar setSelectedComponent={setSelectedComponent} />
        {renderComponent()}
      </PageContainer>
    </div>
  );
};

export default InstructorHomepage;
