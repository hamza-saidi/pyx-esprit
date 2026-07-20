import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer, Box, Typography, Button, TextField, CircularProgress,
  Alert, Chip, ToggleButton, ToggleButtonGroup, Divider, IconButton,
  MenuItem, Tooltip, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from '../api/axios';

const EVENT_TYPES = [
  { value: 'tournament',   label: '🏌️ Tournoi / Compétition' },
  { value: 'newsletter',   label: '📰 Newsletter mensuelle' },
  { value: 'welcome',      label: '👋 Accueil nouveau membre' },
  { value: 'birthday',     label: '🎂 Anniversaire de membre' },
  { value: 'reengagement', label: '😴 Ré-engagement inactifs' },
  { value: 'results',      label: '🏆 Résultats de compétition' },
  { value: 'announcement', label: '📢 Annonce importante' },
  { value: 'subscription', label: '💰 Renouvellement abonnement' },
  { value: 'event',        label: '🎉 Événement spécial' },
  { value: 'promotion',    label: '🌟 Offre / Promotion' },
];

const LOADING_STEPS = [
  'Analyse du contexte…',
  'Rédaction du contenu…',
  'Génération de l\'email…',
  'Finalisation du design…',
];

// ── Small copy button ──────────────────────────────────────────────────────
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

// ── Animated loading indicator ─────────────────────────────────────────────
const LoadingIndicator = ({ active }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setStepIdx(0);
      setProgress(0);
      return;
    }
    const TOTAL_MS = 6000;
    const TICK = 80;
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min((elapsed / TOTAL_MS) * 100, 97);
      setProgress(pct);
      setStepIdx(Math.min(Math.floor((elapsed / TOTAL_MS) * LOADING_STEPS.length), LOADING_STEPS.length - 1));
    }, TICK);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: 'rgba(56,189,248,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%,100%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.15)', opacity: 0.7 },
            },
          }}
        >
          <AutoAwesomeIcon sx={{ color: '#38bdf8', fontSize: 16 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography fontSize={13} fontWeight={600} color="text.primary">
            {LOADING_STEPS[stepIdx]}
          </Typography>
          <Typography fontSize={11} color="text.secondary">
            L'IA rédige votre email professionnel
          </Typography>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4, borderRadius: 2,
          bgcolor: '#e2e8f0',
          '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8', borderRadius: 2 },
        }}
      />
    </Box>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
const AIAssistDrawer = ({ open, onClose, audienceLabel, recipientCount, onApply }) => {
  const [eventType, setEventType]     = useState('tournament');
  const [tone, setTone]               = useState('amical');
  const [style, setStyle]             = useState('full');
  const [context, setContext]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [result, setResult]           = useState(null);
  const [showHtml, setShowHtml]       = useState(false);
  const [iframeHeight, setIframeHeight] = useState(420);
  const iframeRef = useRef(null);

  // Auto-resize iframe to content
  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const h = doc.documentElement.scrollHeight;
        setIframeHeight(Math.min(Math.max(h, 300), 600));
      }
    } catch (_) {}
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHtml(false);
    try {
      const res = await axios.post('/ai/campaign-suggest', {
        event_type:      eventType,
        audience:        audienceLabel || 'membres du club',
        recipient_count: recipientCount || null,
        tone,
        style,
        context:         context.trim() || undefined,
      });
      setResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Erreur lors de la génération. Vérifiez la clé GROQ_API_KEY dans le fichier backend/.env'
      );
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
    setLoading(false);
    onClose();
  };

  const subjectOk = result && result.sujet.length <= 55;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 520 },
          bgcolor: '#ffffff',
          border: 'none',
          boxShadow: '-4px 0 32px rgba(15,23,42,0.14)',
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <Box
          sx={{
            px: 3, py: 2.5,
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                p: 0.9,
                background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(139,92,246,0.25))',
                borderRadius: 2,
                display: 'inline-flex',
              }}
            >
              <AutoAwesomeIcon sx={{ color: '#a5f3fc', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize={15} color="#f8fafc" letterSpacing="-0.2px">
                Assistant IA
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1 }}>
                Génération professionnelle d'emails golf
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: '#475569', '&:hover': { color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>

          {/* Audience badge */}
          {audienceLabel && (
            <Box mb={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                Public cible
              </Typography>
              <Chip
                label={`${audienceLabel}${recipientCount ? ` · ${recipientCount.toLocaleString()} contacts` : ''}`}
                size="small"
                sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12 }}
              />
            </Box>
          )}

          {/* Event type */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={700} mb={0.75}>
              Occasion
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

          {/* Tone + Style on the same row */}
          <Box mb={3} display="flex" gap={2}>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={700} mb={0.75}>
                Ton
              </Typography>
              <ToggleButtonGroup
                value={tone}
                exclusive
                onChange={(_, v) => v && setTone(v)}
                size="small"
                fullWidth
              >
                {[
                  { value: 'formel',      label: 'Formel' },
                  { value: 'amical',      label: 'Amical' },
                  { value: 'enthousiaste',label: 'Dynamique' },
                ].map((t) => (
                  <ToggleButton
                    key={t.value}
                    value={t.value}
                    sx={{
                      flex: 1, fontSize: 12, fontWeight: 600,
                      borderColor: '#e2e8f0',
                      '&.Mui-selected': {
                        bgcolor: '#2563eb', color: '#fff', borderColor: '#2563eb',
                        '&:hover': { bgcolor: '#1d4ed8' },
                      },
                    }}
                  >
                    {t.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Visual style */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={700} mb={0.75}>
              Style visuel
            </Typography>
            <ToggleButtonGroup
              value={style}
              exclusive
              onChange={(_, v) => v && setStyle(v)}
              size="small"
              fullWidth
            >
              <ToggleButton
                value="full"
                sx={{
                  flex: 1, fontSize: 12, fontWeight: 600, gap: 0.75,
                  borderColor: '#e2e8f0',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a', color: '#fff', borderColor: '#0f172a',
                    '&:hover': { bgcolor: '#1e293b' },
                  },
                }}
              >
                <ImageIcon fontSize="small" />
                Avec image héro
              </ToggleButton>
              <ToggleButton
                value="minimal"
                sx={{
                  flex: 1, fontSize: 12, fontWeight: 600, gap: 0.75,
                  borderColor: '#e2e8f0',
                  '&.Mui-selected': {
                    bgcolor: '#0f172a', color: '#fff', borderColor: '#0f172a',
                    '&:hover': { bgcolor: '#1e293b' },
                  },
                }}
              >
                <TextFieldsIcon fontSize="small" />
                Épuré (texte)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Context */}
          <Box mb={3}>
            <Typography variant="body2" fontWeight={700} mb={0.75}>
              Contexte{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                (optionnel, améliore le résultat)
              </Typography>
            </Typography>
            <TextField
              multiline
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Tournoi du 15 septembre, inscription avant le 1er août, places limitées à 80 joueurs, green fee offert pour les 20 premiers inscrits..."
              fullWidth
              size="small"
              inputProps={{ maxLength: 500 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {context.length}/500 · Plus de détails = email plus précis
            </Typography>
          </Box>

          {/* Generate button */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleGenerate}
            disabled={loading}
            sx={{
              mb: 3, py: 1.6, fontWeight: 800, fontSize: 14,
              background: loading ? undefined : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: loading ? undefined : '0 4px 14px rgba(37,99,235,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)' },
            }}
            startIcon={
              loading
                ? <CircularProgress size={18} color="inherit" />
                : <AutoAwesomeIcon />
            }
          >
            {loading ? 'Génération en cours…' : result ? 'Régénérer l\'email' : 'Générer avec l\'IA'}
          </Button>

          {/* Loading animation */}
          <LoadingIndicator active={loading} />

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* ── Result ──────────────────────────────────────────────── */}
          {result && !loading && (
            <Box>
              <Divider sx={{ mb: 3 }}>
                <Chip
                  label="Email généré ✨"
                  size="small"
                  sx={{ fontSize: 12, fontWeight: 700, bgcolor: '#f0fdf4', color: '#059669' }}
                />
              </Divider>

              {/* Subject */}
              <Box mb={2}>
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
                    border: `1px solid ${subjectOk ? '#bbf7d0' : '#fde68a'}`,
                    borderRadius: 2,
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ flexGrow: 1 }}>
                    {result.sujet}
                  </Typography>
                  <Chip
                    label={`${result.sujet.length}/55`}
                    size="small"
                    sx={{
                      fontSize: 10, height: 20,
                      bgcolor: subjectOk ? '#d1fae5' : '#fef3c7',
                      color:   subjectOk ? '#059669' : '#d97706',
                      fontWeight: 700,
                    }}
                  />
                </Box>
              </Box>

              {/* Preheader */}
              {result.preheader && (
                <Box mb={2.5}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Typography variant="body2" fontWeight={700}>
                      Prévisualisation (preheader)
                    </Typography>
                    <CopyButton text={result.preheader} label="le preheader" />
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#fafafa',
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ flexGrow: 1, fontSize: 13 }}>
                      {result.preheader}
                    </Typography>
                    <Chip
                      label={`${result.preheader.length}/90`}
                      size="small"
                      sx={{
                        fontSize: 10, height: 20,
                        bgcolor: result.preheader.length <= 90 ? '#e0f2fe' : '#fef3c7',
                        color:   result.preheader.length <= 90 ? '#0369a1' : '#d97706',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </Box>
              )}

              {/* Hero image thumbnail (full style only) */}
              {result.heroImageUrl && (
                <Box mb={2.5}>
                  <Typography variant="body2" fontWeight={700} mb={0.75}>
                    Image héro sélectionnée
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      overflow: 'hidden',
                      height: 100,
                    }}
                  >
                    <img
                      src={result.heroImageUrl}
                      alt="Hero"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                </Box>
              )}

              {/* Email preview */}
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
                    bgcolor: '#f8fafc',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;}body{margin:0;padding:0;background:#f0f2f5;}</style></head><body>${result.html}</body></html>`}
                    style={{ width: '100%', border: 'none', height: `${iframeHeight}px`, display: 'block' }}
                    title="Aperçu email"
                    sandbox="allow-same-origin"
                    onLoad={handleIframeLoad}
                  />
                </Box>
              </Box>

              {/* Raw HTML toggle */}
              <Box mb={3}>
                <Button
                  size="small"
                  variant="text"
                  sx={{ color: '#64748b', fontSize: 12, px: 0, textTransform: 'none' }}
                  onClick={() => setShowHtml((v) => !v)}
                  endIcon={showHtml ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                >
                  {showHtml ? 'Masquer' : 'Voir'} le code HTML
                </Button>
                {showHtml && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: '#0f172a',
                      borderRadius: 2,
                      maxHeight: 260,
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: '#94a3b8',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {result.html}
                  </Box>
                )}
              </Box>

              {/* Actions */}
              <Box display="flex" gap={1.5} mb={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleGenerate}
                  disabled={loading}
                  sx={{ flex: 1, fontWeight: 700 }}
                >
                  Régénérer
                </Button>
                {onApply && (
                  <Button
                    variant="contained"
                    startIcon={<CheckIcon />}
                    onClick={handleApply}
                    sx={{
                      flex: 1.2, fontWeight: 700,
                      background: 'linear-gradient(135deg, #059669, #0891b2)',
                      '&:hover': { background: 'linear-gradient(135deg, #047857, #0e7490)' },
                    }}
                  >
                    Appliquer à la campagne
                  </Button>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                "Appliquer" insère l'objet et le contenu HTML dans votre campagne.
              </Typography>
            </Box>
          )}
        </Box>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        {!result && !loading && (
          <Box
            sx={{
              px: 3, py: 2,
              borderTop: '1px solid #f1f5f9',
              flexShrink: 0,
              bgcolor: '#f8fafc',
            }}
          >
            <Typography variant="caption" color="text.secondary" lineHeight={1.7}>
              Propulsé par <strong>Groq · Llama 3.3 70B</strong> · Gratuit · ~2–4 s par génération.{' '}
              Clé API : <code>GROQ_API_KEY</code> dans <code>backend/.env</code>
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default AIAssistDrawer;
