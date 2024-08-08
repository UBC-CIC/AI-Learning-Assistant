import React from "react";
import { useState } from "react";
import FileUpload from "../../components/FileUpload";
import InstructorSidebar from "./InstructorSidebar";
import PageContainer from "../Container";
import InstructorHeader from "../../components/InstructorHeader";
// MUI
import { Typography, Box, AppBar, Toolbar, Paper } from "@mui/material";

export const InstructorNewModule = ({ courseId }) => {
  return (
    <PageContainer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
        <Typography
          color="black"
          fontStyle="semibold"
          textAlign="left"
          variant="h6"
        >
          {courseId}
        </Typography>
        <Typography variant="h6" color="black" textAlign="center" padding={1}>
          Create new module
        </Typography>
        <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 1 }}>
          <FileUpload />
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default InstructorNewModule;
