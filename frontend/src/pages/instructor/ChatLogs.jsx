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
import { useState, useEffect, useRef } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Function to capitalize course title case
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

// Function to dynamically construct WebSocket URL
const constructWebSocketUrl = () => {
    const tempUrl = import.meta.env.VITE_GRAPHQL_WS_URL;
    const apiUrl = tempUrl.replace("https://", "wss://");
    const urlObj = new URL(apiUrl);
    const tmpObj = new URL(tempUrl);

    const modifiedHost = urlObj.hostname.replace(
        "appsync-api",
        "appsync-realtime-api"
    );

    urlObj.hostname = modifiedHost;
    const host = tmpObj.hostname;

    const header = {
        host: host,
        Authorization: "API_KEY=",
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const payload = "e30=";

    return `${urlObj.toString()}?header=${encodedHeader}&payload=${payload}`;
};

const ChatLogs = ({ courseName }) => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [loading, setLoading] = useState(false);
    const [webSocket, setWebSocket] = useState(null);

    const messagesEndRef = useRef(null);

    const fetchChatLogs = async () => {
        try {
            setLoading(true);
            const session = await fetchAuthSession();
            const token = session.tokens.idToken;
            const { email } = await fetchUserAttributes();

            const response = await fetch(
                `${import.meta.env.VITE_API_ENDPOINT}instructor/course_messages`,
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
                `${import.meta.env.VITE_API_ENDPOINT}generate-chat-logs`,
                {
                    method: "POST",
                    headers: {
                        Authorization: token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        instructor_email: email,
                        course_id,
                    }),
                }
            );

            if (response.ok) {
                toast.success("Generating Chat Logs...", {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: true,
                    theme: "colored",
                });
            } else {
                toast.error("Failed to generate chat logs", {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: true,
                    theme: "colored",
                });
            }
        } catch (error) {
            console.error("Error initiating CSV generation:", error);
            toast.error("Failed to generate chat logs", {
                position: "top-center",
                autoClose: 1000,
                hideProgressBar: true,
                theme: "colored",
            });
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

    const openWebSocket = () => {
        const wsUrl = constructWebSocketUrl();
        const ws = new WebSocket(wsUrl, "graphql-ws");

        ws.onopen = () => {
            console.log("WebSocket connection established");

            const initMessage = { type: "connection_init" };
            ws.send(JSON.stringify(initMessage));

            const subscriptionMessage = {
                id: "1", // Unique ID for the subscription
                type: "start",
                payload: {
                    data: `{"query":"subscription OnNotify { onNotify { message } }"}`,
                    extensions: {
                        authorization: {
                            Authorization: "API_KEY=",
                        },
                    },
                },
            };
            ws.send(JSON.stringify(subscriptionMessage));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received:", message);

            if (message.type === "data" && message.payload?.data?.onNotify) {
                toast.success("Ready to download requested logs", {
                    position: "top-center",
                    autoClose: 1000,
                    hideProgressBar: true,
                    theme: "colored",
                });
                fetchChatLogs();
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };

        setWebSocket(ws);
    };

    useEffect(() => {
        fetchChatLogs();
        openWebSocket();

        return () => {
            if (webSocket) {
                webSocket.close();
            }
        };
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
            <ToastContainer />
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
