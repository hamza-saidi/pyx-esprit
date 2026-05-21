import React, { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import axios from '../api/axios';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState({
    loading: true,
    success: false,
    message: '',
    email: '',
  });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!token) {
        if (mounted) {
          setState({
            loading: false,
            success: false,
            message: 'Lien de désabonnement invalide (token manquant).',
            email: '',
          });
        }
        return;
      }
      try {
        const res = await axios.post('/mailer/unsubscribe', { token });
        if (!mounted) return;
        setState({
          loading: false,
          success: true,
          message: res.data?.message || 'Vous avez été désabonné avec succès.',
          email: res.data?.email || '',
        });
      } catch (err) {
        if (!mounted) return;
        const message = err?.response?.data?.message || 'Une erreur est survenue. Merci de réessayer plus tard.';
        setState({
          loading: false,
          success: false,
          message,
          email: '',
        });
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#f5f5f5',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {state.loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress />
            <Typography>Traitement de votre demande...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {state.success ? 'Désabonnement confirmé' : 'Désabonnement'}
            </Typography>
            <Typography color={state.success ? 'success.main' : 'error.main'} sx={{ mb: 2 }}>
              {state.message}
            </Typography>
            {state.email && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Adresse concernée: <strong>{state.email}</strong>
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Vous pourrez vous réinscrire à tout moment en nous contactant ou via nos formulaires.
            </Typography>
            <Button component={RouterLink} to="/" variant="contained">
              Retour au site
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Unsubscribe;













