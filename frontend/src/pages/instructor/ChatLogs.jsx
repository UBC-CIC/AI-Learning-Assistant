import {
    Typography,
    Box,
    Toolbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TableFooter,
    TablePagination,
} from "@mui/material";
import { useState, useEffect } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

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

const ChatLogs = ({ courseName }) => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [loading, setLoading] = useState(false);

    const fetchChatLogs = async () => {
        try {
            setLoading(true);
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();

            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT}instructor/fetch_chat_logs`,
                {
                    method: "POST",
                    headers: {
                        Authorization: token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instructor_email: email,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setLogs(Object.entries(data.logs || {})); // Convert hashmap to array for rendering
            } else {
                console.error("Failed to fetch chat logs:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching chat logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const generateChatLogs = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();

            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT}instructor/generate_chat_logs`,
                {
                    method: "POST",
                    headers: {
                        Authorization: token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instructor_email: email,
                    }),
                }
            );

            if (response.ok) {
                alert("Chat logs generation started!");
                fetchChatLogs(); // Refresh the logs after generating
            } else {
                console.error("Failed to generate chat logs:", response.statusText);
            }
        } catch (error) {
            console.error("Error generating chat logs:", error);
        }
    };

    const handleDownload = async (url) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = "chat_logs.csv";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                console.error("Failed to download file:", response.statusText);
            }
        } catch (error) {
            console.error("Error downloading file:", error);
        }
    };

    useEffect(() => {
        fetchChatLogs();
    }, []);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1 }}>
            <Toolbar />
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 2,
                }}
            >
                <Typography
                    color="black"
                    fontStyle="semibold"
                    textAlign="left"
                    variant="h6"
                >
                    {courseTitleCase(courseName)} Chat History
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={generateChatLogs}
                    disabled={loading}
                >
                    Generate Chat Logs
                </Button>
            </Box>
            <Paper sx={{ width: "100%", overflow: "hidden", marginTop: 2 }}>
                <TableContainer sx={{ maxHeight: "60vh", overflowY: "auto" }}>
                    <Table aria-label="chat logs table">
                        {!loading ? (
                            <>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: "50%" }}>Generated Time</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.length > 0 ? (
                                        logs
                                            .slice(
                                                page * rowsPerPage,
                                                page * rowsPerPage + rowsPerPage
                                            )
                                            .map(([time, url], index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{time}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="contained"
                                                            color="secondary"
                                                            onClick={() => handleDownload(url)}
                                                        >
                                                            Download
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} align="center">
                                                No chat logs available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </>
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        )}
                        <TableFooter>
                            <TableRow>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={logs.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default ChatLogs;
