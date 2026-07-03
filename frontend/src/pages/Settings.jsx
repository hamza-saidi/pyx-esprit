import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField, Alert,
  CircularProgress, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from '../api/axios';

const MicrosoftLogo = ({ size = 28 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '3px',
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    <Box sx={{ bgcolor: '#f25022', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#7fba00', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#00a4ef', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#ffb900', borderRadius: '2px' }} />
  </Box>
);

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [fromEmail, setFromEmail] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  const [newFromEmail, setNewFromEmail] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await axios.get('/auth/graph/status');
      setStatus(res.data);
      setNewFromEmail(res.data.graph_from_email || '');
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Handle Microsoft redirect params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const connected = params.get('graph_connected');
    const graphError = params.get('graph_error');

    if (connected === 'true') {
      setFeedback({
        type: 'success',
        message: 'Microsoft 365 connecté avec succès. Vos campagnes seront envoyées via Exchange Online.',
      });
      navigate('/settings', { replace: true });
    } else if (graphError) {
      setFeedback({
        type: 'error',
        message: `Échec de la connexion Microsoft : ${decodeURIComponent(graphError)}`,
      });
      navigate('/settings', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    const trimmed = fromEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setFeedback({ type: 'error', message: 'Saisissez une adresse email valide avant de continuer.' });
      return;
    }
    setConnectLoading(true);
    try {
      const res = await axios.get(`/auth/graph/connect?from_email=${encodeURIComponent(trimmed)}`);
      window.location.href = res.data.consentUrl;
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Impossible de générer l\'URL de consentement.',
      });
      setConnectLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    const trimmed = newFromEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setFeedback({ type: 'error', message: 'Adresse email invalide.' });
      return;
    }
    setUpdateLoading(true);
    try {
      await axios.patch('/auth/graph/from-email', { graph_from_email: trimmed });
      setFeedback({ type: 'success', message: 'Adresse expéditeur mise à jour.' });
      setEditingEmail(false);
      fetchStatus();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de la mise à jour.',
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnectLoading(true);
    try {
      await axios.delete('/auth/graph/disconnect');
      setFeedback({ type: 'success', message: 'Microsoft 365 déconnecté. Retour au serveur SMTP par défaut.' });
      setDisconnectOpen(false);
      setEditingEmail(false);
      fetchStatus();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de la déconnexion.',
      });
    } finally {
      setDisconnectLoading(false);
    }
  };

  const consentDate = status?.graph_consent_at
    ? new Date(status.graph_consent_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <Box sx={{ maxWidth: 720 }}>
      {/* Feedback */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{ mb: 3 }}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Microsoft 365 Card */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center" gap={1.75}>
              <MicrosoftLogo size={28} />
              <Box>
                <Typography fontWeight={700} fontSize={16} lineHeight={1.2}>
                  Microsoft 365
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Envoi via Exchange Online · OAuth 2.0 Client Credentials
                </Typography>
              </Box>
            </Box>

            {!loadingStatus && (
              <Chip
                icon={
                  status?.connected ? (
                    <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                  ) : undefined
                }
                label={status?.connected ? 'Connecté' : 'Non connecté'}
                size="small"
                sx={
                  status?.connected
                    ? { bgcolor: '#d1fae5', color: '#059669', fontWeight: 700, border: '1px solid #a7f3d0' }
                    : { bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600 }
                }
              />
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Content */}
          {loadingStatus ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} sx={{ color: '#2563eb' }} />
            </Box>
          ) : status?.connected ? (
            /* ── CONNECTED STATE ── */
            <Box>
              {/* Info grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
                  columnGap: 3,
                  rowGap: 1.5,
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Tenant Azure AD
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 1,
                    px: 1,
                    py: 0.25,
                    display: 'inline-block',
                    fontSize: 12,
                    color: '#475569',
                    wordBreak: 'break-all',
                  }}
                >
                  {status.azure_tenant_id}
                </Typography>

                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Adresse expéditeur
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {status.graph_from_email || '—'}
                </Typography>

                {consentDate && (
                  <>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Consentement accordé
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {consentDate}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Update sender email */}
              <Box
                sx={{
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  p: 2.5,
                  mb: 3,
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={editingEmail ? 2 : 0}>
                  <Box display="flex" alignItems="center" gap={0.75}>
                    <Typography variant="body2" fontWeight={600}>
                      Modifier l'adresse expéditeur
                    </Typography>
                    <Tooltip title="L'adresse doit appartenir à votre tenant Exchange Online. Pas besoin de refaire le consentement.">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                    </Tooltip>
                  </Box>
                  {!editingEmail && (
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setEditingEmail(true)}
                    >
                      Modifier
                    </Button>
                  )}
                </Box>

                {editingEmail && (
                  <Box display="flex" gap={1.5} alignItems="flex-start">
                    <TextField
                      value={newFromEmail}
                      onChange={(e) => setNewFromEmail(e.target.value)}
                      placeholder="noreply@votreclub.com"
                      size="small"
                      fullWidth
                      type="email"
                      autoFocus
                    />
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={handleUpdateEmail}
                      disabled={updateLoading || !newFromEmail}
                      sx={{ flexShrink: 0, minWidth: 110 }}
                    >
                      {updateLoading ? <CircularProgress size={16} color="inherit" /> : 'Mettre à jour'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingEmail(false);
                        setNewFromEmail(status.graph_from_email || '');
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      Annuler
                    </Button>
                  </Box>
                )}
              </Box>

              {/* Disconnect */}
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<LinkOffIcon />}
                  onClick={() => setDisconnectOpen(true)}
                  sx={{ borderColor: '#fecaca', color: '#dc2626', '&:hover': { bgcolor: '#fef2f2', borderColor: '#fca5a5' } }}
                >
                  Déconnecter Microsoft 365
                </Button>
              </Box>
            </Box>
          ) : (
            /* ── DISCONNECTED STATE ── */
            <Box>
              <Typography variant="body2" color="text.secondary" mb={3} lineHeight={1.7}>
                Connectez votre compte Microsoft 365 pour envoyer vos campagnes directement depuis
                votre boîte Exchange Online. Chaque club utilise son propre quota d'envoi (10 000
                emails / jour) — sans partage avec d'autres clubs.
              </Typography>

              <Box mb={2}>
                <Typography variant="body2" fontWeight={600} mb={0.75}>
                  Adresse expéditeur
                </Typography>
                <TextField
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="marketing@votreclub.com"
                  size="small"
                  fullWidth
                  type="email"
                  helperText="L'adresse doit exister dans votre tenant Exchange Online."
                />
              </Box>

              <Button
                variant="contained"
                color="secondary"
                startIcon={
                  connectLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <OpenInNewIcon />
                  )
                }
                onClick={handleConnect}
                disabled={connectLoading || !fromEmail}
                sx={{ mb: 2.5 }}
              >
                {connectLoading ? 'Redirection vers Microsoft…' : 'Connecter Microsoft 365'}
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  bgcolor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <InfoOutlinedIcon sx={{ color: '#3b82f6', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                <Typography variant="caption" color="#1e40af" lineHeight={1.6}>
                  Vous serez redirigé vers Microsoft pour autoriser l'accès. Un{' '}
                  <strong>administrateur IT</strong> de votre organisation doit approuver cette
                  connexion. L'autorisation est valide indéfiniment — vous pouvez la révoquer à
                  tout moment depuis cette page.
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <Dialog
        open={disconnectOpen}
        onClose={() => !disconnectLoading && setDisconnectOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Déconnecter Microsoft 365 ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Les campagnes suivantes seront envoyées via le serveur SMTP par défaut.
            Le token mis en cache sera supprimé immédiatement. Vous pouvez reconnecter à tout moment
            en refaisant la procédure de consentement.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDisconnectOpen(false)} disabled={disconnectLoading}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDisconnect}
            disabled={disconnectLoading}
            sx={{ minWidth: 130 }}
          >
            {disconnectLoading ? <CircularProgress size={16} color="inherit" /> : 'Déconnecter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
