import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Badge,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import EditIcon from "@mui/icons-material/Edit";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GroupIcon from "@mui/icons-material/Group";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNotification } from "../../context/NotificationContext";

const InstructorSidebar = ({ setSelectedComponent }) => {
  const navigate = useNavigate();
  const { hasNewNotification, setHasNewNotification } = useNotification();

  const handleNavigation = (component) => {
    if (component === "InstructorAllCourses") {
      navigate("/home"); 
    } else {
      setSelectedComponent(component);
      if (component === "ChatLogs") {
        setHasNewNotification(false);
      }
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 220,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 220, boxSizing: "border-box" },
        bgcolor: "background",
      }}
    >
      <Box sx={{ overflow: "auto", paddingTop: 10 }}>
        <List>
          <ListItem
            button
            onClick={() => handleNavigation("InstructorAllCourses")}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="All Courses" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => handleNavigation("InstructorAnalytics")}
          >
            <ListItemIcon>
              <ViewTimelineIcon />
            </ListItemIcon>
            <ListItemText primary="Analytics" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => handleNavigation("InstructorEditConcepts")}
          >
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText primary="Edit Concepts" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => handleNavigation("InstructorEditCourse")}
          >
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText primary="Edit Modules" />
          </ListItem>
          <Divider />
          <ListItem button onClick={() => handleNavigation("PromptSettings")}>
            <ListItemIcon>
              <PsychologyIcon />
            </ListItemIcon>
            <ListItemText primary="Prompt Settings" />
          </ListItem>
          <Divider />
          <ListItem button onClick={() => handleNavigation("ViewStudents")}>
            <ListItemIcon>
              <GroupIcon />
            </ListItemIcon>
            <ListItemText primary="View Students" />
          </ListItem>
          <Divider />
          <ListItem button onClick={() => handleNavigation("ChatLogs")}>
            <ListItemIcon>
              <Badge
                color="error"
                variant="dot"
                invisible={!hasNewNotification}
              >
                <DescriptionIcon />
              </Badge>
            </ListItemIcon>
            <ListItemText primary="Chat History" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default InstructorSidebar;