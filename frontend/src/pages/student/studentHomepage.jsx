import React from "react";
import StudentHeader from "../../components/studentHeader";
import Container from "../container";
// MUI
import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  Stack,
  Skeleton,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
// MUI theming
const { palette } = createTheme();
const { augmentColor } = palette;
const createColor = (mainColor) => augmentColor({ color: { main: mainColor } });
const theme = createTheme({
  palette: {
    primary: createColor("#5536DA"),
    bg: createColor("#F8F9FD"),
  },
});

export const StudentHomepage = () => {
  return (
    <ThemeProvider theme={theme}>
      <div>
        <StudentHeader />
        <Container>
          <Grid
            container
            direction="row"
            // justifyContent="space-evenly"
            alignItems="flex-start"
            wrap="nowrap"
            columns={12}
          >
            <Grid item xs={6}>
              <Stack>
                <Typography
                  component="h1"
                  variant="h5"
                  color="black"
                  sx={{ fontWeight: "500", mb: 2 }}
                  paddingLeft={3}
                  textAlign="left"
                >
                  Continue where you left off.
                </Typography>
                <Box
                  paddingLeft={3}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: 1000,
                      minWidth: 500,
                      bgcolor: "bg",
                    }}
                  >
                    <CardContent>
                      <Grid container alignItems="center">
                        <Grid item xs={8}>
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ textAlign: "left", fontWeight: "medium" }}
                          >
                            Course Name
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: "right" }}>
                          <Button
                            size="small"
                            sx={{
                              bgcolor: "purple",
                              color: "white",
                              ":hover": { bgcolor: "purple" },
                            }}
                          >
                            Continue
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
                <Typography
                  component="h1"
                  variant="h5"
                  color="black"
                  sx={{ fontWeight: "500", mb: 2 }}
                  paddingLeft={3}
                  paddingTop={5}
                  textAlign="left"
                >
                  Courses
                </Typography>
                <Box
                  paddingLeft={3}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: 1000,
                      minWidth: 500,
                      bgcolor: "bg",
                    }}
                  >
                    <CardContent>
                      <Grid container alignItems="center">
                        <Grid item xs={8}>
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ textAlign: "left", fontWeight: "medium" }}
                          >
                            Course Name
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: "right" }}>
                          <Button
                            size="small"
                            sx={{
                              bgcolor: "purple",
                              color: "white",
                              ":hover": { bgcolor: "purple" },
                            }}
                          >
                            Start
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
                <Box
                  paddingLeft={3}
                  paddingTop={3}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: 1000,
                      minWidth: 500,
                      bgcolor: "bg",
                    }}
                  >
                    <CardContent>
                      <Grid container alignItems="center">
                        <Grid item xs={8}>
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ textAlign: "left", fontWeight: "medium" }}
                          >
                            Course Name
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: "right" }}>
                          <Button
                            size="small"
                            sx={{
                              bgcolor: "purple",
                              color: "white",
                              ":hover": { bgcolor: "purple" },
                            }}
                          >
                            Start
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={6}>
              <Box
                paddingLeft={2}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "left",
                }}
              >
                <Typography
                  component="h1"
                  variant="h5"
                  color="black"
                  sx={{ fontWeight: "500", mb: 2 }}
                  paddingLeft={0}
                  paddingTop={0}
                  textAlign="right"
                >
                  Your progress
                </Typography>
                <Skeleton variant="rectangular" width={500} height={100} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </div>
    </ThemeProvider>
  );
};

export default StudentHomepage;
