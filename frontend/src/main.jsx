import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Logo-aligned palette with refined contrast
// Mailchimp-inspired palette
const palette = {
  mode: 'light',
  primary: { 
    main: '#3b3f44', // Dark Grey from logo
    contrastText: '#FFFFFF' 
  },
  secondary: { 
    main: '#0a84d6', // Blue from logo
    contrastText: '#FFFFFF' 
  },
  background: { 
    default: '#FFFFFF', // Mailchimp uses white heavily
    paper: '#FFFFFF' 
  },
  text: { 
    primary: '#3b3f44', 
    secondary: '#8a9298' 
  },
  divider: '#bfc9cf',
  action: {
    active: '#3b3f44',
    hover: '#F5F7F9',
    selected: '#0a84d6',
  }
};

const theme = createTheme({
  palette,
  shape: { borderRadius: 2 }, // Mailchimp uses sharper corners or very subtle rounding
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h2: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h3: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h4: { fontFamily: 'Georgia, serif', fontWeight: 700 },
    h5: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: -0.2 },
    h6: { fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: -0.2 },
    subtitle1: { fontWeight: 500 },
    body1: { fontSize: 16, lineHeight: 1.5, color: '#3b3f44' },
    body2: { fontSize: 14, lineHeight: 1.4, color: '#8a9298' },
    button: { 
      textTransform: 'none', 
      fontWeight: 700, 
      fontSize: 15,
      letterSpacing: 0.3 
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { 
          backgroundColor: '#FFFFFF',
          color: '#3b3f44',
          fontFamily: '"Inter", sans-serif'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#3b3f44',
          boxShadow: 'none',
          borderBottom: '1px solid #bfc9cf'
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 0, // Flat design
          padding: '10px 24px',
          border: '1px solid #3b3f44',
          '&:hover': {
            backgroundColor: '#3b3f44',
            color: '#FFFFFF'
          }
        },
        containedPrimary: {
          backgroundColor: '#3b3f44',
          '&:hover': {
            backgroundColor: '#2d3034'
          }
        },
        containedSecondary: {
          backgroundColor: '#0a84d6',
          color: '#FFFFFF',
          border: '1px solid #0a84d6',
          '&:hover': {
            backgroundColor: '#0761a0'
          }
        },
        outlined: {
          borderColor: '#3b3f44',
          color: '#3b3f44',
          '&:hover': {
            backgroundColor: '#F5F7F9',
            borderColor: '#3b3f44'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #bfc9cf',
          borderRadius: 0
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: '1px solid #bfc9cf',
          '&:hover': {
            borderColor: '#3b3f44'
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #bfc9cf'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#0a84d6',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#0a84d6'
            },
            '& .MuiListItemIcon-root': {
              color: '#FFFFFF'
            }
          },
          '&:hover': {
            backgroundColor: '#F5F7F9'
          }
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& th': {
            backgroundColor: '#FFFFFF',
            borderBottom: '2px solid #3b3f44',
            color: '#3b3f44',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 12,
            letterSpacing: 1
          }
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
