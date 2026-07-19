import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField, Alert,
  CircularProgress, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Tooltip, Tabs, Tab, Switch, FormControlLabel,
  InputAdornment, IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axios from '../api/axios';

// ── Microsoft logo ─────────────────────────────────────────────────────────
const MicrosoftLogo = ({ size = 24 }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', width: size, height: size, flexShrink: 0 }}>
    <Box sx={{ bgcolor: '#f25022', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#7fba00', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#00a4ef', borderRadius: '2px' }} />
    <Box sx={{ bgcolor: '#ffb900', borderRadius: '2px' }} />
  </Box>
);

// ── Provider card ──────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'smtp',
    label: 'SMTP personnalisé',
    desc: 'N\'importe quel serveur mail SMTP',
    logo: (
      <Box sx={{ width: 24, height: 24, bgcolor: '#0f172a', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>@</Typography>
      </Box>
    ),
    color: '#0f172a',
  },
  {
    id: 'graph',
    label: 'Microsoft 365',
    desc: 'Exchange Online · OAuth 2.0',
    logo: <MicrosoftLogo size={24} />,
    color: '#0078d4',
  },
];

// ── Main component ─────────────────────────────────────────────────────────
const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // SMTP form state
  const [selectedProvider, setSelectedProvider] = useState('smtp');
  const [smtpForm, setSmtpForm] = useState({
    host: '', port: 587, secure: false, user: '', pass: '',
  });
  const [fromForm, setFromForm] = useState({ address: '', name: '' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Graph state
  const [fromEmail, setFromEmail] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [newFromEmail, setNewFromEmail] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  // Test email
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  // MFA TOTP (app-based two-factor authentication)
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaStatusLoading, setMfaStatusLoading] = useState(true);
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaSettingUp, setMfaSettingUp] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await axios.get('/settings/email');
      setSettings(res.data);
      const p = res.data.email_provider || (res.data.graph?.connected ? 'graph' : 'smtp');
      setSelectedProvider(p);
      setSmtpForm({
        host: res.data.smtp?.host || '',
        port: res.data.smtp?.port || 587,
        secure: res.data.smtp?.secure || false,
        user: res.data.smtp?.user || '',
        pass: '',
      });
      setFromForm({
        address: res.data.from?.address || '',
        name: res.data.from?.name || '',
      });
      setNewFromEmail(res.data.graph?.from_email || '');
    } catch {
      setSettings({ email_provider: 'smtp', smtp: {}, from: {}, graph: { connected: false } });
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Handle Microsoft redirect params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('graph_connected') === 'true') {
      showFeedback('success', 'Microsoft 365 connecté. Vos campagnes seront envoyées via Exchange Online.');
      navigate('/settings', { replace: true });
    } else if (params.get('graph_error')) {
      showFeedback('error', `Échec de la connexion Microsoft : ${decodeURIComponent(params.get('graph_error'))}`);
      navigate('/settings', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const fetchMfaStatus = useCallback(async () => {
    setMfaStatusLoading(true);
    try {
      const res = await axios.get('/auth/me');
      setMfaEnabled(!!res.data.mfa_totp_enabled);
    } catch {
      // leave default (disabled) — not fatal to the rest of the page
    } finally {
      setMfaStatusLoading(false);
    }
  }, []);

  useEffect(() => { fetchMfaStatus(); }, [fetchMfaStatus]);

  const handleStartMfaSetup = async () => {
    setMfaSettingUp(true);
    try {
      const res = await axios.post('/auth/mfa/totp/setup');
      setMfaSetupData(res.data);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Impossible de générer le QR code.');
    } finally {
      setMfaSettingUp(false);
    }
  };

  const handleCancelMfaSetup = () => {
    setMfaSetupData(null);
    setMfaCode('');
  };

  const handleVerifyMfaSetup = async () => {
    if (!mfaCode) return;
    setMfaVerifying(true);
    try {
      await axios.post('/auth/mfa/totp/verify-setup', { code: mfaCode });
      showFeedback('success', 'Authentification à deux facteurs activée.');
      setMfaSetupData(null);
      setMfaCode('');
      setMfaEnabled(true);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Code incorrect.');
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disablePassword) return;
    setDisabling(true);
    try {
      await axios.post('/auth/mfa/totp/disable', { mot_de_passe: disablePassword });
      showFeedback('success', 'Authentification à deux facteurs désactivée.');
      setMfaEnabled(false);
      setDisableDialogOpen(false);
      setDisablePassword('');
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Mot de passe incorrect.');
    } finally {
      setDisabling(false);
    }
  };

  // When provider is selected, apply preset if available
  const handleSelectProvider = (id) => {
    setSelectedProvider(id);
    const p = PROVIDERS.find(p => p.id === id);
    if (p?.preset) {
      setSmtpForm(prev => ({ ...prev, ...p.preset, pass: '' }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch('/settings/email', {
        provider: selectedProvider,
        smtp: selectedProvider !== 'graph' ? smtpForm : undefined,
        from: fromForm,
      });
      showFeedback('success', 'Paramètres enregistrés.');
      fetchSettings();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) return;
    setTesting(true);
    try {
      await axios.post('/settings/email/test', {
        to: testEmail,
        smtp: selectedProvider !== 'graph' && !settings?.smtp?.host ? smtpForm : undefined,
      });
      showFeedback('success', `Email de test envoyé à ${testEmail}.`);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || "Échec de l'envoi. Vérifiez votre configuration.");
    } finally {
      setTesting(false);
    }
  };

  const handleConnect365 = async () => {
    const trimmed = fromEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      showFeedback('error', 'Saisissez une adresse email valide.');
      return;
    }
    setConnectLoading(true);
    try {
      const res = await axios.get(`/auth/graph/connect?from_email=${encodeURIComponent(trimmed)}`);
      window.location.href = res.data.consentUrl;
    } catch (err) {
      showFeedback('error', err.response?.data?.message || "Impossible de générer l'URL de consentement.");
      setConnectLoading(false);
    }
  };

  const handleUpdateGraphEmail = async () => {
    const trimmed = newFromEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      showFeedback('error', 'Adresse email invalide.');
      return;
    }
    setUpdateLoading(true);
    try {
      await axios.patch('/auth/graph/from-email', { graph_from_email: trimmed });
      showFeedback('success', 'Adresse expéditeur mise à jour.');
      setEditingEmail(false);
      fetchSettings();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDisconnect365 = async () => {
    setDisconnectLoading(true);
    try {
      await axios.delete('/auth/graph/disconnect');
      showFeedback('success', 'Microsoft 365 déconnecté. Retour au SMTP configuré.');
      setDisconnectOpen(false);
      setEditingEmail(false);
      fetchSettings();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Erreur lors de la déconnexion.');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const activeProviderDef = PROVIDERS.find(p => p.id === selectedProvider);
  const passLabel = activeProviderDef?.passLabel || 'Mot de passe';
  const graphConnected = settings?.graph?.connected;
  const consentDate = settings?.graph?.consent_at
    ? new Date(settings.graph.consent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Box sx={{ maxWidth: 780 }}>
      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 3 }}>
          {feedback.message}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 4, borderBottom: '1px solid #e2e8f0' }}>
        <Tab label="Configuration email" />
        <Tab label="Organisation" />
        <Tab label="Sécurité" />
      </Tabs>

      {/* ── TAB 0: Email configuration ──────────────────────────────── */}
      {tab === 0 && (
        <Box display="flex" flexDirection="column" gap={3}>

          {/* Provider selection */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                Fournisseur d&apos;envoi
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Choisissez comment vos emails sont acheminés.
              </Typography>

              {loadingSettings ? (
                <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
              ) : (
                <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }} gap={1.5}>
                  {PROVIDERS.map(p => {
                    const isSelected = selectedProvider === p.id;
                    const isGraphConnected = p.id === 'graph' && graphConnected;
                    return (
                      <Box
                        key={p.id}
                        onClick={() => handleSelectProvider(p.id)}
                        sx={{
                          border: isSelected ? `2px solid ${p.color}` : '2px solid #e2e8f0',
                          borderRadius: 2,
                          p: 2,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          bgcolor: isSelected ? `${p.color}08` : 'white',
                          '&:hover': { borderColor: p.color, bgcolor: `${p.color}05` },
                          position: 'relative',
                        }}
                      >
                        {isGraphConnected && (
                          <CheckCircleIcon sx={{ position: 'absolute', top: 8, right: 8, fontSize: 14, color: '#10b981' }} />
                        )}
                        <Box mb={1}>{p.logo}</Box>
                        <Typography variant="body2" fontWeight={700} fontSize={13} lineHeight={1.2}>
                          {p.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.25} lineHeight={1.4}>
                          {p.desc}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* SMTP form (shown for smtp / sendgrid / mailgun) */}
          {selectedProvider !== 'graph' && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                  Paramètres {activeProviderDef?.label}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {selectedProvider === 'sendgrid'
                    ? 'Entrez votre API Key SendGrid. Le nom d\'utilisateur est fixé à "apikey".'
                    : selectedProvider === 'mailgun'
                      ? 'Utilisez les identifiants SMTP de votre domaine Mailgun.'
                      : 'Configurez les paramètres de votre serveur SMTP.'}
                </Typography>

                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                  {selectedProvider !== 'sendgrid' && selectedProvider !== 'mailgun' && (
                    <TextField
                      label="Hôte SMTP"
                      value={smtpForm.host}
                      onChange={e => setSmtpForm(p => ({ ...p, host: e.target.value }))}
                      placeholder="smtp.example.com"
                      fullWidth
                    />
                  )}
                  {(selectedProvider === 'sendgrid' || selectedProvider === 'mailgun') && (
                    <TextField
                      label="Hôte SMTP"
                      value={smtpForm.host}
                      fullWidth
                      InputProps={{ readOnly: true }}
                      sx={{ '& input': { color: '#64748b' } }}
                    />
                  )}
                  <Box display="flex" gap={1.5} alignItems="flex-start">
                    <TextField
                      label="Port"
                      value={smtpForm.port}
                      onChange={e => setSmtpForm(p => ({ ...p, port: Number(e.target.value) }))}
                      type="number"
                      sx={{ width: 100 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={smtpForm.secure}
                          onChange={e => setSmtpForm(p => ({ ...p, secure: e.target.checked }))}
                          size="small"
                          color="secondary"
                        />
                      }
                      label={<Typography variant="body2" fontWeight={600}>SSL/TLS</Typography>}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <TextField
                    label="Utilisateur SMTP"
                    value={smtpForm.user}
                    onChange={e => setSmtpForm(p => ({ ...p, user: e.target.value }))}
                    fullWidth
                    InputProps={{ readOnly: selectedProvider === 'sendgrid' }}
                    sx={selectedProvider === 'sendgrid' ? { '& input': { color: '#64748b' } } : undefined}
                  />
                  <TextField
                    label={passLabel}
                    value={smtpForm.pass}
                    onChange={e => setSmtpForm(p => ({ ...p, pass: e.target.value }))}
                    type={showPass ? 'text' : 'password'}
                    fullWidth
                    placeholder={settings?.smtp?.pass_set ? '••••••••••••' : ''}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPass(s => !s)}>
                            {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" fontWeight={700} mb={2}>
                  Identité expéditeur
                </Typography>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                  <TextField
                    label="Nom affiché"
                    value={fromForm.name}
                    onChange={e => setFromForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nom de votre organisation"
                    fullWidth
                  />
                  <TextField
                    label="Adresse d'envoi"
                    value={fromForm.address}
                    onChange={e => setFromForm(p => ({ ...p, address: e.target.value }))}
                    type="email"
                    placeholder="noreply@example.com"
                    fullWidth
                  />
                </Box>

                <Box display="flex" justifyContent="flex-end" mt={3}>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ px: 3 }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Microsoft 365 section */}
          {selectedProvider === 'graph' && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <MicrosoftLogo size={28} />
                    <Box>
                      <Typography fontWeight={700} fontSize={16} lineHeight={1.2}>Microsoft 365</Typography>
                      <Typography variant="caption" color="text.secondary">Exchange Online · OAuth 2.0 Client Credentials</Typography>
                    </Box>
                  </Box>
                  {!loadingSettings && (
                    <Chip
                      icon={graphConnected ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                      label={graphConnected ? 'Connecté' : 'Non connecté'}
                      size="small"
                      sx={graphConnected
                        ? { bgcolor: '#d1fae5', color: '#059669', fontWeight: 700, border: '1px solid #a7f3d0' }
                        : { bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600 }}
                    />
                  )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {loadingSettings ? (
                  <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
                ) : graphConnected ? (
                  <Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' }, columnGap: 3, rowGap: 1.5, mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>Tenant Azure AD</Typography>
                      <Typography variant="body2" fontFamily="monospace"
                        sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1, px: 1, py: 0.25, display: 'inline-block', fontSize: 12, color: '#475569', wordBreak: 'break-all' }}>
                        {settings.graph.tenant_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>Adresse expéditeur</Typography>
                      <Typography variant="body2" fontWeight={600}>{settings.graph.from_email || '—'}</Typography>
                      {consentDate && (
                        <>
                          <Typography variant="body2" color="text.secondary" fontWeight={500}>Consentement accordé</Typography>
                          <Typography variant="body2" color="text.secondary">{consentDate}</Typography>
                        </>
                      )}
                    </Box>

                    {/* Update sender email */}
                    <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, p: 2.5, mb: 3 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={editingEmail ? 2 : 0}>
                        <Box display="flex" alignItems="center" gap={0.75}>
                          <Typography variant="body2" fontWeight={600}>Modifier l&apos;adresse expéditeur</Typography>
                          <Tooltip title="L'adresse doit appartenir à votre tenant Exchange Online.">
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                          </Tooltip>
                        </Box>
                        {!editingEmail && (
                          <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingEmail(true)}>Modifier</Button>
                        )}
                      </Box>
                      {editingEmail && (
                        <Box display="flex" gap={1.5} alignItems="flex-start">
                          <TextField value={newFromEmail} onChange={e => setNewFromEmail(e.target.value)}
                            placeholder="noreply@votre-domaine.com" size="small" fullWidth type="email" autoFocus />
                          <Button variant="contained" color="secondary" size="small" onClick={handleUpdateGraphEmail}
                            disabled={updateLoading || !newFromEmail} sx={{ flexShrink: 0, minWidth: 110 }}>
                            {updateLoading ? <CircularProgress size={16} color="inherit" /> : 'Mettre à jour'}
                          </Button>
                          <Button size="small" onClick={() => { setEditingEmail(false); setNewFromEmail(settings.graph.from_email || ''); }} sx={{ flexShrink: 0 }}>
                            Annuler
                          </Button>
                        </Box>
                      )}
                    </Box>

                    <Box display="flex" justifyContent="flex-end">
                      <Button variant="outlined" color="error" size="small" startIcon={<LinkOffIcon />}
                        onClick={() => setDisconnectOpen(true)}
                        sx={{ borderColor: '#fecaca', color: '#dc2626', '&:hover': { bgcolor: '#fef2f2', borderColor: '#fca5a5' } }}>
                        Déconnecter Microsoft 365
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" mb={3} lineHeight={1.7}>
                      Connectez votre compte Microsoft 365 pour envoyer vos campagnes directement depuis
                      votre boîte Exchange Online (jusqu&apos;à 10 000 emails/jour par organisation).
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="body2" fontWeight={600} mb={0.75}>Adresse expéditeur</Typography>
                      <TextField value={fromEmail} onChange={e => setFromEmail(e.target.value)}
                        placeholder="marketing@votre-domaine.com" size="small" fullWidth type="email"
                        helperText="L'adresse doit exister dans votre tenant Exchange Online." />
                    </Box>
                    <Button variant="contained" color="secondary"
                      startIcon={connectLoading ? <CircularProgress size={16} color="inherit" /> : <OpenInNewIcon />}
                      onClick={handleConnect365} disabled={connectLoading || !fromEmail} sx={{ mb: 2.5 }}>
                      {connectLoading ? 'Redirection vers Microsoft…' : 'Connecter Microsoft 365'}
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 2, p: 2 }}>
                      <InfoOutlinedIcon sx={{ color: '#3b82f6', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                      <Typography variant="caption" color="#1e40af" lineHeight={1.6}>
                        Un <strong>administrateur IT</strong> de votre organisation doit approuver cette connexion. Elle est valide indéfiniment et révocable à tout moment.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test email */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                Tester la configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2.5}>
                Envoyez un email de diagnostic pour vérifier que votre configuration fonctionne.
              </Typography>
              <Box display="flex" gap={1.5} alignItems="flex-start">
                <TextField
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="adresse@example.com"
                  type="email"
                  size="small"
                  sx={{ width: 300 }}
                />
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={16} /> : <SendIcon />}
                  onClick={handleTest}
                  disabled={testing || !testEmail}
                >
                  {testing ? 'Envoi…' : 'Envoyer un test'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── TAB 1: Organisation ─────────────────────────────────────── */}
      {tab === 1 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Organisation</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Ces informations sont utilisées dans les emails envoyés depuis votre espace.
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField label="Nom de l'organisation" placeholder="Votre entreprise" fullWidth />
              <TextField label="Email de contact" type="email" placeholder="contact@example.com" fullWidth />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              Ces paramètres seront disponibles dans une prochaine mise à jour.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2: Sécurité (MFA TOTP) ───────────────────────────────── */}
      {tab === 2 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              Authentification à deux facteurs (application)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Protégez votre compte avec un code généré par une application d&apos;authentification
              (Google Authenticator, Microsoft Authenticator, etc.), en remplacement du code envoyé par email.
            </Typography>

            {mfaStatusLoading ? (
              <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
            ) : mfaSetupData ? (
              <Box display="flex" flexDirection="column" gap={2} maxWidth={360}>
                <Typography variant="body2">
                  Scannez ce QR code avec votre application d&apos;authentification, puis entrez le code à 6 chiffres généré pour confirmer.
                </Typography>
                <Box
                  component="img"
                  src={mfaSetupData.qr_code}
                  alt="QR code MFA"
                  sx={{ width: 200, height: 200, alignSelf: 'center', border: '1px solid #e2e8f0', borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Impossible de scanner ? Entrez cette clé manuellement : <strong>{mfaSetupData.secret}</strong>
                </Typography>
                <TextField
                  label="Code à 6 chiffres"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                  fullWidth
                  autoFocus
                />
                <Box display="flex" gap={1.5}>
                  <Button variant="contained" onClick={handleVerifyMfaSetup} disabled={mfaVerifying || !mfaCode}>
                    {mfaVerifying ? <CircularProgress size={16} color="inherit" /> : 'Confirmer et activer'}
                  </Button>
                  <Button onClick={handleCancelMfaSetup} disabled={mfaVerifying}>Annuler</Button>
                </Box>
              </Box>
            ) : mfaEnabled ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Chip icon={<CheckCircleIcon />} label="Activée" color="success" variant="outlined" />
                <Button color="error" variant="outlined" onClick={() => setDisableDialogOpen(true)}>
                  Désactiver
                </Button>
              </Box>
            ) : (
              <Button variant="contained" onClick={handleStartMfaSetup} disabled={mfaSettingUp}>
                {mfaSettingUp ? <CircularProgress size={16} color="inherit" /> : 'Activer'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disable MFA dialog */}
      <Dialog open={disableDialogOpen} onClose={() => !disabling && setDisableDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Désactiver l&apos;authentification à deux facteurs ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Confirmez votre mot de passe pour désactiver la protection par application d&apos;authentification.
          </Typography>
          <TextField
            label="Mot de passe"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => { setDisableDialogOpen(false); setDisablePassword(''); }} disabled={disabling}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDisableMfa} disabled={disabling || !disablePassword} sx={{ minWidth: 130 }}>
            {disabling ? <CircularProgress size={16} color="inherit" /> : 'Désactiver'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disconnect dialog */}
      <Dialog open={disconnectOpen} onClose={() => !disconnectLoading && setDisconnectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Déconnecter Microsoft 365 ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Les prochaines campagnes seront envoyées via le SMTP configuré. Le token mis en cache sera supprimé immédiatement.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDisconnectOpen(false)} disabled={disconnectLoading}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDisconnect365} disabled={disconnectLoading} sx={{ minWidth: 130 }}>
            {disconnectLoading ? <CircularProgress size={16} color="inherit" /> : 'Déconnecter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
