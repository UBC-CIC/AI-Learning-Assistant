import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

import { BiCheck } from "react-icons/bi";
import { FaInfoCircle } from "react-icons/fa";


import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
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

function titleCase(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.toLowerCase().split(' ').map(function(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}


export const CourseView = ({ course, setModule, setCourse }) => {
  const [concepts, setConcepts] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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
        const { email } = await fetchUserAttributes();
      
        const token = session.tokens.idToken.toString();
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/course_page?email=${encodeURIComponent(
            email
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
          setLoading(false);
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

  if (loading) {
    return (
      <div className="bg-[#F8F9FD] w-screen flex justify-center items-center h-screen">
        <l-helix size="50" speed="2.5" color="#d21adb"></l-helix>
      </div>
    ); // Display custom loading animation
  }

  if (!course) {
    return <div>Loading...</div>; // Or any placeholder UI
  }

  return (
    <div className="bg-[#F8F9FD] w-screen h-screen">
      <header className="bg-[#F8F9FD] p-2 flex justify-between items-center max-h-20">
        <div className="text-black text-xl font-roboto font-semibold p-2 flex flex-row">
          <img
            onClick={() => handleBack()}
            className="mt-1 mr-2 w-6 h-6 cursor-pointer"
            src="./ArrowCircleDownRounded.png"
            alt="back"
          />
          {course.course_department.toUpperCase()} {course.course_number}
        </div>
      </header>
      <div className="flex flex-col">
        <div className="text-black text-start text-lg font-roboto font-semibold p-2 ml-4">
          Learning Journey
        </div>
        <div className="p-2 ml-4 flex flex-row justify-center gap-x-20">
          {concepts.map((concept, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className="flex items-center justify-center w-8 h-8 text-white font-bold rounded-full mb-2"
                style={{
                  backgroundColor: calculateColor(concept.average_score),
                }}
              >
                {concept.average_score === 100 ? (
                  <span className="text-xl">
                    <BiCheck />
                  </span>
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-black text-start text-sm font-roboto">
                {titleCase(concept.concept_name)}
              </div>
            </div>
          ))}
        </div>
        <div className="text-black text-start text-lg font-roboto font-semibold p-2 ml-4">
          Modules
        </div>
        <div className="flex justify-center items-center">
          {data.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No concepts/modules to display</div>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                width: "80%", 
                maxHeight: "60vh", 
                overflowY: "auto",
                marginX: 2,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Module</TableCell>
                    <TableCell>Completion</TableCell>
                    <TableCell>Review</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((entry, index) => (
                    <TableRow key={entry.module_id + index}>
                      <TableCell>
                        <div className="flex flex-row gap-1 items-center">
                          <FaInfoCircle className="text-xs" />
                          <span className="text-xs">{titleCase(entry.module_name)}</span>
                        </div>
                      </TableCell>
                      {entry.module_score === 100 ? (
                        <TableCell>
                          <span
                            className="bg-[#2E7D32] text-white text-light rounded px-2 py-2"
                            style={{ display: "inline-block" }}
                          >
                            Complete
                          </span>
                        </TableCell>
                      ) : (
                        <TableCell>Incomplete</TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => enterModule(entry)}
                          sx={{ textTransform: 'none' }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseView;
