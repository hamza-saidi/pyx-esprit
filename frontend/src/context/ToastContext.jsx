import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);

  const showToast = useCallback((message, severity = 'info') => {
    const id = Date.now() + Math.random();
    setQueue((q) => [...q, { id, message, severity }]);
  }, []);

  const dismiss = (id) => setQueue((q) => q.filter((t) => t.id !== id));

  const current = queue[0] || null;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {current && (
        <Snackbar
          key={current.id}
          open
          autoHideDuration={current.severity === 'error' ? 6000 : 4000}
          onClose={() => dismiss(current.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => dismiss(current.id)}
            severity={current.severity}
            variant="filled"
            sx={{ minWidth: 280, boxShadow: 6, fontSize: 13.5 }}
          >
            {current.message}
          </Alert>
        </Snackbar>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
    warning: (msg) => show(msg, 'warning'),
  };
}
