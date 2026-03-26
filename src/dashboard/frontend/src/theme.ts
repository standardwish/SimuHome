import { alpha, createTheme } from "@mui/material/styles";
import UbuntuBold from "./assets/fonts/Ubuntu-Bold.ttf";
import UbuntuBoldItalic from "./assets/fonts/Ubuntu-BoldItalic.ttf";
import UbuntuItalic from "./assets/fonts/Ubuntu-Italic.ttf";
import UbuntuLight from "./assets/fonts/Ubuntu-Light.ttf";
import UbuntuLightItalic from "./assets/fonts/Ubuntu-LightItalic.ttf";
import UbuntuMedium from "./assets/fonts/Ubuntu-Medium.ttf";
import UbuntuMediumItalic from "./assets/fonts/Ubuntu-MediumItalic.ttf";
import UbuntuRegular from "./assets/fonts/Ubuntu-Regular.ttf";

const ink = "#111827";
const steel = "#4b5563";
const line = "rgba(17, 24, 39, 0.12)";
const lineStrong = "rgba(17, 24, 39, 0.2)";
const accent = "#0f766e";
const accentSoft = "#dff3ef";
const warning = "#9a3412";
const paper = "#f9f7f2";
const shell = "#efebe2";

export const dashboardTheme = createTheme({
  cssVariables: true,
  shape: {
    borderRadius: 6,
  },
  palette: {
    mode: "light",
    primary: {
      main: accent,
      dark: "#115e59",
      light: accentSoft,
      contrastText: "#f8fffd",
    },
    secondary: {
      main: warning,
      light: "#fed7aa",
      dark: "#7c2d12",
    },
    text: {
      primary: ink,
      secondary: steel,
    },
    divider: line,
    background: {
      default: shell,
      paper,
    },
  },
  typography: {
    fontFamily: '"Ubuntu", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.05em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.035em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    overline: {
      fontWeight: 700,
      letterSpacing: "0.14em",
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Ubuntu';
          font-style: normal;
          font-display: swap;
          font-weight: 300;
          src: local('Ubuntu Light'), url(${UbuntuLight}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: italic;
          font-display: swap;
          font-weight: 300;
          src: local('Ubuntu Light Italic'), url(${UbuntuLightItalic}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
          src: local('Ubuntu'), local('Ubuntu Regular'), url(${UbuntuRegular}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: italic;
          font-display: swap;
          font-weight: 400;
          src: local('Ubuntu Italic'), url(${UbuntuItalic}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: normal;
          font-display: swap;
          font-weight: 500;
          src: local('Ubuntu Medium'), url(${UbuntuMedium}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: italic;
          font-display: swap;
          font-weight: 500;
          src: local('Ubuntu Medium Italic'), url(${UbuntuMediumItalic}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: normal;
          font-display: swap;
          font-weight: 700;
          src: local('Ubuntu Bold'), url(${UbuntuBold}) format('truetype');
        }
        @font-face {
          font-family: 'Ubuntu';
          font-style: italic;
          font-display: swap;
          font-weight: 700;
          src: local('Ubuntu Bold Italic'), url(${UbuntuBoldItalic}) format('truetype');
        }

        :root {
          color: ${ink};
          background:
            linear-gradient(180deg, rgba(255,255,255,0.64), rgba(255,255,255,0)),
            repeating-linear-gradient(
              90deg,
              rgba(17, 24, 39, 0.03) 0,
              rgba(17, 24, 39, 0.03) 1px,
              transparent 1px,
              transparent 92px
            ),
            ${shell};
        }

        html,
        body,
        #root {
          min-height: 100%;
        }

        body {
          margin: 0;
          color: ${ink};
          background:
            radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 22%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0)),
            ${shell};
        }

        * {
          box-sizing: border-box;
        }

        ::selection {
          background: rgba(15, 118, 110, 0.18);
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#f8f5ef", 0.88),
          backdropFilter: "blur(20px)",
          border: "none",
          borderBottom: "none",
          borderRadius: 0,
          boxShadow: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: paper,
          borderRadius: 6,
          border: `1px solid ${line}`,
          boxShadow: "0 18px 40px rgba(17, 24, 39, 0.04)",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 40,
          paddingInline: 16,
          fontWeight: 700,
        },
        contained: {
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 700,
          borderColor: lineStrong,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          alignItems: "flex-start",
          justifyContent: "flex-start",
          minHeight: 44,
          paddingInline: 12,
          paddingBlock: 8,
          borderBottom: "2px solid transparent",
          fontWeight: 700,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          backgroundColor: accent,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: "#fcfbf8",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: lineStrong,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(accent, 0.55),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: accent,
            borderWidth: 1,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${lineStrong}`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: line,
        },
      },
    },
  },
});
