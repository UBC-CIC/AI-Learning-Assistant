import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Typography, Box, AppBar } from "@mui/material";
import PageContainer from "../Container";
import InstructorHeader from "../../components/InstructorHeader";
import InstructorSidebar from "./InstructorSidebar";
import InstructorAnalytics from "./InstructorAnalytics";
import PromptSettings from "./PromptSettings";
import ViewStudents from "./ViewStudents";
import InstructorModules from "./InstructorModules";

// course details page
const CourseDetails = () => {
  const { courseId } = useParams();
  const [selectedComponent, setSelectedComponent] = useState(
    "InstructorAnalytics"
  );

  // connect to api data
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken
        const userAtrributes = await fetchUserAttributes();
        const email = userAtrributes.email;
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
          const course_id = data.find((course) => course.course_id);
          const course_name = data.find((course) => course.course_name);
          setRows(formattedData);
        } else {
          console.error("Failed to fetch courses:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };

    fetchCourses();
  }, [course_id, course_name]);


  const renderComponent = () => {
    switch (selectedComponent) {
      case "InstructorAnalytics":
        return (
          <InstructorAnalytics courseId={courseId} course_id={course_id} />
        );
      case "InstructorEditCourse":
        return <InstructorModules courseId={courseId} course_id={course_id}/>;
      case "PromptSettings":
        return <PromptSettings courseId={courseId} />;
      case "ViewStudents":
        return <ViewStudents courseId={courseId} />;
      default:
        return (
          <InstructorAnalytics courseId={courseId} course_id={course_id} />
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

export default CourseDetails;
