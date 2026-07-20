import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchCampaigns, deleteCampaign,
  sendCampaign, fetchCampaignStatsLight,
  duplicateCampaign,
} from '../features/campaigns/campaignsSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Paper, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Tooltip, Chip, Alert, LinearProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import BarChartIcon from '@mui/icons-material/BarChart';
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FollowUpWizard from '../components/FollowUpWizard';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  brouillon: 'default', programmée: 'primary', en_cours: 'info',
  envoyée: 'success', annulée: 'warning', erreur: 'error',
};

const STATUS_LABELS = {
  brouillon: 'Brouillon', programmée: 'Programmée', en_cours: 'En cours',
  envoyée: 'Envoyée', annulée: 'Annulée', erreur: 'Erreur',
};

const CAMPAIGN_TYPES = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'relance', label: 'Relance' },
  { value: 'test_ab', label: 'A/B Test' },
];

// ── Main component ─────────────────────────────────────────────────────────────

const Campaigns = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error, progress } = useSelector((s) => s.campaigns);
  const safeItems = Array.isArray(items) ? items : [];

  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [followUpCampaign, setFollowUpCampaign] = useState(null);

  useEffect(() => {
    dispatch(fetchCampaigns());
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSend = (id) => {
    dispatch(sendCampaign(id));
    const iv = setInterval(() => dispatch(fetchCampaignStatsLight(id)), 3000);
    setTimeout(() => clearInterval(iv), 5 * 60 * 1000);
  };

  const handleDelete = () => {
    if (confirmDeleteId) { dispatch(deleteCampaign(confirmDeleteId)); setConfirmDeleteId(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = statusFilter === 'all' ? safeItems : safeItems.filter((c) => c.statut === statusFilter);
    if (!q) return result;
    return result.filter((c) =>
      String(c.titre || '').toLowerCase().includes(q) ||
      String(c.sujet || '').toLowerCase().includes(q) ||
      String(c.statut || '').toLowerCase().includes(q)
    );
  }, [safeItems, search, statusFilter]);

  useEffect(() => { setPage(0); }, [search, statusFilter, safeItems.length]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage],
  );

  const handleDuplicate = (c) => {
    dispatch(duplicateCampaign({ id: c.id, nouveau_titre: `Copie — ${c.titre}` }));
  };

  const statusCounts = useMemo(() => {
    const counts = { brouillon: 0, programmée: 0, envoyée: 0, en_cours: 0, erreur: 0 };
    safeItems.forEach((c) => { if (c.statut in counts) counts[c.statut]++; });
    return counts;
  }, [safeItems]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* ── Header ── */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} gap={2} flexWrap="wrap">
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <TextField
            size="small" placeholder="Rechercher…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'brouillon', label: `Brouillons${statusCounts.brouillon > 0 ? ` (${statusCounts.brouillon})` : ''}` },
            { value: 'programmée', label: `Planifiées${statusCounts.programmée > 0 ? ` (${statusCounts.programmée})` : ''}` },
            { value: 'envoyée', label: `Envoyées${statusCounts.envoyée > 0 ? ` (${statusCounts.envoyée})` : ''}` },
          ].map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              size="small"
              onClick={() => setStatusFilter(value)}
              color={statusFilter === value ? 'secondary' : 'default'}
              variant={statusFilter === value ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontWeight: statusFilter === value ? 700 : 400 }}
            />
          ))}
          {statusCounts.en_cours > 0 && <Chip label={`${statusCounts.en_cours} en cours`} size="small" color="info" />}
          {statusCounts.erreur > 0 && <Chip label={`${statusCounts.erreur} erreur${statusCounts.erreur > 1 ? 's' : ''}`} size="small" color="error" />}
        </Box>
        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => navigate('/campagnes/nouvelle')}>
          Nouvelle campagne
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200} gap={2}>
          <CircularProgress size={28} /><Typography color="text.secondary">Chargement…</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight={240} gap={2}>
          <Typography variant="h6" color="text.secondary">
            {search ? 'Aucun résultat pour cette recherche.' : 'Aucune campagne créée.'}
          </Typography>
          {!search && (
            <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => navigate('/campagnes/nouvelle')}>
              Créer votre première campagne
            </Button>
          )}
        </Box>
      ) : (
        <>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titre</TableCell>
                <TableCell>Objet</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date d'envoi</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell><Tooltip title="Envois / Ouvertures / Clics"><span>Performances</span></Tooltip></TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((c) => {
                const prog = progress[c.id];
                const progPct = prog?.total ? Math.round((prog.envoyes / prog.total) * 100) : null;
                const typeLabel = CAMPAIGN_TYPES.find((t) => t.value === c.type_campagne)?.label || 'Newsletter';
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={14}>{String(c.titre || '—')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {String(c.sujet || '—')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={12} color="text.secondary">{typeLabel}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} color="text.secondary">
                        {c.date_envoi
                          ? new Date(c.date_envoi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          : c.date_programmation
                          ? new Date(c.date_programmation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[c.statut] || c.statut}
                        color={STATUS_COLORS[c.statut] || 'default'}
                        size="small" sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {prog && prog.total > 0 ? (
                        <Box>
                          <LinearProgress variant="determinate" value={progPct} sx={{ height: 5, mb: 0.5, borderRadius: 3 }} />
                          <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">{prog.envoyes}/{prog.total} envois</Typography>
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
                          </Box>
                        </Box>
                      ) : c.statut === 'envoyée' && c.statistiques ? (
                        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            {(c.statistiques.nb_envoyes || 0).toLocaleString()} envois
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, bgcolor: '#f0fdf4', px: 0.75, py: 0.25, borderRadius: 1 }}>
                            {c.statistiques.nb_envoyes > 0 ? `${Math.round((c.statistiques.nb_ouverts / c.statistiques.nb_envoyes) * 100)}%` : '—'} ouv.
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, bgcolor: '#eff6ff', px: 0.75, py: 0.25, borderRadius: 1 }}>
                            {c.statistiques.nb_envoyes > 0 ? `${Math.round((c.statistiques.nb_clics / c.statistiques.nb_envoyes) * 100)}%` : '—'} clics
                          </Typography>
                        </Box>
                      ) : (
                        <Typography fontSize={12} color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {c.statut === 'envoyée' && (
                        <>
                          <Tooltip title="Voir le détail">
                            <IconButton size="small" onClick={() => navigate(`/campagnes/${c.id}`)} sx={{ color: '#2563eb' }}>
                              <BarChartIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Campagne de suivi (cliqueurs, non-ouvreurs…)">
                            <IconButton size="small" sx={{ color: '#8b5cf6' }}
                              onClick={() => setFollowUpCampaign(c)}
                            >
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Dupliquer">
                        <IconButton size="small" onClick={() => handleDuplicate(c)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => navigate(`/campagnes/${c.id}/modifier`, { state: { campaign: c } })}>
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
                          <IconButton size="small" color="secondary" onClick={() => handleSend(c.id)}>
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
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
          sx={{ borderTop: '1px solid #e5e7eb' }}
        />
        </>
      )}

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
          <Button color="error" variant="contained" onClick={handleDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <FollowUpWizard
        open={!!followUpCampaign}
        campaign={followUpCampaign}
        onClose={() => setFollowUpCampaign(null)}
        onSuccess={() => { setFollowUpCampaign(null); dispatch(fetchCampaigns()); }}
      />
    </Box>
  );
};

export default Campaigns;
