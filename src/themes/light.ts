import { createMuiTheme } from "@material-ui/core";
import green from "@material-ui/core/colors/green";

export const lightTheme = createMuiTheme({
  typography: {
    button: {
      textTransform: "none"
    }
  },
  palette: {
    type: "light",
    primary: {
      main: "#0091ea"
    }
  },
  overrides: {
    MuiFab: {
      root: {
        backgroundColor: green[500],
        color: "#fff"
      }
    }
  }
});
