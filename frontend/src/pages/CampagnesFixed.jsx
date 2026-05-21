import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCampaigns,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  calculateRecipients,
  sendCampaign,
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

const emptyCampaign = { 
  titre: '', 
  sujet: '', 
  contenu_html: '<p>Votre contenu ici</p>', 
  statut: 'brouillon', 
  audience: 'all', 
  tags_ids: [], 
  segment_id: '', 
  limite_envois: '', 
  date_programmation: '' 
};

const CampagnesFixed = () => {
  const dispatch = useDispatch();
  const { items, loading, error, recipientPreview } = useSelector((state) => state.campaigns || {});
  const tagsState = useSelector((state) => state.tags || { items: [] });
  const segmentsState = useSelector((state) => state.segments || { items: [] });
  const categoriesState = useSelector((state) => state.categories || { items: [] });
  const distributionsState = useSelector((state) => state.distributions || { items: [] });
  
  // Safe data handling
  const safeItems = Array.isArray(items) ? items : [];
  
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

  useEffect(() => { 
    dispatch(fetchCampaigns()).catch(err => console.error('Error fetching campaigns:', err)); 
    dispatch(fetchTags()).catch(err => console.error('Error fetching tags:', err));
    dispatch(fetchSegments()).catch(err => console.error('Error fetching segments:', err));
    dispatch(fetchCategories()).catch(err => console.error('Error fetching categories:', err));
    dispatch(fetchDistributions()).catch(err => console.error('Error fetching distributions:', err));
  }, [dispatch]);

  const handleOpen = (campaign = null) => {
    setEdit(campaign);
    if (campaign && typeof campaign === 'object') {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
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
        dispatch(fetchCampaigns());
      } else {
        const msg = res.payload || res.error?.message || 'Erreur lors de la sauvegarde';
        setSubmitError(Array.isArray(msg?.errors) ? msg.errors.join(', ') : msg);
      }
    });
  };

  const askDelete = (id) => setConfirmDeleteId(id);
  const confirmDelete = async () => {
    if (confirmDeleteId) {
      await dispatch(deleteCampaign(confirmDeleteId));
      await dispatch(fetchCampaigns());
      setConfirmDeleteId(null);
    }
  };

  const handleSend = async (id) => {
    await dispatch(sendCampaign(id));
    await dispatch(fetchCampaigns());
  };

  // Simplified filtering and sorting
  const filtered = useMemo(() => {
    try {
      const q = (search || '').toLowerCase().trim();
      if (!q) return safeItems;
      return safeItems.filter((c) => {
        if (!c || typeof c !== 'object') return false;
        return (
          String(c.titre || '').toLowerCase().includes(q) ||
          String(c.sujet || '').toLowerCase().includes(q) ||
          String(c.statut || '').toLowerCase().includes(q)
        );
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
          
          if (sortBy.includes('date')) {
            const ta = va ? new Date(va).getTime() : 0;
            const tb = vb ? new Date(vb).getTime() : 0;
            return (ta - tb) * dir;
          }
          
          va = String(va || '').toLowerCase();
          vb = String(vb || '').toLowerCase();
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        } catch (e) {
          console.warn('Error sorting campaign:', e);
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

  const statusColor = (statut) => {
    switch ((statut || '').toLowerCase()) {
      case 'brouillon': return 'default';
      case 'programmée': return 'primary';
      case 'en_cours': return 'info';
      case 'envoyée': return 'success';
      case 'annulée': return 'warning';
      case 'erreur': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Campagnes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>Créer</Button>
      </Box>

      {/* Search and filters */}
      <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Rechercher (titre, sujet, statut)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <TextField
          select
          SelectProps={{ native: true }}
          label="Trier par"
          size="small"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date_envoi">Date d'envoi</option>
          <option value="titre">Titre</option>
          <option value="statut">Statut</option>
        </TextField>
        <Button
          size="small"
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
        >
          {sortDir === 'asc' ? 'Asc' : 'Desc'}
        </Button>
      </Box>

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
                    <Chip
                      label={String(c.statut || '')}
                      color={statusColor(c.statut)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Modifier">
                      <IconButton onClick={() => handleOpen(c)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton onClick={() => askDelete(c.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Envoyer">
                      <Button size="small" onClick={() => handleSend(c.id)}>Envoyer</Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{edit ? 'Modifier' : 'Créer'} une campagne</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField 
              label="Titre" 
              name="titre" 
              value={form.titre} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              required 
            />
            <TextField 
              label="Sujet" 
              name="sujet" 
              value={form.sujet} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
            />
            <TextField
              label="Contenu HTML"
              name="contenu_html"
              value={form.contenu_html}
              onChange={handleChange}
              multiline
              rows={6}
              fullWidth
              margin="normal"
              required
            />
            {submitError && (
              <Typography color="error" mt={2}>{submitError}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained">
              {edit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer cette campagne ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampagnesFixed;

