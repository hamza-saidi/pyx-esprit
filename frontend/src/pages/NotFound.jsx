import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
      textAlign="center"
    >
      <Typography variant="h1" fontWeight={800} sx={{ fontSize: 80, color: '#e2e8f0', lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Cette page n'existe pas.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')}>
        Retour au tableau de bord
      </Button>
    </Box>
  );
}
