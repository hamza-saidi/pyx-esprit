import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const LoadingOverlay = ({ message = "Chargement en cours..." }) => {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="rgba(255, 255, 255, 0.8)"
      zIndex={1000}
    >
      <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRadius: 2 }}>
        <Box sx={{ width: 72, height: 72, position: 'relative' }}>
          {[0,1,2,3,4,5,6,7,8].map((i) => {
            const row = Math.floor(i/3);
            const col = i % 3;
            const palette = ['#3b3f44', '#bfc9cf', '#8a9298'];
            const color = (row === 1 && col === 1) ? '#0a84d6' : palette[(row+col)%3];
            return (
              <Box
                key={i}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: color,
                  position: 'absolute',
                  top: `${row*28}px`,
                  left: `${col*28}px`,
                  animation: `wave 1.2s ease-in-out ${ (row+col)*0.08 }s infinite`
                }}
              />
            );
          })}
          <style>{`
            @keyframes wave {
              0% { transform: scale(0.85); opacity: .7 }
              40% { transform: scale(1.15); opacity: 1 }
              100% { transform: scale(0.85); opacity: .7 }
            }
          `}</style>
        </Box>
        <Typography variant="body1" color="text.secondary">{message}</Typography>
      </Paper>
    </Box>
  );
};

export default LoadingOverlay;


