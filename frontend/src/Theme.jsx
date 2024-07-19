import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#5536DA",
      // contrastText: "#ffffff",
    },
    secondary: {
      main: "#BDBDBD",
      contrastText: "#ffffff",
    },
    background: {
      default: "#F8F9FD",
    },
    // text: {
    //   primary: "#000000",
    //   secondary: "#ffffff",
    // },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
    h1: {
      fontSize: "2rem",
    },
  },
});

export default theme;
