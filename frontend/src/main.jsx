import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a',
      light: '#1e293b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    success: { main: '#10b981', light: '#d1fae5', contrastText: '#ffffff' },
    warning: { main: '#f59e0b', light: '#fef3c7', contrastText: '#ffffff' },
    error: { main: '#ef4444', light: '#fee2e2', contrastText: '#ffffff' },
    info: { main: '#0ea5e9', light: '#e0f2fe', contrastText: '#ffffff' },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },
    divider: '#e2e8f0',
    action: {
      hover: '#f1f5f9',
      selected: '#eff6ff',
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.005em' },
    subtitle1: { fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontWeight: 600, lineHeight: 1.4, color: '#475569' },
    body1: { lineHeight: 1.6, fontSize: 15 },
    body2: { lineHeight: 1.5, fontSize: 13 },
    caption: { fontSize: 12, lineHeight: 1.4, color: '#64748b' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0, fontSize: 14 },
    overline: { textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: 11 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '*::-webkit-scrollbar': { width: '6px', height: '6px' },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: '3px' },
        '*::-webkit-scrollbar-thumb:hover': { background: '#94a3b8' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 600,
          fontSize: 14,
          transition: 'all 0.15s ease',
        },
        sizeSmall: { padding: '5px 12px', fontSize: 13 },
        sizeLarge: { padding: '12px 24px', fontSize: 15 },
        containedPrimary: {
          backgroundColor: '#0f172a',
          '&:hover': { backgroundColor: '#1e293b' },
        },
        containedSecondary: {
          backgroundColor: '#2563eb',
          '&:hover': { backgroundColor: '#1d4ed8' },
        },
        outlined: {
          borderColor: '#e2e8f0',
          color: '#0f172a',
          '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
        },
        text: {
          color: '#0f172a',
          '&:hover': { backgroundColor: '#f1f5f9' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: '#cbd5e1',
            boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { '&:last-child': { paddingBottom: 20 } },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          fontSize: 14,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94a3b8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2563eb',
            borderWidth: '1.5px',
          },
        },
        notchedOutline: { borderColor: '#e2e8f0' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 14, color: '#64748b' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: 12,
          height: 24,
        },
        colorDefault: { backgroundColor: '#f1f5f9', color: '#475569' },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { border: '1px solid #e2e8f0', borderRadius: 12 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& th': {
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            color: '#64748b',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 11,
            letterSpacing: '0.07em',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f8fafc' },
          '& td': { borderBottom: '1px solid #f1f5f9', padding: '12px 16px', fontSize: 14 },
          '&:last-child td': { borderBottom: 'none' },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: '1px solid #e2e8f0' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: 18, paddingBottom: 8 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { border: 'none' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e2e8f0' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: 14, alignItems: 'center' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#e2e8f0' },
        bar: { borderRadius: 4 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { borderRadius: 6, fontSize: 12 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { fontSize: 14 },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 6 },
        thumb: { boxShadow: 'none' },
        track: { borderRadius: 8, opacity: 1, backgroundColor: '#e2e8f0' },
        switchBase: {
          '&.Mui-checked': {
            '& + .MuiSwitch-track': { backgroundColor: '#2563eb', opacity: 1 },
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 700, fontSize: 11 },
      },
    },
  },
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
