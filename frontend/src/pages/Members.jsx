import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContacts,
  updateContact,
  deleteContact,
  disableContact,
  enableContact,
  addTagToContact,
  removeTagFromContact,
} from '../features/contacts/contactsSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Tooltip, alpha, Checkbox, Tabs, Tab, Slide, Popover, MenuItem, Select, Grid, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SellIcon from '@mui/icons-material/Sell';
import Chip from '@mui/material/Chip';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import { fetchTags } from '../features/tags/tagsSlice';
import EnhancedPagination from '../components/EnhancedPagination';
import LoadingOverlay from '../components/LoadingOverlay';
import axios from '../api/axios';

const renderVal = (v) => {
  const s = (v === null || v === undefined) ? '' : String(v).trim();
  return s ? s : (<span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>—</span>);
};

const Members = () => {
  const dispatch = useDispatch();
  const { items, loading, error, total } = useSelector((state) => state.contacts);
  const { items: tags } = useSelector((state) => state.tags || { items: [] });
  const [abonnements, setAbonnements] = useState([]);
  
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchTags());
    axios.get('/contacts/memberships').then(r => setAbonnements(r.data)).catch(e => console.error(e));
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((search || '').trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    dispatch(fetchContacts({ 
      page: currentPage, 
      limit: pageSize, 
      search: debouncedSearch,
      onlyMembers: true 
    }));
  }, [dispatch, currentPage, pageSize, debouncedSearch]);

  const handleOpen = (contact) => {
    setEdit(contact);
    setForm({
      prenom: contact.prenom || '',
      nom: contact.nom || '',
      email: contact.email || '',
      abonnement_id: contact.abonnement_id || '',
      date_debut_abonnement: contact.date_debut_abonnement || '',
      date_expiration_abonnement: contact.date_expiration_abonnement || '',
      statut_abonnement: contact.statut_abonnement || 'aucun'
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      abonnement_id: form.abonnement_id || null,
      date_debut_abonnement: form.date_debut_abonnement || null,
      date_expiration_abonnement: form.date_expiration_abonnement || null,
      statut_abonnement: form.statut_abonnement || 'aucun'
    };
    await dispatch(updateContact({ id: edit.id, data: payload }));
    dispatch(fetchContacts({ page: currentPage, limit: pageSize, search: debouncedSearch, onlyMembers: true }));
    setOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce membre ?')) {
      await dispatch(deleteContact({ id }));
      dispatch(fetchContacts({ page: currentPage, limit: pageSize, search: debouncedSearch, onlyMembers: true }));
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>Members Management</Typography>
          <Typography variant="body1" color="text.secondary">Detailed list of all active and past members.</Typography>
        </Box>
        <Box display="flex" alignItems="center" bgcolor="white" border="1px solid #bfc9cf" px={2} height={40}>
          <SearchIcon sx={{ color: '#8a9298', mr: 1 }} />
          <InputBase
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Box>
      </Box>

      {loading ? <LoadingOverlay /> : (
        <TableContainer component={Paper} sx={{ borderRadius: 0, border: '1px solid #bfc9cf', boxShadow: 'none' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F7F9' }}>MEMBER</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F7F9' }}>PLAN</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F7F9' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F7F9' }}>EXPIRATION</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: '#F5F7F9' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.prenom} {c.nom}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                  </TableCell>
                  <TableCell>{c.abonnement?.nom || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={(c.statut_abonnement || 'aucun').toUpperCase()} 
                      size="small" 
                      color={c.statut_abonnement === 'actif' ? 'success' : c.statut_abonnement === 'expiré' ? 'error' : 'warning'}
                      sx={{ borderRadius: 0, fontWeight: 700, fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    {c.date_expiration_abonnement ? new Date(c.date_expiration_abonnement).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(c)} sx={{ color: '#0a84d6' }}><EditIcon /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(c.id)} sx={{ color: '#DC2626' }}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <EnhancedPagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Update Membership</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Plan</Typography>
                <Select
                  fullWidth
                  value={form.abonnement_id || ''}
                  onChange={(e) => setForm({...form, abonnement_id: e.target.value})}
                  displayEmpty
                  size="small"
                >
                  <MenuItem value="">-- Pas d'abonnement --</MenuItem>
                  {abonnements.map(a => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
                </Select>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Status</Typography>
                <Select
                  fullWidth
                  value={form.statut_abonnement || 'aucun'}
                  onChange={(e) => setForm({...form, statut_abonnement: e.target.value})}
                  size="small"
                >
                  <MenuItem value="aucun">Aucun</MenuItem>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="expiré">Expiré</MenuItem>
                  <MenuItem value="en_attente_paiement">En attente paiement</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Start Date" 
                  type="date"
                  fullWidth 
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_debut_abonnement ? form.date_debut_abonnement.split('T')[0] : ''}
                  onChange={(e) => setForm({...form, date_debut_abonnement: e.target.value})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Expiry Date" 
                  type="date"
                  fullWidth 
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_expiration_abonnement ? form.date_expiration_abonnement.split('T')[0] : ''}
                  onChange={(e) => setForm({...form, date_expiration_abonnement: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Members;
