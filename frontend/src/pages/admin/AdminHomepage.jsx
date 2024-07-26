import React from "react";
// components
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "../../components/AdminHeader";
import AdminInstructors from "./AdminInstructors";
import AdminCourses from "./AdminCourses";
import AdminCreateCourse from "./AdminCreateCourse";
import PageContainer from "../Container";
import InstructorDetails from "./InstructorDetails";
import CourseDetails from "./CourseDetails";
// MUI
import { AppBar } from "@mui/material";
import { useState } from "react";

export const AdminHomepage = () => {
  const [selectedComponent, setSelectedComponent] =
    useState("AdminInstructors");
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // sidebar routing
  const renderComponent = () => {
    if (selectedInstructor) {
      return (
        <InstructorDetails
          instructorName={selectedInstructor}
          onBack={() => setSelectedInstructor(null)}
        />
      );
    }
    if (selectedCourse) {
      return (
        <CourseDetails
          courseName={selectedCourse}
          onBack={() => setSelectedCourse(null)}
        />
      );
    }
    switch (selectedComponent) {
      case "AdminInstructors":
        return (
          <AdminInstructors setSelectedInstructor={setSelectedInstructor} />
        );
      case "AdminCourses":
        return (
        <AdminCourses setSelectedCourse={setSelectedCourse} />
        );
      case "AdminCreateCourse":
        return <AdminCreateCourse />;
      default:
        return (
          <AdminInstructors setSelectedInstructor={setSelectedInstructor} />
        );
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
