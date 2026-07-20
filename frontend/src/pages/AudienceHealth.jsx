import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Divider, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Autocomplete, LinearProgress, Tooltip,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTags } from '../features/tags/tagsSlice';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

// ── Score de santé global ──────────────────────────────────────────────────
function HealthScore({ stats, total }) {
  if (!total) return null;
  const problematic = (stats.invalid || 0) + (stats.bounced || 0) + (stats.inactive || 0);
  const score = Math.max(0, Math.round(((total - problematic) / total) * 100));
  const color = score >= 90 ? '#16a34a' : score >= 70 ? '#d97706' : '#dc2626';
  const label = score >= 90 ? 'Excellente' : score >= 70 ? 'Correcte' : 'À améliorer';

  return (
    <Card sx={{ mb: 4, border: '1px solid #bfc9cf', borderRadius: 0, boxShadow: 'none' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <HealthAndSafetyIcon sx={{ color, fontSize: 28 }} />
          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.5}>
              <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                Santé de l&apos;audience
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color }}>
                {score}% — {label}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={score}
              sx={{
                height: 10,
                borderRadius: 0,
                bgcolor: '#f1f5f9',
                '& .MuiLinearProgress-bar': { bgcolor: color },
              }}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {total.toLocaleString('fr-FR')} contacts au total · {problematic.toLocaleString('fr-FR')} nécessitent une attention
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
const AudienceHealth = () => {
  const toast    = useToast();
  const dispatch = useDispatch();
  const { items: tags } = useSelector((state) => state.tags || { items: [] });

  const [stats, setStats]               = useState({ invalid: 0, bounced: 0, inactive: 0, total: 0 });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, category: '', action: '', label: '' });
  const [selectedTag, setSelectedTag]   = useState(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/contacts/health/stats');
      setStats(res.data);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les statistiques de santé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    dispatch(fetchTags());
  }, [dispatch]);

  const handleAction = async () => {
    setActionLoading(true);
    try {
      const res = await axios.post('/contacts/health/bulk-action', {
        category: confirmDialog.category,
        action:   confirmDialog.action,
        tagId:    selectedTag?.id,
      });
      const count = res.data?.processed ?? 0;
      const actionLabel =
        confirmDialog.action === 'delete'  ? 'supprimé(s)' :
        confirmDialog.action === 'disable' ? 'désactivé(s)' :
        'étiqueté(s)';
      toast.success(`${count} contact(s) ${actionLabel}.`);
      await loadStats();
      setConfirmDialog({ open: false, category: '', action: '', label: '' });
      setSelectedTag(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const openDialog = (cat, action, catLabel) => {
    setConfirmDialog({ open: true, category: cat.key, action, label: catLabel, count: cat.count });
  };

  const CATEGORIES = [
    {
      key:   'invalid',
      label: 'Emails invalides',
      count: stats.invalid,
      icon:  <ErrorOutlineIcon sx={{ color: '#dc2626', fontSize: 26 }} />,
      desc:  'Adresses email avec une syntaxe incorrecte (@ manquant, domaine invalide…). Ces contacts ne recevront jamais vos emails.',
      borderColor: '#fca5a5',
      actions: [
        { label: 'Supprimer tout', variant: 'contained', color: 'error',   action: 'delete' },
        { label: 'Étiqueter…',     variant: 'outlined',  color: 'inherit', action: 'tag'    },
      ],
    },
    {
      key:   'bounced',
      label: 'Contacts en erreur',
      count: stats.bounced,
      icon:  <MarkEmailUnreadIcon sx={{ color: '#d97706', fontSize: 26 }} />,
      desc:  'Contacts dont les envois précédents ont généré un bounce permanent, une erreur ou un signalement spam.',
      borderColor: '#fcd34d',
      actions: [
        { label: 'Désactiver tout', variant: 'contained', color: 'warning', action: 'disable' },
        { label: 'Supprimer tout',  variant: 'outlined',  color: 'error',   action: 'delete'  },
      ],
    },
    {
      key:   'inactive',
      label: 'Contacts inactifs',
      count: stats.inactive,
      icon:  <HourglassEmptyIcon sx={{ color: '#0a84d6', fontSize: 26 }} />,
      desc:  "Contacts qui n'ont ouvert aucun email depuis 6 mois. Réduire ce segment améliore votre taux d'ouverture global.",
      borderColor: '#93c5fd',
      actions: [
        { label: 'Désactiver tout', variant: 'contained', color: 'primary', action: 'disable' },
        { label: 'Étiqueter…',      variant: 'outlined',  color: 'inherit', action: 'tag'     },
      ],
    },
  ];

  const dialogCat   = CATEGORIES.find(c => c.key === confirmDialog.category);
  const dialogCount = dialogCat?.count ?? 0;

  if (loading) return (
    <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box mb={4}>
        <Typography variant="h2" gutterBottom sx={{ fontFamily: 'Georgia, serif' }}>
          Santé de l&apos;audience
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Maintenez votre liste de contacts propre pour améliorer la délivrabilité et la performance de vos campagnes.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      <HealthScore stats={stats} total={stats.total || 0} />

      <Grid container spacing={3}>
        {CATEGORIES.map((cat) => (
          <Grid item xs={12} md={4} key={cat.key}>
            <Card sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${cat.borderColor}`,
              borderTop: `3px solid ${cat.borderColor}`,
              borderRadius: 0,
              boxShadow: 'none',
            }}>
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box display="flex" alignItems="center" mb={2} gap={1.5}>
                  {cat.icon}
                  <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                    {cat.label}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, color: '#3b3f44' }}>
                  {cat.count.toLocaleString('fr-FR')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 48 }}>
                  {cat.desc}
                </Typography>
              </CardContent>
              <Divider />
              <Box p={2.5} display="flex" flexDirection="column" gap={1.5} sx={{ bgcolor: '#F5F7F9' }}>
                {cat.actions.map((btn) => (
                  <Tooltip
                    key={btn.label}
                    title={cat.count === 0 ? 'Aucun contact dans cette catégorie' : ''}
                    disableHoverListener={cat.count > 0}
                  >
                    <span>
                      <Button
                        fullWidth
                        variant={btn.variant}
                        color={btn.color}
                        disabled={cat.count === 0}
                        onClick={() => openDialog(cat, btn.action, cat.label)}
                        sx={{ borderRadius: 0 }}
                      >
                        {btn.label}
                      </Button>
                    </span>
                  </Tooltip>
                ))}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog de confirmation ────────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => !actionLoading && setConfirmDialog({ ...confirmDialog, open: false })}
        PaperProps={{ sx: { borderRadius: 0, minWidth: 420 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Georgia, serif' }}>
          Confirmer l&apos;action
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            Vous allez{' '}
            <strong>
              {confirmDialog.action === 'delete'  ? 'supprimer définitivement' :
               confirmDialog.action === 'disable' ? 'désactiver' :
               'étiqueter'}
            </strong>{' '}
            <strong style={{ fontSize: 17 }}>{dialogCount.toLocaleString('fr-FR')}</strong>{' '}
            contact{dialogCount > 1 ? 's' : ''} de la catégorie{' '}
            <strong>«&nbsp;{confirmDialog.label}&nbsp;»</strong>.
          </Typography>

          {confirmDialog.action === 'tag' && (
            <Autocomplete
              options={tags || []}
              getOptionLabel={(o) => o?.nom || ''}
              value={selectedTag}
              onChange={(_, v) => setSelectedTag(v)}
              renderInput={(params) => (
                <TextField {...params} label="Choisir une étiquette" margin="normal" />
              )}
              sx={{ mt: 2 }}
            />
          )}

          {confirmDialog.action === 'delete' && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 0 }}>
              Cette action est irréversible — les contacts seront définitivement supprimés.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            disabled={actionLoading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.action === 'delete' ? 'error' : 'secondary'}
            onClick={handleAction}
            disabled={actionLoading || (confirmDialog.action === 'tag' && !selectedTag)}
            sx={{ px: 4, minWidth: 140 }}
          >
            {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AudienceHealth;
