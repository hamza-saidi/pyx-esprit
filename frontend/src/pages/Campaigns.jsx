import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
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
import { fetchCategories } from '../features/categories/categoriesSlice';
import { fetchDistributions } from '../features/distributions/distributionsSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Tooltip, Divider, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EmailEditor from '../components/EmailEditor';
import EnhancedPagination from '../components/EnhancedPagination';
import { fetchTemplates } from '../features/templates/templatesSlice';

const emptyCampaign = { titre: '', sujet: '', contenu_html: '<p>Votre contenu ici</p>', statut: 'brouillon', audience: 'all', tags_ids: [], segment_id: '', limite_envois: '', date_programmation: '' };

const Campaigns = () => {
  const dispatch = useDispatch();
  const { items, loading, error, recipientPreview, progress } = useSelector((state) => state.campaigns);
  
  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  
  // Debug logging
  // console.log('Campaigns state:', { loading, error, itemsCount: safeItems.length, safeItems: safeItems.slice(0, 2) });
  const tagsState = useSelector((state) => state.tags || { items: [] });
  const segmentsState = useSelector((state) => state.segments || { items: [] });
  const categoriesState = useSelector((state) => state.categories || { items: [] });
  const distributionsState = useSelector((state) => state.distributions || { items: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyCampaign);
  const [submitError, setSubmitError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date_envoi');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [openTemplatesPicker, setOpenTemplatesPicker] = useState(false);
  const templatesState = useSelector((state) => state.templates || { items: [] });
  // Calendar state
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  // Force list view for debugging
  const currentViewMode = 'list';
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  // const [dayDialog, setDayDialog] = useState({ open: false, date: null, campaigns: [] }); // COMMENTED OUT FOR DEBUGGING

  useEffect(() => { 
    console.log('Fetching campaigns data...');
    dispatch(fetchCampaigns()).catch(err => console.error('Error fetching campaigns:', err)); 
    dispatch(fetchTags()).catch(err => console.error('Error fetching tags:', err));
    dispatch(fetchSegments()).catch(err => console.error('Error fetching segments:', err));
    dispatch(fetchCategories()).catch(err => console.error('Error fetching categories:', err));
    dispatch(fetchDistributions()).catch(err => console.error('Error fetching distributions:', err));
  }, [dispatch]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId && Array.isArray(items) && items.length > 0) {
      const found = items.find(c => String(c.id) === String(editId));
      if (found) handleOpen(found);
    }
  }, [location.search, items]);

  const handleOpen = (campaign = null) => {
    setEdit(campaign);
    if (campaign && typeof campaign === 'object') {
      // Ensure all form fields are properly normalized
      const normalizedCampaign = {
        ...emptyCampaign,
        ...campaign,
        tags_ids: Array.isArray(campaign.tags_ids) ? campaign.tags_ids : (campaign.tags_ids ? [campaign.tags_ids] : []),
        titre: String(campaign.titre || ''),
        sujet: String(campaign.sujet || ''),
        contenu_html: String(campaign.contenu_html || ''),
        statut: String(campaign.statut || 'brouillon'),
        audience: String(campaign.audience || 'all'),
        segment_id: campaign.segment_id || '',
        limite_envois: campaign.limite_envois || '',
        date_programmation: campaign.date_programmation || ''
      };
      setForm(normalizedCampaign);
    } else {
      setForm(emptyCampaign);
    }
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleHtmlChange = (html) => setForm((f) => ({ ...f, contenu_html: html }));

  const handleAudienceChange = (e) => setForm({ ...form, audience: e.target.value });

  const handleTagsChange = (e) => {
    const values = Array.from(e.target.selectedOptions).map((o) => parseInt(o.value, 10)).filter((v) => !Number.isNaN(v));
    setForm((f) => ({ ...f, tags_ids: values }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    // Build minimal server-friendly payload
    const payload = {
      titre: (form.titre || '').trim(),
      sujet: (form.sujet && form.sujet.trim().length > 0) ? form.sujet.trim() : undefined,
      contenu_html: (form.contenu_html && form.contenu_html.length >= 10) ? form.contenu_html : '<p>Contenu</p>',
      type_campagne: 'newsletter'
    };
    const action = edit ? updateCampaign({ id: edit.id, data: payload }) : addCampaign(payload);
    dispatch(action).then((res) => {
      if (res.meta && res.meta.requestStatus === 'fulfilled') {
        setOpen(false);
      } else {
        const msg = res.payload || res.error?.message || 'Erreur lors de la sauvegarde';
        setSubmitError(Array.isArray(msg?.errors) ? msg.errors.join(', ') : msg);
      }
    });
  };

  useEffect(() => { if (openTemplatesPicker) { dispatch(fetchTemplates()); } }, [openTemplatesPicker, dispatch]);
  const handlePickTemplate = (t) => {
    setForm(prev => ({ ...prev, sujet: prev.sujet || t.nom, contenu_html: t.contenu_html }));
    setOpenTemplatesPicker(false);
  };

  const handleDelete = (id) => dispatch(deleteCampaign(id));
  const askDelete = (id) => setConfirmDeleteId(id);
  const cancelDelete = () => setConfirmDeleteId(null);
  const confirmDelete = () => {
    if (confirmDeleteId) {
      dispatch(deleteCampaign(confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  const handleCalculate = () => {
    let whereObj = undefined;
    if (form.where && typeof form.where === 'string') {
      try { whereObj = JSON.parse(form.where); } catch (_) { whereObj = undefined; }
    } else if (form.where && typeof form.where === 'object') {
      whereObj = form.where;
    }
    const payload = {
      audience: form.audience,
      category_id: form.category_id || undefined,
      distribution_id: form.distribution_id || undefined,
      where: whereObj,
      segment_id: form.segment_id || undefined,
      tags_ids: form.tags_ids || undefined,
      contacts_ids: form.contacts_ids || undefined,
    };
    dispatch(calculateRecipients(payload));
  };

  const handleSend = (id) => {
    dispatch(sendCampaign(id));
    // Start polling for progress every 3s for a short period
    const interval = setInterval(() => dispatch(fetchCampaignStatsLight(id)), 3000);
    // Auto-clear after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  // FILTERING AND SORTING USEMEMO HOOKS COMMENTED OUT FOR DEBUGGING
  /*
  const filtered = useMemo(() => {
    try {
      const q = (search || '').toLowerCase().trim();
      if (!q) return safeItems || [];
      return (safeItems || []).filter((c) => {
        if (!c || typeof c !== 'object') return false;
        try {
          return (
            String(c.titre || '').toLowerCase().includes(q) ||
            String(c.sujet || '').toLowerCase().includes(q) ||
            String(c.statut || '').toLowerCase().includes(q)
          );
        } catch (e) {
          console.warn('Error filtering campaign:', c, e);
          return false;
        }
      });
    } catch (e) {
      console.error('Error in filtered useMemo:', e);
      return [];
    }
  }, [safeItems, search]);

  const sorted = useMemo(() => {
    try {
      const arr = [...(filtered || [])];
      arr.sort((a, b) => {
        try {
          const dir = sortDir === 'asc' ? 1 : -1;
          let va = a && typeof a === 'object' ? a[sortBy] : undefined;
          let vb = b && typeof b === 'object' ? b[sortBy] : undefined;
          // Handle dates
          if (sortBy.includes('date')) {
            const ta = va ? new Date(va).getTime() : 0;
            const tb = vb ? new Date(vb).getTime() : 0;
            return (ta - tb) * dir;
          }
          // Strings default
          va = String(va || '').toLowerCase();
          vb = String(vb || '').toLowerCase();
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        } catch (e) {
          console.warn('Error sorting campaigns:', e);
          return 0;
        }
      });
      return arr;
    } catch (e) {
      console.error('Error in sorted useMemo:', e);
      return [];
    }
  }, [filtered, sortBy, sortDir]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    try {
      const start = (currentPage - 1) * pageSize;
      return (sorted || []).slice(start, start + pageSize);
    } catch (e) {
      console.error('Error in paged useMemo:', e);
      return [];
    }
  }, [sorted, currentPage, pageSize]);
  */
  
  // SIMPLIFIED VERSION FOR DEBUGGING
  const filtered = safeItems || [];
  const sorted = filtered;
  const totalItems = filtered.length;
  const totalPages = 1;
  const currentPage = 1;
  const paged = filtered;

  // Calendar helpers
  const formatKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  // CALENDAR USEMEMO HOOKS COMMENTED OUT FOR DEBUGGING
  /*
  const campaignsByDay = useMemo(() => {
    try {
      const map = new Map();
      (safeItems || []).forEach((c) => {
        if (!c || typeof c !== 'object') return;
        const raw = c.date_programmation || c.date_envoi;
        if (!raw) return;
        try {
          const dt = new Date(raw);
          if (isNaN(dt.getTime())) return;
          const key = formatKey(dt);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(c);
        } catch (e) {
          console.warn('Invalid date for campaign:', c.id, raw);
        }
      });
      return map;
    } catch (e) {
      console.error('Error in campaignsByDay useMemo:', e);
      return new Map();
    }
  }, [safeItems]);
  const calendarMatrix = useMemo(() => {
    try {
      const start = new Date(monthCursor);
      const year = start.getFullYear();
      const month = start.getMonth();
      const firstDay = new Date(year, month, 1);
      const startWeekDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1..7, Monday=1
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cells = [];
      const prevDays = startWeekDay - 1;
      const totalCells = Math.ceil((prevDays + daysInMonth) / 7) * 7;
      for (let i = 0; i < totalCells; i++) {
        const dayNum = i - prevDays + 1;
        const date = new Date(year, month, dayNum);
        const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
        const key = formatKey(date);
        const list = inMonth ? (campaignsByDay.get(key) || []) : [];
        cells.push({ date, key, inMonth, campaigns: list });
      }
      return cells.reduce((rows, _, idx) => (idx % 7 === 0 ? [...rows, cells.slice(idx, idx + 7)] : rows), []);
    } catch (e) {
      console.error('Error in calendarMatrix useMemo:', e);
      return [];
    }
  }, [monthCursor, campaignsByDay]);
  */

  // DRAG & DROP FUNCTIONS COMMENTED OUT FOR DEBUGGING
  /*
  const onDragStart = (e, campaign) => {
    e.dataTransfer.setData('application/x-campaign-id', String(campaign.id));
    e.dataTransfer.setData('text/plain', String(campaign.id));
  };
  const onDragOverDay = (e) => {
    e.preventDefault();
  };
  const onDropOnDay = (e, targetDate) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('application/x-campaign-id')) || Number(e.dataTransfer.getData('text/plain'));
    if (!id) return;
    const iso = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 9, 0, 0).toISOString().slice(0,16);
    const payload = { date_programmation: iso, statut: 'programmée' };
    dispatch(updateCampaign({ id, data: payload })).then(() => dispatch(fetchCampaigns()));
  };
  */

  const statusColor = (statut) => {
    try {
      const s = String(statut || '').toLowerCase();
      switch (s) {
        case 'brouillon': return 'default';
        case 'programmée': return 'primary';
        case 'en_cours': return 'info';
        case 'envoyée': return 'success';
        case 'annulée': return 'warning';
        case 'erreur': return 'error';
        default: return 'default';
      }
    } catch (e) {
      console.warn('Error in statusColor:', statut, e);
      return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Campagnes</Typography>
        <Box display="flex" gap={1}>
          <Button variant="contained">Liste</Button>
          {/* <Button variant={viewMode === 'calendar' ? 'contained' : 'outlined'} onClick={() => setViewMode('calendar')}>Calendrier</Button> */}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Créer</Button>
        </Box>
      </Box>
      {/* TOP TOOLBAR COMMENTED OUT FOR DEBUGGING
      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Rechercher (titre, sujet, statut)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        {viewMode === 'list' && (
          <>
            <Divider orientation="vertical" flexItem />
            <TextField select SelectProps={{ native: true }} label="Trier par" size="small" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_envoi">Date d'envoi</option>
              <option value="titre">Titre</option>
              <option value="statut">Statut</option>
            </TextField>
            <Button size="small" variant="outlined" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}>
              {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </>
        )}
      </Box>
      */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement des campagnes...</Typography>
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography color="error">Erreur: {error}</Typography>
        </Box>
      ) : safeItems.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" flexDirection="column">
          <Typography variant="h6" color="text.secondary" gutterBottom>Aucune campagne trouvée</Typography>
          <Typography variant="body2" color="text.secondary">Créez votre première campagne pour commencer</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titre</TableCell>
                <TableCell>Date d'envoi</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{String(c.titre || '')}</TableCell>
                  <TableCell>{c.date_envoi ? new Date(c.date_envoi).toLocaleString() : ''}</TableCell>
                  <TableCell>
                    {String(c.statut || '')}
                    {progress[c.id] && (
                      <Typography variant="caption" display="block">
                        {progress[c.id].envoyes || 0}/{progress[c.id].total || 0} envoyés, {progress[c.id].erreurs || 0} erreurs
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Modifier"><IconButton onClick={() => handleOpen(c)}><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="Supprimer"><IconButton onClick={() => askDelete(c.id)}><DeleteIcon /></IconButton></Tooltip>
                    <Tooltip title="Envoyer"><Button size="small" onClick={() => handleSend(c.id)}>Envoyer</Button></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* PAGINATION COMMENTED OUT FOR DEBUGGING
      <EnhancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        loading={loading}
      />
      */}
      {/* DAY DIALOG COMMENTED OUT FOR DEBUGGING
      <Dialog open={dayDialog.open} onClose={() => setDayDialog({ open: false, date: null, campaigns: [] })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dayDialog.date ? dayDialog.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Détails'}
        </DialogTitle>
        <DialogContent>
          {dayDialog.campaigns.map(c => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{String(c.titre || '')}</Typography>
                  <Typography variant="caption" color="text.secondary">{String(c.statut || '')}</Typography>
                </Box>
                <Box>
                  <Button size="small" onClick={() => { setDayDialog({ open: false, date: null, campaigns: [] }); handleOpen(c); }}>Ouvrir</Button>
                </Box>
              </Box>
            </Paper>
          ))}
          {(!dayDialog.campaigns || dayDialog.campaigns.length === 0) && (
            <Typography color="text.secondary">Aucune campagne.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDayDialog({ open: false, date: null, campaigns: [] })}>Fermer</Button>
        </DialogActions>
      </Dialog>
      */}
      {/* TEMPLATE PICKER DIALOG COMMENTED OUT FOR DEBUGGING
      <Dialog open={openTemplatesPicker} onClose={() => setOpenTemplatesPicker(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sélectionner un modèle</DialogTitle>
        <DialogContent>
          {templatesState.loading ? <CircularProgress /> : (
            <Box>
              {(templatesState.items || []).map((t) => (
                <Paper key={t.id} variant="outlined" sx={{ p: 1, mb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>{t.nom}</Typography>
                    <Button onClick={() => handlePickTemplate(t)}>Utiliser</Button>
                  </Box>
                </Paper>
              ))}
              {(!templatesState.items || templatesState.items.length === 0) && (
                <Typography color="text.secondary">Aucun modèle disponible.</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTemplatesPicker(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
      */}
      <Dialog open={!!confirmDeleteId} onClose={cancelDelete}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cette campagne ? Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Annuler</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Campaigns; 