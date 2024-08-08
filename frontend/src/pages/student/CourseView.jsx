import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { getCurrentUser } from "aws-amplify/auth";

import { BiCheck } from "react-icons/bi";
import { FaInfoCircle } from "react-icons/fa";

import { Button, Stepper, Step, StepLabel } from "@mui/material";
import { useNavigate } from "react-router-dom";
const sampleData = [
  {
    concept_id: "1aaf566b-6800-48f6-91ac-67e43bf86c9b",
    concept_name: "Concept A",
    module_id: "9fe8ae5f-08b6-4bb3-b632-f4200c8bf4d5",
    module_name: "Module 1",
    module_number: 1,
    module_score: 75,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
  {
    concept_id: "1aaf566b-6800-48f6-91ac-67e43bf86c9b",
    concept_name: "Concept A",
    module_id: "4bd1e3ea-5189-44bc-bafa-6da8fa9a8217",
    module_name: "Module 2",
    module_number: 2,
    module_score: 75,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
  {
    concept_id: "81188f5f-566d-498d-b835-6dd020f9e01b",
    concept_name: "Concept B",
    module_id: "8e789fea-516a-4122-9b65-96a00c0bb7af",
    module_name: "Basic Algorithms",
    module_number: 1,
    module_score: 0,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
  {
    concept_id: "81188f5f-566d-498d-b835-6dd020f9e01b",
    concept_name: "Concept B",
    module_id: "cf6f187e-a9e2-44c2-9607-eefa1039862a",
    module_name: "Advanced Algorithms",
    module_number: 2,
    module_score: 0,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
  {
    concept_id: "81188f5f-566d-498d-b835-6dd020f9e01b",
    concept_name: "Concept B",
    module_id: "4bd1e3ea-5189-44bc-bafa-6da8fa9a8217",
    module_name: "Data Structures",
    module_number: 3,
    module_score: 0,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
  {
    concept_id: "2aaf566b-6800-48f6-91ac-67e43bf86c9b",
    concept_name: "Concept C",
    module_id: "9fe8ae5f-08b6-4bb3-b632-f4200c8bf4d5",
    module_name: "Introduction to Algorithms",
    module_number: 1,
    module_score: 100,
    last_accessed: null,
    module_context_embedding: null,
    student_module_id: null,
  },
];
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
    sessionStorage.removeItem("module")
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
          <div className=" flex flex-row justify-between text-black text-xl ml-32 font-semibold">
            <div>Module</div>
            <div className="flex flex-row gap-x-[180px] mr-[390px]">
              <div className="py-2">Progress</div>
              <div className="pr-4 py-2">Completion</div>
              <div className=" px-4 py-2">Review</div>
            </div>
          </div>
          <div className="flex flex-col mt-8 gap-y-8 max-h-[300px] overflow-auto">
            {data.map((entry, index) => (
              <div key={entry.module_id + index}>
                <div className=" flex flex-row justify-between text-black text-lg ml-32 font-light">
                  <div className="flex flex-row gap-2">
                    <FaInfoCircle style={{ marginTop: "6px" }} />
                    {entry.module_name}
                  </div>
                  <div className="flex flex-row gap-x-48 mr-[390px]">
                    <div>{entry.module_score}%</div>
                    {entry.module_score === 100 ? (
                      <div className="bg-[#2E7D32] text-white text-light px-4 py-2 rounded">
                        Complete
                      </div>
                    ) : (
                      <div className="px-4 py-2">Incomplete</div>
                    )}
                    <button
                      className="bg-[#9747FF] text-white px-4 rounded py-2 hover:bg-purple-700"
                      onClick={() => enterModule(entry)}
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
