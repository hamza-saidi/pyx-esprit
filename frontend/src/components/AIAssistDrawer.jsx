import React, { useState } from 'react';
import {
  Drawer, Box, Typography, Button, TextField, CircularProgress,
  Alert, Chip, ToggleButton, ToggleButtonGroup, Divider, IconButton,
  MenuItem, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import axios from '../api/axios';

const EVENT_TYPES = [
  { value: 'tournament', label: '🏌️ Tournoi / Compétition' },
  { value: 'newsletter', label: '📰 Newsletter mensuelle' },
  { value: 'welcome', label: '👋 Accueil nouveau membre' },
  { value: 'birthday', label: '🎂 Anniversaire de membre' },
  { value: 'reengagement', label: '😴 Ré-engagement inactifs' },
  { value: 'results', label: '🏆 Résultats de compétition' },
  { value: 'announcement', label: '📢 Annonce importante' },
  { value: 'subscription', label: '💰 Renouvellement abonnement' },
  { value: 'event', label: '🎉 Événement spécial' },
  { value: 'promotion', label: '🌟 Offre / Promotion' },
];

const CopyButton = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Tooltip title={copied ? 'Copié !' : `Copier ${label}`}>
      <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? '#10b981' : '#94a3b8' }}>
        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

const AIAssistDrawer = ({ open, onClose, audienceLabel, recipientCount, onApply }) => {
  const [eventType, setEventType] = useState('tournament');
  const [tone, setTone] = useState('amical');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post('/ai/campaign-suggest', {
        event_type: eventType,
        audience: audienceLabel || 'membres du club',
        recipient_count: recipientCount || null,
        tone,
        context: context.trim() || undefined,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération. Vérifiez votre clé GROQ_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && onApply) {
      onApply({ sujet: result.sujet, contenu_html: result.html });
      onClose();
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 480 },
          bgcolor: '#ffffff',
          border: 'none',
          boxShadow: '-4px 0 24px rgba(15,23,42,0.12)',
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            bgcolor: '#0f172a',
          }}
        >
          <Box display="flex" alignItems="center" gap={1.25}>
            <Box
              sx={{
                p: 0.75,
                bgcolor: 'rgba(56,189,248,0.15)',
                borderRadius: 1.5,
                display: 'inline-flex',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#38bdf8', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={15} color="#f8fafc">
                Assistant IA
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                Génération intelligente d'emails
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: '#475569', '&:hover': { color: '#f8fafc' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
          {/* Audience context badge */}
          {audienceLabel && (
            <Box mb={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                Public sélectionné
              </Typography>
              <Chip
                label={`${audienceLabel}${recipientCount ? ` · ${recipientCount.toLocaleString()} contacts` : ''}`}
                size="small"
                sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}
              />
            </Box>
          )}

          {/* Event type */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Quelle est l'occasion ?
            </Typography>
            <TextField
              select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              fullWidth
              size="small"
            >
              {EVENT_TYPES.map((et) => (
                <MenuItem key={et.value} value={et.value}>
                  {et.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Tone */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Ton de l'email
            </Typography>
            <ToggleButtonGroup
              value={tone}
              exclusive
              onChange={(_, v) => v && setTone(v)}
              size="small"
              fullWidth
            >
              {[
                { value: 'formel', label: 'Formel' },
                { value: 'amical', label: 'Amical' },
                { value: 'enthousiaste', label: 'Enthousiaste' },
              ].map((t) => (
                <ToggleButton
                  key={t.value}
                  value={t.value}
                  sx={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    '&.Mui-selected': {
                      bgcolor: '#2563eb',
                      color: '#fff',
                      borderColor: '#2563eb',
                      '&:hover': { bgcolor: '#1d4ed8' },
                    },
                  }}
                >
                  {t.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Context */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={600} mb={0.75}>
              Contexte supplémentaire{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                (optionnel)
              </Typography>
            </Typography>
            <TextField
              multiline
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Tournoi du 15 septembre, inscription avant le 1er août, places limitées à 80 joueurs..."
              fullWidth
              size="small"
              inputProps={{ maxLength: 500 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {context.length}/500 · Plus de détails = meilleur résultat
            </Typography>
          </Box>

          {/* Generate button */}
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            size="large"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <AutoAwesomeIcon />
              )
            }
            sx={{ mb: 3, py: 1.5 }}
          >
            {loading ? 'Génération en cours…' : 'Générer avec l\'IA'}
          </Button>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Result */}
          {result && (
            <Box>
              <Divider sx={{ mb: 3 }}>
                <Chip label="Résultat généré" size="small" sx={{ fontSize: 12, fontWeight: 600 }} />
              </Divider>

              {/* Subject */}
              <Box mb={2.5}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                  <Typography variant="body2" fontWeight={700}>
                    Objet de l'email
                  </Typography>
                  <CopyButton text={result.sujet} label="l'objet" />
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ flexGrow: 1 }}>
                    {result.sujet}
                  </Typography>
                  <Chip
                    label={`${result.sujet.length} car.`}
                    size="small"
                    sx={{
                      fontSize: 10,
                      height: 20,
                      bgcolor: result.sujet.length <= 55 ? '#d1fae5' : '#fef3c7',
                      color: result.sujet.length <= 55 ? '#059669' : '#d97706',
                    }}
                  />
                </Box>
              </Box>

              {/* HTML preview */}
              <Box mb={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                  <Typography variant="body2" fontWeight={700}>
                    Aperçu de l'email
                  </Typography>
                  <CopyButton text={result.html} label="le HTML" />
                </Box>
                <Box
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#ffffff',
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:Arial,sans-serif;font-size:14px;}</style></head><body>${result.html}</body></html>`}
                    style={{ width: '100%', border: 'none', minHeight: 220, display: 'block' }}
                    title="Aperçu email"
                    sandbox="allow-same-origin"
                  />
                </Box>
              </Box>

              {/* Actions */}
              <Box display="flex" gap={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerate}
                  disabled={loading}
                  sx={{ flex: 1 }}
                >
                  Régénérer
                </Button>
                {onApply && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<CheckIcon />}
                    onClick={handleApply}
                    sx={{ flex: 1 }}
                  >
                    Appliquer
                  </Button>
                )}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                textAlign="center"
                mt={1.5}
              >
                "Appliquer" injecte l'objet et le contenu dans le formulaire de campagne.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer hint */}
        {!result && (
          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid #f1f5f9',
              flexShrink: 0,
              bgcolor: '#f8fafc',
            }}
          >
            <Typography variant="caption" color="text.secondary" lineHeight={1.6}>
              Propulsé par <strong>Groq · Llama 3.1 70B</strong> · Gratuit · ~1–2 secondes par génération.
              Clé API à configurer dans <code>backend/.env</code> : <code>GROQ_API_KEY=...</code>
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default AIAssistDrawer;
