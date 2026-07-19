import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, Tooltip, Chip, Select, MenuItem,
  FormControl, InputLabel, Grid, Alert, Checkbox, InputBase, LinearProgress,
} from '@mui/material';
import EditIcon          from '@mui/icons-material/Edit';
import PersonAddIcon     from '@mui/icons-material/PersonAdd';
import SearchIcon        from '@mui/icons-material/Search';
import PeopleIcon        from '@mui/icons-material/People';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon  from '@mui/icons-material/ErrorOutline';
import NewReleasesIcon   from '@mui/icons-material/NewReleases';
import EnhancedPagination from '../components/EnhancedPagination';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

// ── Couleurs par statut ───────────────────────────────────────────────────────
const STATUS_META = {
  actif:               { label: 'Actif',             color: '#16a34a', bg: '#dcfce7' },
  a_renouveler:        { label: 'À renouveler',       color: '#d97706', bg: '#fef3c7' },
  expiré:              { label: 'Expiré',             color: '#dc2626', bg: '#fee2e2' },
  archive:             { label: 'Archivé',            color: '#6b7280', bg: '#f3f4f6' },
  en_attente_paiement: { label: 'Attente paiement',   color: '#0a84d6', bg: '#e0f2fe' },
  aucun:               { label: 'Aucun',              color: '#9ca3af', bg: '#f9fafb' },
};

const TYPES_ADHESION = ['Individuel', 'Famille', 'Entreprise', 'Junior', 'Senior', 'Corporate', 'Invité'];

const StatusChip = ({ statut }) => {
  const meta = STATUS_META[statut] || STATUS_META.aucun;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block', px: 1.25, py: 0.25,
        fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        color: meta.color, bgcolor: meta.bg,
        border: `1px solid ${meta.color}30`,
      }}
    >
      {meta.label.toUpperCase()}
    </Box>
  );
};

// ── Carte KPI ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, color, loading }) => (
  <Paper sx={{ p: 3, borderRadius: 0, border: '1px solid #bfc9cf', boxShadow: 'none', borderTop: `3px solid ${color}` }}>
    <Box display="flex" alignItems="center" gap={1.5} mb={1}>
      <Box sx={{ color }}>{icon}</Box>
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, color: '#6b7280' }}>
        {label}
      </Typography>
    </Box>
    <Typography variant="h3" sx={{ fontWeight: 800, color: '#1e293b' }}>
      {loading ? <CircularProgress size={22} sx={{ color }} /> : value}
    </Typography>
  </Paper>
);

// ── Composant principal ────────────────────────────────────────────────────────
const Members = () => {
  const toast    = useToast();
  const location = useLocation();

  const [stats, setStats]           = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [abonnements, setAbonnements] = useState([]);

  const [search, setSearch]         = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);

  const [editDialog, setEditDialog] = useState({ open: false, contact: null });
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);

  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm]     = useState({
    prenom: '', nom: '', email: '', telephone: '',
    type_adhesion: '', abonnement_id: '', numero_licence: '',
    statut_abonnement: 'actif',
    date_debut_abonnement: '', date_expiration_abonnement: '',
  });
  const [creating, setCreating]         = useState(false);

  const [bulkDialog, setBulkDialog] = useState({ open: false });
  const [bulkStatut, setBulkStatut] = useState('archive');

  // Ouvrir le dialog de création si ?create=1 dans l'URL
  useEffect(() => {
    if (new URLSearchParams(location.search).get('create') === '1') {
      setCreateDialog(true);
    }
  }, [location.search]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get('/membres/stats');
      setStats(res.data);
    } catch {
      // stats non critiques
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/membres', {
        params: {
          page,
          limit: pageSize,
          statut: filterStatut,
          type_adhesion: filterType,
          search: search.trim() || undefined,
        },
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Impossible de charger les membres');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatut, filterType, search]);

  useEffect(() => {
    loadStats();
    axios.get('/contacts/memberships').then(r => setAbonnements(r.data || [])).catch(() => {});
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadMembers, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadMembers, search]);

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1); }, [filterStatut, filterType, search]);

  const EMPTY_CREATE = {
    prenom: '', nom: '', email: '', telephone: '',
    type_adhesion: '', abonnement_id: '', numero_licence: '',
    statut_abonnement: 'actif',
    date_debut_abonnement: '', date_expiration_abonnement: '',
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.prenom || !createForm.nom || !createForm.email) {
      toast.error('Prénom, Nom et Email sont obligatoires.');
      return;
    }
    setCreating(true);
    try {
      // 1 — créer le contact
      const contactRes = await axios.post('/contacts', {
        prenom:     createForm.prenom,
        nom:        createForm.nom,
        email:      createForm.email,
        telephone:  createForm.telephone || undefined,
        type_client: 'membre',
        source:     'manuel',
      });
      const newId = contactRes.data?.id || contactRes.data?.contact?.id;
      if (!newId) throw new Error('Identifiant du contact introuvable dans la réponse');

      // 2 — appliquer les données d'adhésion
      const memberPatch = {};
      ['type_adhesion', 'abonnement_id', 'numero_licence',
       'statut_abonnement', 'date_debut_abonnement', 'date_expiration_abonnement']
        .forEach(k => { if (createForm[k]) memberPatch[k] = createForm[k]; });
      memberPatch.statut_abonnement = createForm.statut_abonnement || 'actif';
      await axios.patch(`/membres/${newId}`, memberPatch);

      toast.success(`${createForm.prenom} ${createForm.nom} ajouté(e) comme membre.`);
      setCreateDialog(false);
      setCreateForm(EMPTY_CREATE);
      await Promise.all([loadStats(), loadMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Erreur lors de la création du membre");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c) => {
    setEditForm({
      abonnement_id:              c.abonnement_id || '',
      type_adhesion:              c.type_adhesion || '',
      numero_licence:             c.numero_licence || '',
      statut_abonnement:          c.statut_abonnement || 'aucun',
      date_debut_abonnement:      c.date_debut_abonnement ? c.date_debut_abonnement.split('T')[0] : '',
      date_expiration_abonnement: c.date_expiration_abonnement ? c.date_expiration_abonnement.split('T')[0] : '',
      dernier_paiement_info:      c.dernier_paiement_info || '',
    });
    setEditDialog({ open: true, contact: c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.patch(`/membres/${editDialog.contact.id}`, editForm);
      toast.success('Adhésion mise à jour');
      setEditDialog({ open: false, contact: null });
      await Promise.all([loadStats(), loadMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = async () => {
    try {
      const res = await axios.post('/membres/bulk-action', {
        ids: selectedIds,
        action: 'changer_statut',
        statut: bulkStatut,
      });
      toast.success(`${res.data.processed} membre(s) mis à jour`);
      setSelectedIds([]);
      setBulkDialog({ open: false });
      await Promise.all([loadStats(), loadMembers()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'action');
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleSelectAll = (e) =>
    setSelectedIds(e.target.checked ? items.map(i => i.id) : []);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  const daysUntilExpiry = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>

      {/* En-tête */}
      <Box mb={5} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 0.5 }}>
            Membres
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Suivi des adhésions, renouvellements et statuts de vos membres.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setCreateDialog(true)}
          sx={{ borderRadius: 0, fontWeight: 700, px: 3 }}
        >
          Nouveau membre
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<PeopleIcon />}        label="Membres actifs"      value={stats?.actif ?? '—'}          color="#16a34a" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<WarningAmberIcon />}  label="À renouveler (30j)"  value={stats?.a_renouveler ?? '—'}   color="#d97706" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<ErrorOutlineIcon />}  label="Expirés"             value={stats?.expiré ?? '—'}         color="#dc2626" loading={statsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<NewReleasesIcon />}   label="Nouveaux ce mois"    value={stats?.new_this_month ?? '—'} color="#0a84d6" loading={statsLoading} />
        </Grid>
      </Grid>

      {/* Barre de filtres */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 0, border: '1px solid #bfc9cf', bgcolor: '#F5F7F9' }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <Box display="flex" alignItems="center" bgcolor="white" border="1px solid #bfc9cf" px={1.5} height={40} sx={{ flex: '1 1 200px', minWidth: 180 }}>
            <SearchIcon sx={{ color: '#8a9298', mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Nom, email, numéro de licence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: 14, flex: 1 }}
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Statut</InputLabel>
            <Select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} label="Statut" sx={{ borderRadius: 0 }}>
              <MenuItem value="tous">Tous les statuts</MenuItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Type" sx={{ borderRadius: 0 }}>
              <MenuItem value="tous">Tous les types</MenuItem>
              {TYPES_ADHESION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          {selectedIds.length > 0 && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setBulkDialog({ open: true })}
              sx={{ ml: 'auto', borderRadius: 0 }}
            >
              Action sur {selectedIds.length} membre(s)
            </Button>
          )}
        </Box>
      </Paper>

      {/* Tableau */}
      <TableContainer component={Paper} sx={{ borderRadius: 0, border: '1px solid #bfc9cf', boxShadow: 'none', mb: 3 }}>
        {loading && <LinearProgress sx={{ height: 2 }} />}
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5F7F9' }}>
              <TableCell padding="checkbox">
                <Checkbox size="small" checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>MEMBRE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>TYPE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>PLAN</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>STATUT</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>EXPIRATION</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>LICENCE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">
                    {filterStatut !== 'tous' || filterType !== 'tous' || search
                      ? 'Aucun membre ne correspond aux filtres.'
                      : 'Aucun membre enregistré. Assignez un plan d\'abonnement à un contact.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => {
                const days     = daysUntilExpiry(c.date_expiration_abonnement);
                const isUrgent = days !== null && days >= 0 && days <= 30;
                return (
                  <TableRow
                    key={c.id}
                    selected={selectedIds.includes(c.id)}
                    hover
                    sx={{ '&.Mui-selected': { bgcolor: '#F0F7FF' } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{c.prenom} {c.nom}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {c.type_adhesion
                        ? <Chip label={c.type_adhesion} size="small" variant="outlined" sx={{ borderRadius: 0, fontSize: 11 }} />
                        : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{c.abonnement?.nom || '—'}</Typography>
                      {c.abonnement?.prix != null && (
                        <Typography variant="caption" color="text.secondary">{c.abonnement.prix} €</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip statut={c.statut_abonnement} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: isUrgent ? '#d97706' : days < 0 ? '#dc2626' : 'inherit', fontWeight: isUrgent || (days !== null && days < 0) ? 700 : 400 }}
                      >
                        {formatDate(c.date_expiration_abonnement)}
                      </Typography>
                      {days !== null && days >= 0 && days <= 30 && (
                        <Typography variant="caption" sx={{ color: '#d97706' }}>
                          dans {days}j
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {c.numero_licence || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Modifier l'adhésion">
                        <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#0a84d6' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EnhancedPagination
        currentPage={page}
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        loading={loading}
        itemLabel="membres"
      />

      {/* Dialog modifier adhésion */}
      <Dialog
        open={editDialog.open}
        onClose={() => !saving && setEditDialog({ open: false, contact: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          Modifier l&apos;adhésion
          {editDialog.contact && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {editDialog.contact.prenom} {editDialog.contact.nom} · {editDialog.contact.email}
            </Typography>
          )}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Plan d&apos;abonnement</InputLabel>
                  <Select
                    value={editForm.abonnement_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, abonnement_id: e.target.value })}
                    label="Plan d'abonnement"
                    sx={{ borderRadius: 0 }}
                  >
                    <MenuItem value="">Aucun plan</MenuItem>
                    {abonnements.map(a => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type d&apos;adhésion</InputLabel>
                  <Select
                    value={editForm.type_adhesion || ''}
                    onChange={(e) => setEditForm({ ...editForm, type_adhesion: e.target.value })}
                    label="Type d'adhésion"
                    sx={{ borderRadius: 0 }}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {TYPES_ADHESION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editForm.statut_abonnement || 'aucun'}
                    onChange={(e) => setEditForm({ ...editForm, statut_abonnement: e.target.value })}
                    label="Statut"
                    sx={{ borderRadius: 0 }}
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <MenuItem key={k} value={k}>{v.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="N° de licence FFGolf"
                  size="small"
                  fullWidth
                  value={editForm.numero_licence || ''}
                  onChange={(e) => setEditForm({ ...editForm, numero_licence: e.target.value })}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de début"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editForm.date_debut_abonnement || ''}
                  onChange={(e) => setEditForm({ ...editForm, date_debut_abonnement: e.target.value })}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d'expiration"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editForm.date_expiration_abonnement || ''}
                  onChange={(e) => setEditForm({ ...editForm, date_expiration_abonnement: e.target.value })}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Note paiement"
                  size="small"
                  fullWidth
                  value={editForm.dernier_paiement_info || ''}
                  onChange={(e) => setEditForm({ ...editForm, dernier_paiement_info: e.target.value })}
                  placeholder="ex. : Virement 2026-06-15, CB en ligne…"
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setEditDialog({ open: false, contact: null })} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={saving} sx={{ px: 4, borderRadius: 0 }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Enregistrer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog — Nouveau membre ─────────────────────────────────────────── */}
      <Dialog
        open={createDialog}
        onClose={() => !creating && setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          Nouveau membre
        </DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {/* Identité */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prénom *" size="small" fullWidth required
                  value={createForm.prenom}
                  onChange={(e) => setCreateForm(f => ({ ...f, prenom: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nom *" size="small" fullWidth required
                  value={createForm.nom}
                  onChange={(e) => setCreateForm(f => ({ ...f, nom: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email *" type="email" size="small" fullWidth required
                  value={createForm.email}
                  onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Téléphone" size="small" fullWidth
                  value={createForm.telephone}
                  onChange={(e) => setCreateForm(f => ({ ...f, telephone: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>

              {/* Adhésion */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type d&apos;adhésion</InputLabel>
                  <Select
                    value={createForm.type_adhesion}
                    onChange={(e) => setCreateForm(f => ({ ...f, type_adhesion: e.target.value }))}
                    label="Type d'adhésion"
                    sx={{ borderRadius: 0 }}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {TYPES_ADHESION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Plan d&apos;abonnement</InputLabel>
                  <Select
                    value={createForm.abonnement_id}
                    onChange={(e) => setCreateForm(f => ({ ...f, abonnement_id: e.target.value }))}
                    label="Plan d'abonnement"
                    sx={{ borderRadius: 0 }}
                  >
                    <MenuItem value="">Aucun plan</MenuItem>
                    {abonnements.map(a => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Statut d&apos;adhésion</InputLabel>
                  <Select
                    value={createForm.statut_abonnement}
                    onChange={(e) => setCreateForm(f => ({ ...f, statut_abonnement: e.target.value }))}
                    label="Statut d'adhésion"
                    sx={{ borderRadius: 0 }}
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <MenuItem key={k} value={k}>{v.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="N° de licence FFGolf" size="small" fullWidth
                  value={createForm.numero_licence}
                  onChange={(e) => setCreateForm(f => ({ ...f, numero_licence: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de début" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={createForm.date_debut_abonnement}
                  onChange={(e) => setCreateForm(f => ({ ...f, date_debut_abonnement: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date d'expiration" type="date" size="small" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={createForm.date_expiration_abonnement}
                  onChange={(e) => setCreateForm(f => ({ ...f, date_expiration_abonnement: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 0 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={() => setCreateDialog(false)} disabled={creating}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={creating} sx={{ px: 4, borderRadius: 0 }}>
              {creating ? <CircularProgress size={20} color="inherit" /> : 'Créer le membre'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog action groupée */}
      <Dialog open={bulkDialog.open} onClose={() => setBulkDialog({ open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          Action groupée
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Changer le statut de <strong>{selectedIds.length}</strong> membre(s) sélectionné(s).
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Nouveau statut</InputLabel>
            <Select
              value={bulkStatut}
              onChange={(e) => setBulkStatut(e.target.value)}
              label="Nouveau statut"
              sx={{ borderRadius: 0 }}
            >
              {Object.entries(STATUS_META).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {bulkStatut === 'archive' && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 0 }}>
              Les membres archivés n&apos;apparaissent plus dans les listes actives.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setBulkDialog({ open: false })}>Annuler</Button>
          <Button variant="contained" color="secondary" onClick={handleBulkAction} sx={{ px: 3, borderRadius: 0 }}>
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Members;
