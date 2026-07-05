import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  calculateRecipients,
  sendCampaign,
  fetchCampaignStatsLight,
} from '../features/campaigns/campaignsSlice';
import { fetchTags } from '../features/tags/tagsSlice';
import { fetchSegments } from '../features/segments/segmentsSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Tooltip, Chip, Alert,
  MenuItem, LinearProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmailEditor from '../components/EmailEditor';
import AIAssistDrawer from '../components/AIAssistDrawer';

const emptyCampaign = {
  titre: '',
  sujet: '',
  contenu_html: '<p>Votre contenu ici</p>',
  statut: 'brouillon',
  audience: 'all',
  tags_ids: [],
  segment_id: '',
  limite_envois: '',
  date_programmation: '',
};

const STATUS_COLORS = {
  brouillon: 'default',
  programmée: 'primary',
  en_cours: 'info',
  envoyée: 'success',
  annulée: 'warning',
  erreur: 'error',
};

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  programmée: 'Programmée',
  en_cours: 'En cours',
  envoyée: 'Envoyée',
  annulée: 'Annulée',
  erreur: 'Erreur',
};

const Campaigns = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error, recipientPreview, progress } = useSelector((state) => state.campaigns);
  const safeItems = Array.isArray(items) ? items : [];
  const tagsState = useSelector((state) => state.tags || { items: [] });
  const segmentsState = useSelector((state) => state.segments || { items: [] });

  // Dialog state
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyCampaign);
  const [submitError, setSubmitError] = useState('');

  // AI Drawer state
  const [aiOpen, setAiOpen] = useState(false);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Search
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchCampaigns());
    dispatch(fetchTags());
    dispatch(fetchSegments());
  }, [dispatch]);

  // Open from URL ?create=1 or ?edit=<id>
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') handleOpen();
    const editId = params.get('edit');
    if (editId && safeItems.length > 0) {
      const found = safeItems.find((c) => String(c.id) === String(editId));
      if (found) handleOpen(found);
    }
  }, [location.search, safeItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = (campaign = null) => {
    setEdit(campaign);
    setSubmitError('');
    if (campaign && typeof campaign === 'object') {
      setForm({
        ...campaign,
        tags_ids: Array.isArray(campaign.tags_ids) ? campaign.tags_ids : [],
        titre: String(campaign.titre || ''),
        sujet: String(campaign.sujet || ''),
        contenu_html: String(campaign.contenu_html || ''),
        statut: String(campaign.statut || 'brouillon'),
        audience: String(campaign.audience || 'all'),
        segment_id: campaign.segment_id || '',
        limite_envois: campaign.limite_envois || '',
        date_programmation: campaign.date_programmation || '',
      });
    } else {
      setForm(emptyCampaign);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEdit(null);
    setSubmitError('');
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleHtmlChange = (html) => setForm((f) => ({ ...f, contenu_html: html }));

  const handleAIApply = ({ sujet, contenu_html }) => {
    setForm((f) => ({ ...f, sujet, contenu_html }));
    setAiOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    const payload = {
      titre: (form.titre || '').trim(),
      sujet: form.sujet?.trim() || undefined,
      contenu_html: form.contenu_html?.length >= 10 ? form.contenu_html : '<p>Contenu</p>',
      type_campagne: 'newsletter',
    };
    const action = edit
      ? updateCampaign({ id: edit.id, data: payload })
      : addCampaign(payload);
    dispatch(action).then((res) => {
      if (res.meta?.requestStatus === 'fulfilled') {
        handleClose();
      } else {
        const msg = res.payload || res.error?.message || 'Erreur lors de la sauvegarde';
        setSubmitError(Array.isArray(msg?.errors) ? msg.errors.join(', ') : String(msg));
      }
    });
  };

  const handleSend = (id) => {
    dispatch(sendCampaign(id));
    const interval = setInterval(() => dispatch(fetchCampaignStatsLight(id)), 3000);
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const handleCalculate = () => {
    dispatch(
      calculateRecipients({
        audience: form.audience,
        segment_id: form.segment_id || undefined,
        tags_ids: form.tags_ids?.length ? form.tags_ids : undefined,
      })
    );
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      dispatch(deleteCampaign(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  // Audience label for AI context
  const audienceLabel = useMemo(() => {
    if (form.audience === 'all') return 'Tous les contacts';
    if (form.audience === 'segment' && form.segment_id) {
      const seg = (segmentsState.items || []).find((s) => String(s.id) === String(form.segment_id));
      return seg ? `Segment : ${seg.nom}` : 'Segment';
    }
    if (form.audience === 'tags' && form.tags_ids?.length) {
      const names = (tagsState.items || [])
        .filter((t) => form.tags_ids.includes(t.id))
        .map((t) => t.nom);
      return names.length ? `Étiquettes : ${names.join(', ')}` : 'Étiquettes sélectionnées';
    }
    return 'membres du club';
  }, [form.audience, form.segment_id, form.tags_ids, segmentsState.items, tagsState.items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return safeItems;
    return safeItems.filter(
      (c) =>
        String(c.titre || '').toLowerCase().includes(q) ||
        String(c.sujet || '').toLowerCase().includes(q) ||
        String(c.statut || '').toLowerCase().includes(q)
    );
  }, [safeItems, search]);

  return (
    <Box>
      {/* Page header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Rechercher une campagne…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Créer une campagne
        </Button>
      </Box>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200} gap={2}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Chargement…</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight={240}
          gap={2}
        >
          <Typography variant="h6" color="text.secondary">
            {search ? 'Aucun résultat pour cette recherche.' : 'Aucune campagne créée.'}
          </Typography>
          {!search && (
            <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Créer votre première campagne
            </Button>
          )}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titre</TableCell>
                <TableCell>Objet</TableCell>
                <TableCell>Date d'envoi</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>
                  <Tooltip title="Envois / Ouvertures / Clics">
                    <span>Performances</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => {
                const prog = progress[c.id];
                const progPct = prog?.total ? Math.round((prog.envoyes / prog.total) * 100) : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={14}>
                        {String(c.titre || '—')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {String(c.sujet || '—')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} color="text.secondary">
                        {c.date_envoi
                          ? new Date(c.date_envoi).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[c.statut] || c.statut}
                        color={STATUS_COLORS[c.statut] || 'default'}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {prog && prog.total > 0 ? (
                        /* Live progress during/after send */
                        <Box>
                          <LinearProgress
                            variant="determinate"
                            value={progPct}
                            sx={{ height: 5, mb: 0.5, borderRadius: 3 }}
                          />
                          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">
                              {prog.envoyes}/{prog.total} envois
                            </Typography>
                            {prog.ouverts > 0 && (
                              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                                {prog.total > 0 ? `${Math.round((prog.ouverts / prog.total) * 100)}%` : '—'} ouv.
                              </Typography>
                            )}
                            {prog.clics > 0 && (
                              <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 600 }}>
                                {prog.total > 0 ? `${Math.round((prog.clics / prog.total) * 100)}%` : '—'} clics
                              </Typography>
                            )}
                            {prog.erreurs > 0 && (
                              <Typography variant="caption" sx={{ color: '#dc2626' }}>
                                {prog.erreurs} err.
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ) : c.statut === 'envoyée' && c.statistiques ? (
                        /* Stored stats for past sent campaigns */
                        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                          <Tooltip title="Emails envoyés">
                            <Typography variant="caption" color="text.secondary">
                              {(c.statistiques.nb_envoyes || 0).toLocaleString()} envois
                            </Typography>
                          </Tooltip>
                          <Tooltip title="Taux d'ouverture">
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#16a34a',
                                fontWeight: 700,
                                bgcolor: '#f0fdf4',
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                              }}
                            >
                              {c.statistiques.nb_envoyes > 0
                                ? `${Math.round((c.statistiques.nb_ouverts / c.statistiques.nb_envoyes) * 100)}%`
                                : '—'}{' '}
                              ouv.
                            </Typography>
                          </Tooltip>
                          <Tooltip title="Taux de clic">
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#2563eb',
                                fontWeight: 700,
                                bgcolor: '#eff6ff',
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                              }}
                            >
                              {c.statistiques.nb_envoyes > 0
                                ? `${Math.round((c.statistiques.nb_clics / c.statistiques.nb_envoyes) * 100)}%`
                                : '—'}{' '}
                              clics
                            </Typography>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography fontSize={12} color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {c.statut === 'envoyée' && (
                        <Tooltip title="Voir le détail">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/campagnes/${c.id}`)}
                            sx={{ color: '#2563eb' }}
                          >
                            <BarChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => handleOpen(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => setConfirmDeleteId(c.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {c.statut === 'brouillon' && (
                        <Tooltip title="Envoyer maintenant">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleSend(c.id)}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Campaign create/edit dialog ── */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box>
            <Typography fontWeight={700} fontSize={18}>
              {edit ? 'Modifier la campagne' : 'Nouvelle campagne'}
            </Typography>
            {recipientPreview?.count != null && (
              <Typography variant="caption" color="text.secondary">
                {recipientPreview.count.toLocaleString()} destinataires estimés
              </Typography>
            )}
          </Box>
          <Tooltip title="Générer le contenu avec l'IA">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setAiOpen(true)}
              sx={{
                borderColor: '#8b5cf6',
                color: '#7c3aed',
                '&:hover': { bgcolor: '#f5f3ff', borderColor: '#7c3aed' },
              }}
            >
              Assistance IA
            </Button>
          </Tooltip>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Titre de la campagne"
              name="titre"
              value={form.titre}
              onChange={handleChange}
              fullWidth
              required
              helperText="Usage interne uniquement, non visible par les destinataires"
            />

            <TextField
              label="Objet de l'email"
              name="sujet"
              value={form.sujet}
              onChange={handleChange}
              fullWidth
              helperText={`${(form.sujet || '').length}/55 caractères recommandés`}
              inputProps={{ maxLength: 100 }}
            />

            {/* Audience */}
            <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
              <TextField
                select
                label="Audience"
                name="audience"
                value={form.audience}
                onChange={handleChange}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">Tous les contacts</MenuItem>
                <MenuItem value="tags">Par étiquette(s)</MenuItem>
                <MenuItem value="segment">Par segment</MenuItem>
              </TextField>

              {form.audience === 'segment' && (
                <TextField
                  select
                  label="Segment"
                  name="segment_id"
                  value={form.segment_id}
                  onChange={handleChange}
                  size="small"
                  sx={{ minWidth: 200 }}
                >
                  {(segmentsState.items || []).map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nom}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {form.audience === 'tags' && (
                <TextField
                  select
                  label="Étiquettes"
                  name="tags_ids"
                  value={form.tags_ids}
                  onChange={(e) => {
                    const v = Array.from(e.target.selectedOptions || []).map((o) =>
                      parseInt(o.value, 10)
                    );
                    setForm((f) => ({ ...f, tags_ids: v }));
                  }}
                  SelectProps={{ multiple: true, native: true }}
                  size="small"
                  sx={{ minWidth: 200 }}
                  inputProps={{ style: { height: 80 } }}
                >
                  {(tagsState.items || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </TextField>
              )}

              <Button size="small" variant="outlined" onClick={handleCalculate}>
                Estimer les destinataires
              </Button>
            </Box>

            {/* Scheduled date */}
            <TextField
              label="Date de programmation"
              name="date_programmation"
              type="datetime-local"
              value={form.date_programmation || ''}
              onChange={handleChange}
              size="small"
              InputLabelProps={{ shrink: true }}
              helperText="Laisser vide pour envoyer manuellement"
            />

            {/* HTML Editor */}
            <Box>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Contenu de l'email
              </Typography>
              <EmailEditor value={form.contenu_html} onChange={handleHtmlChange} />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained" color="secondary">
              {edit ? 'Enregistrer' : 'Créer le brouillon'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── AI Assist Drawer ── */}
      <AIAssistDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        audienceLabel={audienceLabel}
        recipientCount={recipientPreview?.count}
        onApply={handleAIApply}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} maxWidth="xs">
        <DialogTitle>Supprimer cette campagne ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Cette action est irréversible. La campagne et ses statistiques seront supprimées.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Campaigns;
