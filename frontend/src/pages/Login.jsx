import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, verifyMfa } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper, Stack } from '@mui/material';

const Login = () => {
  const dispatch = useDispatch();
  const { token, loading, error, mfa } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: '', mot_de_passe: '' });
  const [code, setCode] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(form));
  };

  const handleVerify = (e) => {
    e.preventDefault();
    dispatch(verifyMfa({ pending_token: mfa.pendingToken, code }));
  };

  if (token) return <Navigate to="/" replace />;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5">
      <Paper elevation={3} sx={{ p: 4, minWidth: 350 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={2}>
          <Box component="img" src="/logo.svg" alt="Pylon Pyx" sx={{ height: 44 }} />
        </Stack>
        <Typography variant="h5" mb={2} align="center">Connexion</Typography>
        {!mfa.required ? (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Mot de passe"
              name="mot_de_passe"
              type="password"
              value={form.mot_de_passe}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Se connecter
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <Typography variant="body2" color="text.secondary">Un code de vérification a été envoyé. Saisissez-le pour continuer.</Typography>
            <TextField
              label="Code à 6 chiffres"
              name="code"
              value={code}
              onChange={(e)=> setCode(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ maxLength: 6 }}
              required
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              disabled={loading || !code || code.length < 6}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Vérifier le code
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Login; 