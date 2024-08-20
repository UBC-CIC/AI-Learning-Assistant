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

const InstructorAnalytics = ({ courseName, course_id }) => {
  const [value, setValue] = useState(0);
  const [graphData, setGraphData] = useState([]);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken.toString();
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
          const analytics_data = await response.json();
          console.log(analytics_data)
          setData(analytics_data);
          const graphDataFormatted = analytics_data.map((module) => ({
            module: module.module_name,
            Messages: module.message_count,
          }));
          setGraphData(graphDataFormatted);

          console.log("Course analytics:", graphDataFormatted);
        } else {
          console.error("Failed to fetch analytics:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, [course_id]);

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
            Message Count
          </Typography>
          <LineChart
            width={600}
            height={300}
            data={graphData}
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
              dataKey="Messages"
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
          {data.map((module, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{module.module_name}</Typography>
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
                        Average Grade: {module.average_score}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={module.average_score}
                      />
                    </Grid>
                    <Grid item>
                      <Typography>Message Count</Typography>
                      <Typography>{module.message_count}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography>Access Count</Typography>
                      <Typography>{module.access_count}</Typography>
                    </Grid>
                    <Grid item>
                      <Typography>Completion Percentage</Typography>
                      <Typography>{module.perfect_score_percentage}</Typography>
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
