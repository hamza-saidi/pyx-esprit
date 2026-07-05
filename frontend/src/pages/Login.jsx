import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, verifyMfa } from '../features/auth/authSlice';
import { Navigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';

const Login = () => {
  const dispatch = useDispatch();
  const { token, loading, error, mfa } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: '', mot_de_passe: '' });
  const [code, setCode] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
    <Box display="flex" minHeight="100vh">
      {/* Left panel — brand */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: '42%',
          flexShrink: 0,
          bgcolor: '#0f172a',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.12,
            background:
              'radial-gradient(circle at 25% 75%, #38bdf8 0%, transparent 55%), radial-gradient(circle at 75% 20%, #2563eb 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo + tagline */}
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="Pylon Pyx"
            sx={{ height: 32, filter: 'brightness(0) invert(1)', mb: 4 }}
          />
          <Typography
            sx={{
              color: '#f8fafc',
              fontSize: { md: 26, lg: 30 },
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
            }}
          >
            Envoyez plus,
            <br />
            <Box component="span" sx={{ color: '#38bdf8' }}>
              convertissez
            </Box>{' '}
            mieux.
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 2, fontSize: 14, lineHeight: 1.6 }}>
            Plateforme d&apos;email marketing multi-tenant — contacts, segments,
            campagnes et automatisations dans un seul outil.
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ position: 'relative' }}>
          <Box display="flex" gap={4} mb={5}>
            {[
              { value: '10k+', label: 'Emails / jour' },
              { value: '98%', label: 'Délivrabilité' },
              { value: '< 2s', label: 'Temps de réponse' },
            ].map(({ value, label }) => (
              <Box key={label}>
                <Typography sx={{ color: '#38bdf8', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                  {value}
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: 12, mt: 0.25 }}>{label}</Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ color: '#334155', fontSize: 12 }}>
            © {new Date().getFullYear()} Pylon Pyx · Tous droits réservés
          </Typography>
        </Box>
      </Box>

      {/* Right panel — form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: '#f8fafc',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 5 }}>
            <Box component="img" src="/logo.svg" alt="Pylon Pyx" sx={{ height: 28 }} />
            <Typography fontWeight={800} fontSize={18} letterSpacing="-0.02em">
              Pylon Pyx
            </Typography>
          </Box>

          {!mfa.required ? (
            <>
              <Typography variant="h4" fontWeight={800} mb={0.75}>
                Connexion
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={4}>
                Bienvenue — accédez à votre tableau de bord.
              </Typography>
              <form onSubmit={handleSubmit}>
                <TextField
                  label="Adresse email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  required
                  autoComplete="email"
                  autoFocus
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
                  autoComplete="current-password"
                />
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  fullWidth
                  size="large"
                  sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Se connecter'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Typography variant="h4" fontWeight={800} mb={0.75}>
                Vérification
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Un code à 6 chiffres a été envoyé à votre adresse email.
              </Typography>
              <form onSubmit={handleVerify}>
                <TextField
                  label="Code de vérification"
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  fullWidth
                  margin="normal"
                  inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                  required
                  autoFocus
                />
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  fullWidth
                  size="large"
                  sx={{ mt: 3 }}
                  disabled={loading || !code || code.length < 6}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Vérifier'}
                </Button>
              </form>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
