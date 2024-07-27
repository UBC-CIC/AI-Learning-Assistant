import React from "react";
import { useState } from "react";
import FileUpload from "../../components/FileUpload";
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

export const EditCourse = () => {
  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
      <Toolbar />
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
      >
        Course Name
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
        <FileUpload />
      </Paper>
    </Box>
  );
};

export default EditCourse;
