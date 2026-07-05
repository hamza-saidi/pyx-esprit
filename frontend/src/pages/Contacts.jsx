import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContacts,
  addContact,
  updateContact,
  deleteContact,
  disableContact,
  enableContact,
  addTagToContact,
  removeTagFromContact,
} from '../features/contacts/contactsSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Tooltip, alpha, Checkbox, InputAdornment, Tabs, Tab, Slide, Popover, List, ListItemIcon as MuiListItemIcon, ListItemText as MuiListItemText, Accordion, AccordionSummary, AccordionDetails, Collapse, Grid, Divider
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { fetchTags, addTag } from '../features/tags/tagsSlice';
import { fetchSegments, addSegment, updateSegment } from '../features/segments/segmentsSlice';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useTheme } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import TuneIcon from '@mui/icons-material/Tune';
import LabelIcon from '@mui/icons-material/Label';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
// CheckCircleOutlineIcon removed from filters header
// import BlockIcon from '@mui/icons-material/Block';
import EnhancedPagination from '../components/EnhancedPagination';
import LoadingOverlay from '../components/LoadingOverlay';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SellIcon from '@mui/icons-material/Sell';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

// UI helper to render empty values consistently
const renderVal = (v) => {
  const s = (v === null || v === undefined) ? '' : String(v).trim();
  return s ? s : (<span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>—</span>);
};
const emptyContact = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  sexe: '',
  handicap: '',
  home_club: '',
  date_naissance: '',
  nationalite: '',
  type_client: '',
  entreprise: '',
  adresse: '',
  code_postal: '',
  statut: '',
  source: '',
  tags_id: [],
  abonnement_id: '',
  date_debut_abonnement: '',
  date_expiration_abonnement: '',
  statut_abonnement: 'aucun'
};

// Deterministic color by name for Chips
const CHIP_COLORS = [
  '#1976d2', // blue
  '#9c27b0', // purple
  '#2e7d32', // green
  '#d32f2f', // red
  '#ed6c02', // orange
  '#00897b', // teal
  '#6d4c41', // brown
  '#455a64', // blue grey
  '#512da8', // deep purple
  '#c2185b', // pink
];
function getChipStyleByName(name) {
  const key = String(name || '').trim();
  if (!key) return { bgcolor: alpha('#9aa0a6', 0.18), color: '#374151', borderColor: alpha('#9aa0a6', 0.28) };
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
  const idx = Math.abs(hash) % CHIP_COLORS.length;
  const base = CHIP_COLORS[idx];
  return {
    bgcolor: alpha(base, 0.18),
    color: base,
    borderColor: alpha(base, 0.35)
  };
}

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const Contacts = () => {
  const toast = useToast();
  const dispatch = useDispatch();
  const { items, loading, error, total } = useSelector((state) => state.contacts);
  const { items: tags } = useSelector((state) => state.tags || { items: [] });
  const { items: segments } = useSelector((state) => state.segments || { items: [] });
  const [abonnements, setAbonnements] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyContact);
  const [filterTags, setFilterTags] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('tagIds') || p.get('tagId');
    return t ? t.split(',').map(Number).filter(Boolean) : [];
  });
  const [filterSegments, setFilterSegments] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('segmentIds') || p.get('segmentId');
    return s ? s.split(',').map(Number).filter(Boolean) : [];
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // Advanced Mailchimp-Style Filtering
  const [filterMatch, setFilterMatch] = useState('all'); // 'all' or 'any'
  // Rules structure: { id, field, operator, value }
  const [filterRules, setFilterRules] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const initialRules = [];
    const t = p.get('tagIds') || p.get('tagId');
    if (t) {
      initialRules.push({
        id: 'init-tags',
        field: 'tags',
        operator: 'includes',
        value: t.split(',').map(Number).filter(Boolean)
      });
    }
    const s = p.get('segmentIds') || p.get('segmentId');
    if (s) {
      initialRules.push({
        id: 'init-segments',
        field: 'segments',
        operator: 'is',
        value: s.split(',').map(Number).filter(Boolean)
      });
    }
    return initialRules;
  });
  const theme = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('date_creation');
  const [sortOrder, setSortOrder] = useState('DESC');
  const fileInputRef = useRef(null);
  const [addingTagForId, setAddingTagForId] = useState(null);
  const [tagAnchor, setTagAnchor] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, error: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const [bulkTagAnchor, setBulkTagAnchor] = useState(null);
  const [bulkTagId, setBulkTagId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({ file: null, batchTagIds: [], updateExisting: false });

  // URL parameter sync (only for updates, initial state handled in useState)
  useEffect(() => {
    // Current state is initialized from URL. This hook could handle dynamically 
    // changing URL params without full page reloads if needed.
  }, [location.search]);

  const tableContainerRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showObsoleteOnly, setShowObsoleteOnly] = useState(false);
  const [obsoleteItems, setObsoleteItems] = useState([]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  // Sorted lists for filters (alphabetical by nom)
  const sortedTags = useMemo(() => ([...(tags || [])]).sort((a, b) => (a?.nom || '').localeCompare(b?.nom || '', 'fr', { sensitivity: 'base' })), [tags]);

  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchSegments());
    axios.get('/contacts/memberships').then(r => setAbonnements(r.data)).catch(e => console.error(e));
  }, [dispatch]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((search || '').trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);
  useEffect(() => {
    const tagIds = (filterTags || []).join(',');
    const segmentIds = (filterSegments || []).join(',');
    const actif = filterActive;
    const rulesJson = JSON.stringify(filterRules);
    console.log('[DEBUG] Calling fetchContacts with:', { tagIds, segmentIds, filterRules: rulesJson });
    dispatch(fetchContacts({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch,
      tagIds,
      segmentIds,
      actif,
      sort: sortBy,
      order: sortOrder,
      filterMatch,
      filterRules: rulesJson
    }));
  }, [dispatch, currentPage, pageSize, debouncedSearch, filterTags, filterSegments, filterActive, sortBy, sortOrder, filterMatch, filterRules]);

  const getFetchParams = () => ({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
    tagIds: (filterTags || []).join(','),
    segmentIds: (filterSegments || []).join(','),
    actif: filterActive,
    sort: sortBy,
    order: sortOrder,
    filterMatch,
    filterRules: JSON.stringify(filterRules)
  });

  const [emailError, setEmailError] = useState('');

  const handleOpen = (contact = null) => {
    setEdit(contact);
    if (contact) {
      setForm({
        prenom: contact.prenom || '',
        nom: contact.nom || '',
        email: contact.email || '',
        telephone: contact.telephone || '',
        sexe: contact.sexe || '',
        handicap: contact.handicap || '',
        home_club: contact.home_club || '',
        date_naissance: contact.date_naissance || '',
        nationalite: contact.nationalite || '',
        type_client: contact.type_client || '',
        entreprise: contact.type_client === 'entreprise' ? contact.entreprise : '',
        adresse: contact.adresse || '',
        code_postal: contact.code_postal || '',
        tags_id: (contact.tags || []).map(t => t.id),
        abonnement_id: contact.abonnement_id || '',
        date_debut_abonnement: contact.date_debut_abonnement || '',
        date_expiration_abonnement: contact.date_expiration_abonnement || '',
        statut_abonnement: contact.statut_abonnement || 'aucun'
      });
    } else {
      setForm(emptyContact);
    }
    setEmailError('');
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    if (name === 'email') {
      const normalized = (value || '').trim().toLowerCase();
      const exists = items.some(c => c.email?.toLowerCase() === normalized && (!edit || c.id !== edit.id));
      setEmailError(exists ? 'Cet email existe déjà' : '');
    }
    setForm(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError) return;
    const payload = {
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      sexe: form.sexe,
      handicap: form.handicap,
      home_club: form.home_club,
      date_naissance: form.date_naissance || null,
      nationalite: form.nationalite,
      type_client: form.type_client,
      adresse: form.adresse,
      code_postal: form.code_postal,
      // source removed
      // statut removed; keep contact active by default on create, or preserve existing when editing
      actif: edit ? undefined : true,
      tags_id: form.tags_id || [],
      entreprise: form.type_client === 'entreprise' ? form.entreprise : '',
      abonnement_id: form.abonnement_id || null,
      date_debut_abonnement: form.date_debut_abonnement || null,
      date_expiration_abonnement: form.date_expiration_abonnement || null,
      statut_abonnement: form.statut_abonnement || 'aucun'
    };
    // Remove undefined keys to avoid overwriting on edit
    const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
    try {
      if (edit) {
        const action = await dispatch(updateContact({ id: edit.id, data: cleanPayload }));
        if (action.error) {
          if (String(action.payload || action.error.message || '').toLowerCase().includes('existe déjà')) {
            setEmailError('Cet email existe déjà');
          }
          return;
        }
        // Refresh list to get server-expanded associations
        await dispatch(fetchContacts(getFetchParams()));
      } else {
        const action = await dispatch(addContact(cleanPayload));
        if (action.error) {
          if (String(action.payload || action.error.message || '').toLowerCase().includes('existe déjà')) {
            setEmailError('Cet email existe déjà');
          }
          return;
        }
        // Refresh list to include the new contact and associations
        await dispatch(fetchContacts(getFetchParams()));
      }
      setOpen(false);
    } catch (err) {
    }
  };

  const handleDelete = async (ids, force = false) => {
    const idArray = Array.isArray(ids) ? ids : [ids];
    let errorMsg = '';
    for (const id of idArray) {
      const res = await dispatch(deleteContact({ id, force }));
      if (res.meta?.requestStatus === 'rejected') {
        errorMsg = res.payload || 'Suppression impossible';
      }
    }

    if (errorMsg) {
      setConfirmDelete(prev => ({ ...prev, error: errorMsg }));
    } else {
      setConfirmDelete({ open: false, id: null, error: '' });
      if (Array.isArray(ids)) {
        setSelectedIds([]);
      }
    }

    // refresh current page to reflect deletion
    dispatch(fetchContacts(getFetchParams()));
  };
  const handleDisable = async (id) => {
    await dispatch(disableContact(id));
    dispatch(fetchContacts(getFetchParams()));
  };
  const handleEnable = async (id) => {
    await dispatch(enableContact(id));
    dispatch(fetchContacts(getFetchParams()));
  };
  const handlePageChange = (newPage) => { setCurrentPage(newPage); };

  const [importLoading, setImportLoading] = useState(false);
  const handleImportSubmit = async () => {
    if (!importForm.file) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importForm.file);
      formData.append('batchTagIds', importForm.batchTagIds.join(','));
      formData.append('updateExisting', importForm.updateExisting);

      await axios.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportOpen(false);
      setImportForm({ file: null, batchTagIds: [], updateExisting: false });
      setCurrentPage(1);
      dispatch(fetchContacts({ ...getFetchParams(), page: 1 }));
    } catch (e) {
      console.error('Import error:', e);
      toast.error(e.response?.data?.message || e.message || "Erreur lors de l'import des contacts");
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setImportForm({ ...importForm, file });
  };

  const handleExport = async (format) => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if ((filterTags || []).length) params.tagIds = (filterTags || []).join(',');
    if ((filterSegments || []).length) params.segmentIds = (filterSegments || []).join(',');
    if (filterActive !== '') params.actif = filterActive;

    // Add Mailchimp-style filter rules
    if ((filterRules || []).length > 0) {
      params.filterRules = JSON.stringify(filterRules);
      params.filterMatch = filterMatch;
    }

    const isExcel = format === 'excel';

    try {
      const res = await axios.get(`/contacts/export/${isExcel ? 'excel' : 'csv'}`, {
        params,
        responseType: 'blob',
      });
      downloadBlob(res.data, isExcel ? 'contacts.xlsx' : 'contacts.csv');
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const handleDownloadTemplate = async (minimal = false) => {
    try {
      const res = await axios.get('/contacts/export/template', {
        params: { minimal },
        responseType: 'blob'
      });
      downloadBlob(res.data, minimal ? 'template_minimal.xlsx' : 'template_contacts.xlsx');
    } catch (e) {
      console.error('Template error:', e);
    }
  };
  // Ajout/suppression de tags sur un contact
  const handleTagChange = async (contact, tagId) => {
    // Si le tag est déjà présent, on le retire, sinon on l'ajoute
    const hasTag = contact.tags?.some(t => t.id === tagId);
    if (hasTag) {
      await dispatch(removeTagFromContact({ contactId: contact.id, tagId }));
    } else {
      // Récupérer le nom du tag depuis la liste des tags disponibles
      const tag = tags.find(t => t.id === tagId);
      await dispatch(addTagToContact({ contactId: contact.id, tagId, tagName: tag?.nom || 'Tag inconnu' }));
    }
    dispatch(fetchContacts(getFetchParams()));
  };

  // Les filtres sont désormais gérés côté serveur
  const filteredItems = items;
  const displayedItems = showObsoleteOnly ? obsoleteItems : filteredItems;

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };


  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={4} gap={3}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>
            Audience
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gérez vos contacts et leur classification par étiquettes.
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Button variant="outlined" onClick={() => setImportOpen(true)}>Importer</Button>
          <Button variant="outlined" onClick={() => handleExport?.('excel')}>Exporter</Button>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ px: 4 }}>Ajouter un contact</Button>
        </Box>
      </Box>

      {/* Sub-Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={0}
          onChange={(_, val) => {
            if (val === 1) navigate('/segments');
            if (val === 2) navigate('/tags');
          }}
          textColor="secondary"
          indicatorColor="secondary"
        >
          <Tab label="Tous les contacts" sx={{ fontWeight: 700, textTransform: 'none', fontSize: 16 }} />
          <Tab label="Segments" sx={{ fontWeight: 700, textTransform: 'none', fontSize: 16 }} />
          <Tab label="Étiquettes" sx={{ fontWeight: 700, textTransform: 'none', fontSize: 16 }} />
        </Tabs>
      </Box>

      <Paper sx={{ mb: 6, p: 0, borderRadius: 0, border: '1px solid #bfc9cf', bgcolor: 'transparent', boxShadow: 'none' }}>
        <Box sx={{ p: 3, bgcolor: '#F5F7F9', borderBottom: filtersExpanded ? '1px solid #bfc9cf' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => setFiltersExpanded(!filtersExpanded)} sx={{ color: '#241C15', mr: 0.5 }}>
              {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>Filtres</Typography>
            <Chip label={`${displayedItems.length} contact(s)`} size="small" sx={{ bgcolor: '#0a84d6', color: '#FFFFFF', fontWeight: 700, borderRadius: 0 }} />
            <Button size="small" variant="text" color="secondary" sx={{ fontWeight: 700 }} onClick={() => { setFilterRules([]); setSearch(''); setDebouncedSearch(''); setCurrentPage(1); }}>
              Effacer
            </Button>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                const params = new URLSearchParams();
                const selectedContacts = displayedItems.filter(c => selectedIds.includes(c.id));
                if (selectedIds.length > 0) {
                  params.set('contactIds', selectedIds.join(','));
                  params.set('campagneMode', '1');
                } else {
                  params.set('campagneMode', '1');
                  if ((filterTags || []).length) params.set('tagIds', (filterTags || []).join(','));
                  if ((filterSegments || []).length) params.set('segmentIds', (filterSegments || []).join(','));
                  if (filterActive !== '') params.set('actif', filterActive);
                }
                const qs = params.toString();
                navigate(`/composer?${qs}`);
              }}
              disabled={
                selectedIds.length === 0 &&
                (filterTags || []).length === 0 &&
                (filterSegments || []).length === 0
              }
            >
              Créer une campagne
            </Button>
          </Box>
        </Box>

        {/* MAILCHIMP-STYLE COMPACT FILTER BUILDER */}
        <Collapse in={filtersExpanded}>
          <Box sx={{ p: 2, bgcolor: 'white' }}>
            <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={filterRules.length > 0 ? 2 : 0}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b3f44' }}>
                Les contacts vérifient
              </Typography>
              <Select
                size="small"
                value={filterMatch}
                onChange={(e) => setFilterMatch(e.target.value)}
                sx={{ width: 100, height: 32, fontSize: 13, fontWeight: 700 }}
              >
                <MenuItem value="all">TOUS</MenuItem>
                <MenuItem value="any">AU MOINS UN</MenuItem>
              </Select>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#3b3f44' }}>
                des conditions suivantes :
              </Typography>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', bgcolor: '#FFFFFF', border: '1px solid #bfc9cf', px: 1.5, height: 32, width: 220 }}>
                <SearchIcon sx={{ color: '#8a9298', mr: 1, fontSize: 18 }} />
                <InputBase
                  placeholder="Rechercher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setDebouncedSearch((search || '').trim()); } }}
                  sx={{ flex: 1, fontSize: 13 }}
                />
              </Box>
            </Box>

            <Box display="flex" flexDirection="column" gap={1}>
              {filterRules.map((rule, idx) => (
                <Box key={rule.id} display="flex" alignItems="center" gap={1.5} p={1} sx={{ bgcolor: '#F5F7F9', border: '1px solid #bfc9cf' }}>
                  <Select
                    size="small"
                    value={rule.field}
                    onChange={(e) => {
                      const newRules = [...filterRules];
                      newRules[idx].field = e.target.value;
                      newRules[idx].operator = 'is';
                      newRules[idx].value = '';
                      setFilterRules(newRules);
                    }}
                    sx={{ width: 150, bgcolor: 'white', fontSize: 13, height: 32 }}
                  >
                    <MenuItem value="tags">Étiquettes</MenuItem>
                    <MenuItem value="segments">Segments</MenuItem>
                    <MenuItem value="actif">Statut</MenuItem>
                  </Select>

                  <Select
                    size="small"
                    value={rule.operator}
                    onChange={(e) => {
                      const newRules = [...filterRules];
                      newRules[idx].operator = e.target.value;
                      setFilterRules(newRules);
                    }}
                    sx={{ width: 140, bgcolor: 'white', fontSize: 13, height: 32 }}
                  >
                    {rule.field === 'tags' || rule.field === 'segments' ? [
                      <MenuItem key="includes" value="includes">Inclut</MenuItem>,
                      <MenuItem key="excludes" value="excludes">Exclut</MenuItem>
                    ] : [
                      <MenuItem key="is" value="is">Est</MenuItem>,
                      <MenuItem key="is_not" value="is_not">N&apos;est pas</MenuItem>,
                      <MenuItem key="contains" value="contains">Contient</MenuItem>
                    ]}
                  </Select>

                  <Box flex={1}>
                    {rule.field === 'tags' ? (
                      <Autocomplete
                        multiple
                        size="small"
                        options={sortedTags}
                        getOptionLabel={(o) => o?.nom || ''}
                        value={(tags || []).filter(t => (Array.isArray(rule.value) ? rule.value : []).includes(t.id))}
                        onChange={(_, val) => {
                          const newRules = [...filterRules];
                          newRules[idx].value = (val || []).map(x => x.id);
                          setFilterRules(newRules);
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Sélectionner des étiquettes..." sx={{ bgcolor: 'white', '& .MuiInputBase-root': { py: 0, minHeight: 32 } }} />}
                      />
                    ) : rule.field === 'segments' ? (
                      <Autocomplete
                        multiple
                        size="small"
                        options={segments || []}
                        getOptionLabel={(o) => o?.nom || ''}
                        value={(segments || []).filter(s => (Array.isArray(rule.value) ? rule.value : []).includes(s.id))}
                        onChange={(_, val) => {
                          const newRules = [...filterRules];
                          newRules[idx].value = (val || []).map(x => x.id);
                          setFilterRules(newRules);
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Sélectionner des segments..." sx={{ bgcolor: 'white', '& .MuiInputBase-root': { py: 0, minHeight: 32 } }} />}
                      />
                    ) : rule.field === 'sexe' ? (
                      <Select
                        size="small"
                        value={rule.value || ''}
                        onChange={(e) => {
                          const newRules = [...filterRules];
                          newRules[idx].value = e.target.value;
                          setFilterRules(newRules);
                        }}
                        sx={{ width: '100%', bgcolor: 'white', height: 32, fontSize: 13 }}
                      >
                        <MenuItem value="Homme">Homme</MenuItem>
                        <MenuItem value="Femme">Femme</MenuItem>
                      </Select>
                    ) : rule.field === 'actif' ? (
                      <Select
                        size="small"
                        value={rule.value === true ? 'true' : rule.value === false ? 'false' : ''}
                        onChange={(e) => {
                          const newRules = [...filterRules];
                          newRules[idx].value = e.target.value === 'true';
                          setFilterRules(newRules);
                        }}
                        sx={{ width: '100%', bgcolor: 'white', height: 32, fontSize: 13 }}
                      >
                        <MenuItem value="true">Actif</MenuItem>
                        <MenuItem value="false">Inactif</MenuItem>
                      </Select>
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Valeur..."
                        value={rule.value || ''}
                        onChange={(e) => {
                          const newRules = [...filterRules];
                          newRules[idx].value = e.target.value;
                          setFilterRules(newRules);
                        }}
                        sx={{ bgcolor: 'white', '& .MuiInputBase-root': { height: 32, fontSize: 13 } }}
                      />
                    )}
                  </Box>

                  <IconButton
                    onClick={() => setFilterRules(filterRules.filter(r => r.id !== rule.id))}
                    size="small"
                    sx={{ color: '#DC2626', bgcolor: '#FEE2E2', '&:hover': { bgcolor: '#FEE2E2', opacity: 0.8 } }}
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Box>
              ))}
            </Box>
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setFilterRules([...filterRules, { id: Date.now().toString(), field: 'tags', operator: 'includes', value: [] }])}
              sx={{
                mt: 1,
                color: '#0a84d6',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Ajouter une condition
            </Button>
          </Box>
        </Collapse>
      </Paper>

      {loading ? <LoadingOverlay /> : error ? <Typography color="error">{error}</Typography> : (
        <TableContainer component={Paper} sx={{ borderRadius: 0, border: '1px solid #bfc9cf', boxShadow: 'none', mb: 4 }}>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor: '#F5F7F9' }}>
                  <Checkbox
                    size="small"
                    indeterminate={selectedIds.length > 0 && selectedIds.length < (items || []).length}
                    checked={(items || []).length > 0 && selectedIds.length === (items || []).length}
                    onChange={(e) => setSelectedIds(e.target.checked ? (items || []).map(c => c.id) : [])}
                  />
                </TableCell>
                {[
                  { key: 'email', label: 'ADRESSE EMAIL', width: 250 },
                  { key: 'prenom', label: 'PRÉNOM' },
                  { key: 'nom', label: 'NOM' },
                  { key: 'tags', label: 'ÉTIQUETTES' },
                  { key: 'date_creation', label: "DATE D'AJOUT" },
                  { key: 'actions', label: 'ACTIONS' }
                ].map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: 1,
                      color: '#8a9298',
                      bgcolor: '#F5F7F9',
                      width: col.width || 'auto'
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {(items || []).map((c) => (
                <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(c.id)}
                      onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, c.id] : selectedIds.filter(id => id !== c.id))}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#0a84d6', cursor: 'pointer' }} onClick={() => handleOpen(c)}>
                    {c.email}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#3b3f44' }}>{renderVal(c.prenom)}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#3b3f44' }}>{renderVal(c.nom)}</TableCell>
                  <TableCell sx={{ maxWidth: 250 }}>
                    {(c.tags || []).map(tag => {
                      const style = getChipStyleByName(tag.nom);
                      return (
                        <Chip
                          key={tag.id}
                          label={tag.nom}
                          size="small"
                          onDelete={() => handleTagChange(c, tag.id)}
                          sx={{
                            mr: 0.5,
                            mb: 0.5,
                            borderRadius: 0,
                            fontWeight: 700,
                            fontSize: 10,
                            bgcolor: style.bgcolor,
                            color: style.color,
                            borderColor: style.borderColor,
                            border: '1px solid'
                          }}
                        />
                      );
                    })}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAddingTagForId(c.id);
                        setTagAnchor(e.currentTarget);
                      }}
                      sx={{ ml: 1, bgcolor: '#f0f0f0' }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#8a9298' }}>
                    {c.date_creation ? new Date(c.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleOpen(c)} sx={{ color: '#0a84d6' }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton
                        size="small"
                        onClick={() => c.actif ? handleDisable(c.id) : handleEnable(c.id)}
                        sx={{ color: c.actif ? '#2e7d32' : '#8a9298' }}
                        title={c.actif ? 'Désactiver' : 'Activer'}
                      >
                        {c.actif ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                      </IconButton>
                      <IconButton size="small" onClick={() => setConfirmDelete({ open: true, id: c.id })} sx={{ color: '#DC2626' }}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* no extra controls */}
      <EnhancedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total || 0}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        loading={loading}
      />
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{edit ? 'Modifier le contact' : 'Nouveau contact'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" gap={2}>
                <TextField label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} fullWidth margin="dense" required />
                <TextField label="Nom" name="nom" value={form.nom} onChange={handleChange} fullWidth margin="dense" required />
              </Box>
              <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth margin="dense" required error={!!emailError} helperText={emailError || ''} />
              <TextField label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} fullWidth margin="dense" />
              <Autocomplete
                multiple
                freeSolo
                options={tags || []}
                getOptionLabel={(o) => {
                  if (typeof o === 'string') return o;
                  if (o.__create) return o.nom;
                  return o?.nom || '';
                }}
                filterOptions={(options, params) => {
                  const q = (params.inputValue || '').trim();
                  const filtered = options.filter(o => (o?.nom || '').toLowerCase().includes(q.toLowerCase()));
                  if (q && !options.some(o => o.nom?.toLowerCase() === q.toLowerCase())) {
                    filtered.push({ id: `__new__:${q}`, nom: q, __create: true });
                  }
                  return filtered;
                }}
                value={(tags || []).filter(t => (form.tags_id || []).includes(t.id))}
                onChange={async (_, values) => {
                  const newIds = [];
                  for (const v of values) {
                    if (typeof v === 'string' || v.__create) {
                      const label = (typeof v === 'string' ? v : v.nom).trim();
                      if (!label) continue;
                      const existing = (tags || []).find(t => t.nom?.toLowerCase() === label.toLowerCase());
                      if (existing) { newIds.push(existing.id); continue; }
                      const action = await dispatch(addTag({ nom: label }));
                      if (action.payload?.id) { newIds.push(action.payload.id); dispatch(fetchTags()); }
                    } else {
                      newIds.push(v.id);
                    }
                  }
                  setForm(f => ({ ...f, tags_id: newIds }));
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id || option.nom}>
                    {option.__create
                      ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}><AddIcon sx={{ fontSize: 14 }} />Créer &ldquo;{option.nom}&rdquo;</Box>
                      : option.nom}
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Étiquettes" margin="dense" placeholder="Rechercher ou créer une étiquette…" />}
                sx={{ mt: 1 }}
                clearOnEscape
              />
            </Box>

            <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid #bfc9cf', borderRadius: '4px !important' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Infos golf (optionnel)</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box display="flex" gap={2}>
                  <TextField label="Handicap" name="handicap" type="number" value={form.handicap} onChange={handleChange} fullWidth margin="dense" size="small" />
                  <TextField label="Home Club" name="home_club" value={form.home_club} onChange={handleChange} fullWidth margin="dense" size="small" />
                </Box>
                <TextField label="Date de naissance" name="date_naissance" type="date" value={form.date_naissance ? form.date_naissance.slice(0, 10) : ''} onChange={handleChange} fullWidth margin="dense" InputLabelProps={{ shrink: true }} size="small" />
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Abonnement & Membership</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Select
                      fullWidth
                      value={form.abonnement_id || ''}
                      onChange={(e) => setForm({ ...form, abonnement_id: e.target.value })}
                      displayEmpty
                      size="small"
                    >
                      <MenuItem value="">-- Pas d'abonnement --</MenuItem>
                      {abonnements.map(a => <MenuItem key={a.id} value={a.id}>{a.nom}</MenuItem>)}
                    </Select>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Select
                      fullWidth
                      value={form.statut_abonnement || 'aucun'}
                      onChange={(e) => setForm({ ...form, statut_abonnement: e.target.value })}
                      size="small"
                    >
                      <MenuItem value="aucun">Aucun</MenuItem>
                      <MenuItem value="actif">Actif</MenuItem>
                      <MenuItem value="expiré">Expiré</MenuItem>
                      <MenuItem value="en_attente_paiement">En attente paiement</MenuItem>
                    </Select>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date Début"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={form.date_debut_abonnement ? form.date_debut_abonnement.split('T')[0] : ''}
                      onChange={(e) => setForm({ ...form, date_debut_abonnement: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Date Expiration"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={form.date_expiration_abonnement ? form.date_expiration_abonnement.split('T')[0] : ''}
                      onChange={(e) => setForm({ ...form, date_expiration_abonnement: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={!!emailError}>{edit ? 'Enregistrer' : 'Ajouter'}</Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null, error: '' })}>
        <DialogTitle>{Array.isArray(confirmDelete.id) ? 'Supprimer les contacts' : 'Supprimer le contact'}</DialogTitle>
        <DialogContent>
          <Typography>Cette action est irréversible. Confirmez la suppression {Array.isArray(confirmDelete.id) ? `de ${confirmDelete.id.length} contacts` : ''} ?</Typography>
          {confirmDelete.error && (
            <Typography color="error" sx={{ mt: 1 }}>{confirmDelete.error}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, id: null, error: '' })}>Annuler</Button>
          {confirmDelete.error ? (
            <Button color="error" variant="outlined" onClick={() => { const id = confirmDelete.id; setConfirmDelete({ open: false, id: null, error: '' }); handleDelete(id, true); }}>Forcer la suppression</Button>
          ) : null}
          <Button color="error" variant="contained" onClick={() => { const id = confirmDelete.id; handleDelete(id); }}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      {/* PRE-COMPUTED FLOATING ACTION BAR FOR AUDIENCE PAGE */}
      <Slide direction="up" in={selectedIds.length > 0} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: '#3b3f44',
            color: 'white',
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            zIndex: 1000,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            borderRadius: 0,
            border: '2px solid #0a84d6'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.2)', pr: 3 }}>
            {selectedIds.length} SÉLECTIONNÉ(S)
          </Typography>

          <Button
            variant="text"
            sx={{ color: 'white', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            startIcon={<MailOutlineIcon />}
            onClick={() => {
              const emails = items.filter(c => selectedIds.includes(c.id)).map(c => (c.email || '').trim()).filter(Boolean);
              navigate(`/composer?direct_emails=${emails.join(',')}`);
            }}
          >
            Campagne
          </Button>

          <Button
            variant="text"
            sx={{ color: 'white', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            startIcon={<SellIcon />}
            onClick={(e) => setBulkTagAnchor(e.currentTarget)}
          >
            Étiqueter
          </Button>

          <Button
            variant="text"
            sx={{ color: 'white', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
            startIcon={<FileDownloadIcon />}
            onClick={() => handleExport('excel')}
          >
            Exporter
          </Button>

          <Button
            variant="text"
            sx={{ color: '#ff6b6b', px: 2, '&:hover': { bgcolor: 'rgba(255,107,107,0.1)' } }}
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmDelete({ open: true, id: selectedIds, error: '' })}
          >
            Supprimer
          </Button>

          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)', ml: 1 }} onClick={() => setSelectedIds([])}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </Box>
      </Slide>
      <Popover
        open={Boolean(bulkTagAnchor)}
        anchorEl={bulkTagAnchor}
        onClose={() => setBulkTagAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box sx={{ p: 2, width: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Ajouter une étiquette</Typography>
          <Autocomplete
            size="small"
            options={tags}
            getOptionLabel={(o) => o?.nom || ''}
            onChange={async (_, val) => {
              if (!val) return;
              for (const id of selectedIds) {
                await dispatch(addTagToContact({ contactId: id, tagId: val.id, tagName: val.nom }));
              }
              setBulkTagAnchor(null);
            }}
            renderInput={(params) => <TextField {...params} placeholder="Rechercher..." />}
          />
        </Box>
      </Popover>

      {/* INDIVIDUAL TAG POPOVER */}
      <Popover
        open={Boolean(tagAnchor) && Boolean(addingTagForId)}
        anchorEl={tagAnchor}
        onClose={() => { setTagAnchor(null); setAddingTagForId(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, width: 220 }}>
          <Typography variant="caption" sx={{ px: 1, fontWeight: 700, color: '#8a9298', mb: 1, display: 'block' }}>AJOUTER UNE ÉTIQUETTE</Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {tags.filter(t => !items.find(c => c.id === addingTagForId)?.tags?.some(ct => ct.id === t.id)).map(tag => (
              <MenuItem
                key={tag.id}
                onClick={() => {
                  const contact = items.find(c => c.id === addingTagForId);
                  if (contact) handleTagChange(contact, tag.id);
                  setTagAnchor(null);
                  setAddingTagForId(null);
                }}
                sx={{ fontSize: 13, borderRadius: 0.5 }}
              >
                <SellIcon sx={{ fontSize: 14, mr: 1, color: '#0a84d6' }} />
                {tag.nom}
              </MenuItem>
            ))}
            {tags.filter(t => !items.find(c => c.id === addingTagForId)?.tags?.some(ct => ct.id === t.id)).length === 0 && (
              <Typography variant="caption" sx={{ px: 1, py: 1, display: 'block', color: '#9aa0a6' }}>Aucune étiquette disponible</Typography>
            )}
          </Box>
        </Box>
      </Popover>

      {/* IMPORT DIALOG */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Importer des contacts</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Importez une liste de contacts depuis un fichier Excel ou CSV.
            <Button
              size="small"
              onClick={() => handleDownloadTemplate(true)}
              sx={{ textTransform: 'none', fontWeight: 700, ml: 0.5 }}
            >
              Télécharger le modèle
            </Button>
          </Typography>

          <Box
            sx={{
              border: '2px dashed #bfc9cf',
              p: 3,
              textAlign: 'center',
              bgcolor: '#F5F7F9',
              mb: 3,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#eef2f5' }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUploadIcon sx={{ fontSize: 40, color: '#8a9298', mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {importForm.file ? importForm.file.name : 'Cliquer pour sélectionner un fichier Excel/CSV'}
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Appliquer des étiquettes à tous les contacts importés</Typography>
          <Autocomplete
            multiple
            options={tags || []}
            getOptionLabel={(o) => o?.nom || ''}
            value={(tags || []).filter(t => (importForm.batchTagIds || []).includes(t.id))}
            onChange={(_, val) => setImportForm({ ...importForm, batchTagIds: val.map(v => v.id) })}
            renderInput={(params) => <TextField {...params} variant="outlined" size="small" placeholder="Sélectionner des étiquettes..." />}
            sx={{ mb: 3 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={importForm.updateExisting}
                onChange={(e) => setImportForm({ ...importForm, updateExisting: e.target.checked })}
              />
            }
            label={<Typography variant="body2">Mettre à jour les contacts existants (correspondance par email)</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setImportOpen(false)} color="inherit">Annuler</Button>
          <Button
            onClick={handleImportSubmit}
            variant="contained"
            color="secondary"
            disabled={!importForm.file || importLoading}
            startIcon={importLoading && <CircularProgress size={16} color="inherit" />}
          >
            {importLoading ? 'Importation...' : "Lancer l'importation"}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Contacts; 