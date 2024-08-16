import React, { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Grid,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Example data for the line chart
const engagementData = [
  { module: "Module 1: ", Engagement: 400 },
  { module: "Module 2", Engagement: 300 },
  { module: "Module 3", Engagement: 200 },
];

// Example data for modules
const modulesData = [
  {
    name: "Module 1: Introduction",
    averageGrade: 75,
    engagementDetails: "High engagement in week 1.",
    mostAskedConcepts: "Concept A, Concept B",
  },
  {
    name: "Module 2: Basics",
    averageGrade: 85,
    engagementDetails: "Moderate engagement in week 2.",
    mostAskedConcepts: "Concept C, Concept D",
  },
  {
    name: "Module 3: Advanced Topics",
    averageGrade: 90,
    engagementDetails: "Low engagement in week 3.",
    mostAskedConcepts: "Concept E, Concept F",
  },
];

const InstructorAnalytics = ({ courseName, course_id }) => {
  const [value, setValue] = useState(0);
  console.log("course name", courseName);
  console.log("course id", course_id);

  // retrieve analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const session = await fetchAuthSession();
        var token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/analytics?course_id=${encodeURIComponent(course_id)}`,
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
          console.log("Course analytics:", data);
        } else {
          console.error("Failed to fetch analytics:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container sx={{ flexGrow: 1, p: 3, marginTop: 9, overflow: "auto" }}>
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
        gutterBottom
      >
        {courseName}
      </Typography>
      <Paper>
        <Box mb={4}>
          <Typography
            color="black"
            textAlign="left"
            paddingLeft={10}
            padding={2}
          >
            Student Engagement
          </Typography>
          <LineChart
            width={600}
            height={300}
            data={engagementData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="module" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Engagement"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </Box>
      </Paper>

      <Tabs value={value} onChange={handleChange} aria-label="grade tabs">
        <Tab label="Insights" />
      </Tabs>

      {value === 0 && (
        <Box mt={2}>
          {modulesData.map((module, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{module.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box width="100%">
                  <Grid
                    container
                    spacing={1}
                    alignItems="center"
                    direction="column"
                  >
                    <Grid item width="80%">
                      <Typography textAlign="right">
                        Average Grade: 91%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={module.averageGrade}
                      />
                    </Grid>
                    <Grid item>
                      <Typography>Engagement Details</Typography>
                      <Typography>{module.engagementDetails}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography>Most Asked Concepts</Typography>
                      <Typography>{module.mostAskedConcepts}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default InstructorAnalytics;
