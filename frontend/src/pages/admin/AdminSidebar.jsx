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
import SchoolIcon from "@mui/icons-material/School";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import CreateIcon from "@mui/icons-material/Create";

const AdminSidebar = ({
  setSelectedComponent,
  setSelectedInstructor,
  setSelectedCourse,
}) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 220,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 220, boxSizing: "border-box" },
        bgcolor: "#F8F9FD",
      }}
    >
      <Box sx={{ overflow: "auto", paddingTop: 10 }}>
        <List>
          <ListItem
            button
            onClick={() => {
              setSelectedInstructor(null);
              setSelectedCourse(null);
              setSelectedComponent("AdminInstructors");
            }}
          >
            <ListItemIcon>
              <SchoolIcon />
            </ListItemIcon>
            <ListItemText primary="Instructors" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => {
              setSelectedInstructor(null);
              setSelectedCourse(null);
              setSelectedComponent("AdminCourses");
            }}
          >
            <ListItemIcon>
              <LibraryBooksIcon />
            </ListItemIcon>
            <ListItemText primary="Courses" />
          </ListItem>
          <Divider />
          <ListItem
            button
            onClick={() => {
              setSelectedInstructor(null);
              setSelectedCourse(null);
              setSelectedComponent("AdminCreateCourse");
            }}
          >
            <ListItemIcon>
              <CreateIcon />
            </ListItemIcon>
            <ListItemText primary="Create Course" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default AdminSidebar;
