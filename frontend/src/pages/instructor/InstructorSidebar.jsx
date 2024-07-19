import React from "react";
import { Link } from "react-router-dom";
// MUI
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import EditIcon from "@mui/icons-material/Edit";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useNavigate } from "react-router-dom";

// TODO add onclick to route to different pages
const InstructorSidebar = ({ setSelectedComponent }) => {
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
            onClick={() => setSelectedComponent("InstructorOverview")}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Overview" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => setSelectedComponent("InstructorAnalytics")}
          >
            <ListItemIcon>
              <ViewTimelineIcon />
            </ListItemIcon>
            <ListItemText primary="Analytics" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => setSelectedComponent("InstructorEditCourse")}
          >
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText primary="Edit Course" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => setSelectedComponent("PromptSettings")}
          >
            <ListItemIcon>
              <PsychologyIcon />
            </ListItemIcon>
            <ListItemText primary="Prompt Settings" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default InstructorSidebar;
