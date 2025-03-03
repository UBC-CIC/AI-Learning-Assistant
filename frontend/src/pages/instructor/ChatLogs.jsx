import {
    Typography,
    Box,
    Toolbar,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { v4 as uuidv4 } from 'uuid';
import { useNotification } from "../../context/NotificationContext";

function courseTitleCase(str) {
    if (typeof str !== "string") {
        return str;
    }
    const words = str.split(" ");
    return words
        .map((word, index) => {
            if (index === 0) {
                return word.toUpperCase();
            } else {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
        })
        .join(" ");
}

export const ChatLogs = ({ courseName, course_id, openWebSocket }) => {
    const [loading, setLoading] = useState(false);
    const [isDownloadButtonEnabled, setIsDownloadButtonEnabled] = useState(false);
    const [previousChatLogs, setPreviousChatLogs] = useState([]);
    const { setNotificationForCourse } = useNotification();

    useEffect(() => {
        checkNotificationStatus();
        fetchChatLogs();

        // Auto-refresh logs every 5 minutes since presigned URLs expire
        const interval = setInterval(fetchChatLogs, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [course_id]);

    const checkNotificationStatus = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();
            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT
                }instructor/check_notifications_status?course_id=${encodeURIComponent(
                    course_id
                )}&instructor_email=${encodeURIComponent(email)}`,
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
                console.log(`Download Chatlogs is ${data.isEnabled}`)
                setIsDownloadButtonEnabled(data.isEnabled);
            } else {
                console.error("Failed to fetch notification status:", response.statusText);
            }
        } catch (error) {
            console.error("Error checking notification status:", error);
        }
    };

    const fetchChatLogs = async () => {
        try {
            setLoading(true);
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();

            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT}instructor/fetch_chatlogs?course_id=${encodeURIComponent(course_id)}&instructor_email=${encodeURIComponent(email)}`,
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
                console.log("Chat logs fetched:", data);
                if (data.log_files) {
                    const formattedLogs = Object.entries(data.log_files).map(([fileName, presignedUrl]) => ({
                        date: convertToLocalTime(fileName), // Using file name as the date
                        presignedUrl: presignedUrl,
                    }));
                    setPreviousChatLogs(formattedLogs);
                } else {
                    setPreviousChatLogs([]);
                }
            } else {
                console.error("Failed to fetch chat logs:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching chat logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const convertToLocalTime = (fileName) => {
        try {
            // Extract timestamp from file name (assuming format: "YYYY-MM-DD HH:MM:SS.csv")
            const match = fileName.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
            if (!match) {
                console.warn("Could not extract a valid timestamp from filename:", fileName);
                return fileName; // Return original name if no timestamp found
            }

            // Convert the extracted UTC timestamp to local time
            const utcDate = new Date(match[0] + " UTC"); // Append UTC to prevent incorrect local parsing
            return utcDate.toLocaleString(undefined, { timeZoneName: "short" }); // Convert to user's local timezone
        } catch (error) {
            console.error("Error converting time:", error);
            return fileName; // Fallback in case of error
        }
    };


    const downloadChatLog = (presignedUrl) => {
        try {
            console.log("Downloading file from:", presignedUrl);
            window.open(presignedUrl, "_blank");
        } catch (error) {
            console.error("Error downloading file:", error);
        }
    };

    const generateCourseMessages = async () => {
        try {
            console.log("openWebSocket function:", openWebSocket);
            if (typeof openWebSocket !== "function") {
                console.error("Error: openWebSocket is not a function!");
                return;
            }
            setIsDownloadButtonEnabled(false);
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();
            const request_id = uuidv4();

            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT}instructor/course_messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        course_id: course_id,
                        instructor_email: email,
                        request_id: request_id,
                    }),
                }
            );

            if (response.ok) {
                console.log(response)
                const data = await response.json();
                console.log("Job submitted successfully:", data);

                // Invoke global WebSocket function from InstructorHomepage and delay checkNotificationStatus slightly
                openWebSocket(courseName, course_id, request_id, setNotificationForCourse, () => {
                    console.log("Waiting before checking notification status...");
                    setTimeout(() => {
                        checkNotificationStatus();
                        fetchChatLogs(); // Fetch latest chat logs after WebSocket completes
                    }, 2000); // Wait 2 seconds before checking
                });
            } else {
                console.error("Failed to submit job:", response.statusText);
            }
        } catch (error) {
            console.error("Error submitting job:", error);
        }
    };


    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", width: "100%" }}>
            <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "90%" }}>
                <Toolbar />
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
                    <Typography color="black" fontStyle="semibold" textAlign="center" variant="h6">
                        {courseName} Chat Logs
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "170%", marginTop: 2, flexDirection: "column", }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={generateCourseMessages}
                            disabled={!isDownloadButtonEnabled}
                        >
                            Generate Classroom Chatlogs
                        </Button>
                    </Box>
                </Box>
                <Paper sx={{ marginTop: 2, flexGrow: 1, height: "calc(100vh - 270px)", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: 2, width: "100%" }}>
                    {loading ? (
                        <Typography variant="body1" color="textSecondary" textAlign="center">
                            Loading chat logs...
                        </Typography>
                    ) : (
                        <Typography variant="body1" color="textSecondary" textAlign="center">
                            {isDownloadButtonEnabled ? "Click the button to generate chat logs" : ""}
                        </Typography>
                    )}
                    {!loading && previousChatLogs.length > 0 && (
                        <TableContainer component={Paper} sx={{ marginTop: 2, overflowY: "auto", width: "100%" }}>
                            <Table sx={{ width: "100%" }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: "50%", textAlign: "center" }}><strong>Date</strong></TableCell>
                                        <TableCell sx={{ width: "50%", textAlign: "center" }}><strong>Download</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previousChatLogs.map((log, index) => (
                                        <TableRow key={index}>
                                            <TableCell sx={{ width: "50%", textAlign: "center" }}>{log.date}</TableCell>
                                            <TableCell sx={{ width: "50%", textAlign: "center" }}>
                                                <Button variant="contained" color="primary" onClick={() => window.open(log.presignedUrl, "_blank")}>
                                                    Download
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

            </Box>
        </div>
    );
};

export default ChatLogs;