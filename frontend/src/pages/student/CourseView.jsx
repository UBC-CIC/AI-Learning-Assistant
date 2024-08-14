import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";

import { BiCheck } from "react-icons/bi";
import { FaInfoCircle } from "react-icons/fa";
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
  TableFooter,
  TablePagination,
} from "@mui/material";

import { Button, Stepper, Step, StepLabel } from "@mui/material";
import { useNavigate } from "react-router-dom";
// Function to calculate the color based on the average score
const calculateColor = (score) => {
  if (score === null) {
    return "bg-red-500"; // Red for null scores
  }

  const redStart = 255; // Starting red component
  const redEnd = 180; // Ending red component for lighter purple
  const blueStart = 0; // Starting blue component
  const blueEnd = 200; // Ending blue component for lighter purple

  // Calculate the color ratio based on the score (0 to 100)
  const ratio = score / 100;

  // Interpolate between vivid red (255, 0, 0) and lighter purple (180, 0, 200)
  const r = Math.round(redStart + ratio * (redEnd - redStart));
  const g = 0; // Green stays 0 in the gradient
  const b = Math.round(blueStart + ratio * (blueEnd - blueStart));

  return `rgb(${r}, ${g}, ${b})`;
};

// Function to get unique concept names and average scores
function getUniqueConceptNames(data) {
  const conceptMap = new Map();

  // Iterate over the array and populate the Map with unique concept_id as keys and concept_name as values
  data.forEach((item) => {
    if (!conceptMap.has(item.concept_id)) {
      // Calculate the average module score
      const averageScore =
        data
          .filter((d) => d.concept_id === item.concept_id)
          .reduce((acc, curr) => acc + (curr.module_score || 0), 0) /
        data.filter((d) => d.concept_id === item.concept_id).length;

      conceptMap.set(item.concept_id, {
        concept_name: item.concept_name,
        average_score: averageScore,
      });
    }
  });

  // Convert the Map to an array of objects
  return Array.from(
    conceptMap,
    ([concept_id, { concept_name, average_score }]) => ({
      concept_id,
      concept_name,
      average_score,
    })
  );
}

export const CourseView = ({ course, setModule, setCourse }) => {
  console.log(course);
  const [concepts, setConcepts] = useState([]);
  const [data, setData] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRows = rows.filter((row) =>
    row.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigate = useNavigate();
  const enterModule = (module) => {
    setModule(module);
    sessionStorage.setItem("module", JSON.stringify(module));
    navigate(`/student_chat`);
  };

  const handleBack = () => {
    sessionStorage.removeItem("course");
    navigate("/home");
  };

  useEffect(() => {
    const fetchCoursePage = async () => {
      try {
        const session = await fetchAuthSession();
        const { signInDetails } = await getCurrentUser();

        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/course_page?email=${encodeURIComponent(
            signInDetails.loginId
          )}&course_id=${encodeURIComponent(course.course_id)}`,
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
          setData(data);
          setConcepts(getUniqueConceptNames(data));
        } else {
          console.error("Failed to fetch name:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching name:", error);
      }
    };
    fetchCoursePage();
  }, [course]);
  useEffect(() => {
    sessionStorage.removeItem("module");
    const storedCourse = sessionStorage.getItem("course");
    if (storedCourse) {
      setCourse(JSON.parse(storedCourse));
    }
  }, [setCourse]);
  if (!course) {
    return <div>Loading...</div>; // Or any placeholder UI
  }
  return (
    <div className="bg-[#F8F9FD] w-screen h-screen">
      <div>
        <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20">
          <div className="text-black text-4xl font-roboto font-semibold p-4 flex flex-row">
            <img
              onClick={() => handleBack()}
              className="mt-1 mr-2 w-8 h-8 cursor-pointer"
              src="./ArrowCircleDownRounded.png"
              alt="back"
            />
            {course.course_department} {course.course_number}
          </div>
        </header>
        <div className="flex flex-col">
          <div className="text-black text-start text-2xl font-roboto font-semibold p-4 ml-8">
            Learning Journey
          </div>
          <div className="p-4 ml-8 flex flex-row justify-center gap-x-80">
            {concepts.map((concept, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-12 h-12 text-white font-bold rounded-full mb-2"
                  style={{
                    backgroundColor: calculateColor(concept.average_score),
                  }}
                >
                  {concept.average_score === 100 ? (
                    <span className="text-2xl">
                      <BiCheck />
                    </span> // Checkmark for full score
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-black text-start text-lg font-roboto">
                  {concept.concept_name}
                </div>
              </div>
            ))}
          </div>
          <div className="text-black text-start text-2xl font-roboto font-semibold p-4 ml-8">
            Modules
          </div>
          <div className=" flex flex-row justify-between text-black text-xl mt-4 ml-32 font-semibold">
            <div>Module</div>
            <div className="flex flex-row gap-x-[180px] mr-[390px]">
              <div className="py-2">Progress</div>
              <div className="pr-4 py-2">Completion</div>
              <div className=" px-4 py-2">Review</div>
            </div>
          </div>
          {/* <Paper sx={{ width: "170%", overflow: "hidden", marginTop: 2 }}>
            <TableContainer>
              <Table sx={{ maxWidth: 1600, ml: 16, mr: 12 }}>
                {" "}
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: "45%" }}>Module</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Completion</TableCell>
                    <TableCell>Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((entry, index) => (
                      <TableRow
                        key={entry.module_id + index}
                        className=" flex flex-row justify-between text-black text-lg ml-32 font-light"
                      >
                        <TableCell
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1, // Adjust spacing between icon and text
                          }}
                        >
                          <FaInfoCircle style={{ marginTop: "6px" }} />
                          {entry.module_name}
                        </TableCell>

                        {entry.module_score === 100 ? (
                          <>
                            <TableCell>{entry.module_score}%</TableCell>
                            <TableCell>
                              <div
                                style={{
                                  backgroundColor: "#2E7D32",
                                  color: "white",
                                  padding: "8px 16px", // px-4 py-2 translates to 8px 16px padding
                                  borderRadius: "4px", // rounded translates to 4px border radius
                                  fontWeight: "light", // text-light (assuming it's a lighter font weight)
                                  maxWidth: "100px", // Set the maximum width as needed
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Complete
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{entry.module_score}%</TableCell>
                            <TableCell className="px-4 py-2">
                              <div
                                style={{
                                  padding: "8px 16px", // px-4 py-2 translates to 8px 16px padding
                                  borderRadius: "4px", // rounded translates to 4px border radius
                                  fontWeight: "light", // text-light (assuming it's a lighter font weight)
                                  maxWidth: "100px", // Set the maximum width as needed
                                }}
                              >
                                Incomplete
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <button
                            className={`bg-[#9747FF] text-white px-4 rounded py-2 hover:bg-purple-700 ${
                              entry.module_score === 0
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            onClick={() =>
                              entry.module_score !== 0 && enterModule(entry)
                            }
                            disabled={entry.module_score === 0}
                          >
                            Review
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
                <TableFooter sx={{ maxWidth: 1600, ml: 16, mr: 12 }}>
                  <TableRow>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={filteredRows.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Paper> */}
          <div className="flex flex-col mt-8 gap-y-8 max-h-[400px] overflow-auto" >
            {data.map((entry, index) => (
              <div key={entry.module_id + index} >
                <div className=" flex flex-row justify-between text-black text-lg ml-32 font-light">
                  <div className="flex flex-row gap-2">
                    <FaInfoCircle style={{ marginTop: "6px" }} />
                    {entry.module_name}
                  </div>
                  <div className="flex flex-row gap-x-48 mr-[390px]">
                    {entry.module_score === 100 ? (
                      <>
                        <div className="mr-2">{entry.module_score}%</div>
                        <div className="bg-[#2E7D32] text-white text-light px-4 py-2 rounded">
                          Complete
                        </div>
                      </>
                    ) : (
                      <>
                        <div>{entry.module_score}%</div>
                        <div className="px-4 py-2">Incomplete</div>
                      </>
                    )}
                    <button
                      className={`bg-[#9747FF] text-white px-4 rounded py-2 hover:bg-purple-700 ${
                        entry.module_score === 0
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      onClick={() =>
                        entry.module_score !== 0 && enterModule(entry)
                      }
                      disabled={entry.module_score === 0}
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseView;
