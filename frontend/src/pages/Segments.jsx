import React, { useEffect, useState, useMemo } from 'react';
import countries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSegments,
  addSegment,
  updateSegment,
  deleteSegment,
  previewSegmentCount,
  detachSegmentCampaigns,
  fetchSegmentContacts,
  clearContactsPreview,
} from '../features/segments/segmentsSlice';
import { fetchTags } from '../features/tags/tagsSlice';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Tooltip, Chip, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Divider, RadioGroup, Radio
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import FilterListIcon from '@mui/icons-material/FilterList';
import FolderIcon from '@mui/icons-material/Folder';
import GroupsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import Collapse from '@mui/material/Collapse';
import EnhancedPagination from '../components/EnhancedPagination';
import Checkbox from '@mui/material/Checkbox';
import { useNavigate } from 'react-router-dom';

countries.registerLocale(frLocale);
const countryList = countries.getNames('fr', { select: 'official' });

const emptySegment = {
  nom: '',
  criteres: {
    type_client: '',
    ville: '',
    actif: true,
    handicap_min: '',
    handicap_max: '',
    sexe: '',
    nationalite: '',
    tag_ids: []
  }
};

const Segments = () => {
  const dispatch = useDispatch();
  const { items, loading, error, previewCount, previewLoading, contactsPreview, contactsPreviewForId, contactsPreviewLoading } = useSelector((state) => state.segments);
  const { items: tags } = useSelector((state) => state.tags || { items: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptySegment);
  const [blockDialog, setBlockDialog] = useState({ open: false, segmentId: null, campaigns: [], selected: {} });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const navigate = useNavigate();

  useEffect(() => { 
    dispatch(fetchSegments());
    dispatch(fetchTags());
  }, [dispatch]);

  const [debounceTimer, setDebounceTimer] = useState(null);
  const debouncedPreview = (criteres) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => {
      const cleaned = {};
      Object.entries(criteres || {}).forEach(([k, v]) => {
        if (Array.isArray(v) ? v.length > 0 : v !== '' && v !== null && v !== undefined) cleaned[k] = v;
      });
      dispatch(previewSegmentCount(cleaned));
    }, 400);
    setDebounceTimer(t);
  };

  const handleOpen = (segment = null) => {
    setEdit(segment);
    if (segment) {
      let criteres = segment.criteres;
      if (typeof criteres === 'string') {
        try { criteres = JSON.parse(criteres); } catch { criteres = {}; }
      }
      const normalized = {
        ...criteres,
        tag_ids: Array.isArray(criteres?.tag_ids) ? criteres.tag_ids : (criteres?.tag_ids ? [criteres.tag_ids] : []),
        nationalite: typeof criteres?.nationalite === 'string' ? criteres.nationalite : '',
      };
      setForm({ ...segment, criteres: normalized });
      debouncedPreview(normalized);
    } else {
      setForm({ ...emptySegment });
      debouncedPreview(emptySegment.criteres);
    }
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleCriteriaChange = (field, value) => {
    const next = { ...form, criteres: { ...form.criteres, [field]: value } };
    setForm(next);
    debouncedPreview(next.criteres);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Nettoyer les critères vides
    const criteresNettoyes = {};
    Object.entries(form.criteres).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) criteresNettoyes[key] = value;
      } else if (value !== '' && value !== null && value !== undefined) {
        criteresNettoyes[key] = value;
      }
    });
    
    const data = { ...form, criteres: criteresNettoyes };
    if (edit) {
      await dispatch(updateSegment({ id: edit.id, data }));
    } else {
      await dispatch(addSegment(data));
    }
    await dispatch(fetchSegments());
    setOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteSegment(id)).unwrap();
      await dispatch(fetchSegments());
    } catch (e) {
      console.error('Suppression segment échouée:', e);
      const msg = typeof e === 'string' ? e : (e?.message || 'Suppression impossible: le segment est peut-être utilisé par des campagnes.');
      if (e?.campaigns && Array.isArray(e.campaigns)) {
        const sel = {};
        e.campaigns.forEach(c => { sel[c.id] = true; });
        setBlockDialog({ open: true, segmentId: id, campaigns: e.campaigns, selected: sel, message: msg });
      } else {
        alert(msg);
      }
    }
  };

  const toggleCampaignSelect = (cid) => {
    setBlockDialog(prev => ({ ...prev, selected: { ...prev.selected, [cid]: !prev.selected[cid] } }));
  };

  const detachSelectedCampaigns = async () => {
    const ids = Object.entries(blockDialog.selected).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) return;
    await dispatch(detachSegmentCampaigns({ id: blockDialog.segmentId, campaignIds: ids }));
    setBlockDialog({ open: false, segmentId: null, campaigns: [], selected: {} });
    // Retry deletion
    await handleDelete(blockDialog.segmentId);
  };

  // Exemples de segments prêts à l'emploi
  const segmentsExamples = [
    { nom: 'Membres actifs', criteres: { type_client: 'membre', actif: true } },
    { nom: 'Clients entreprise', criteres: { type_client: 'entreprise' } },
    { nom: 'Contacts de Tunis', criteres: { ville: 'Tunis' } },
    { nom: 'Handicap < 10', criteres: { handicap_max: 10 } },
    { nom: 'Femmes (Audience)', criteres: { sexe: 'Femme' } }
  ];

  const createExampleSegment = (example) => {
    setForm({ nom: example.nom, criteres: { ...example.criteres } });
    setEdit(null);
    setOpen(true);
    debouncedPreview(example.criteres);
  };

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize);

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedItems.map(s => s.id));
    else setSelectedIds([]);
  };

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page]);

  // Group tags for the builder
  const families = useMemo(() => {
    const filtered = (tags || []).filter(t => 
      (t.nom || '').toLowerCase().includes(tagSearch.toLowerCase())
    );

    const firstWordCounts = {};
    filtered.forEach(tag => {
      const name = (tag.nom || '').trim();
      const match = name.match(/^([^:/-]+)[:/-]/);
      let candidate = match ? match[1].trim() : name.split(/\s+/)[0];
      if (candidate) firstWordCounts[candidate] = (firstWordCounts[candidate] || 0) + 1;
    });

    const groups = {};
    filtered.forEach(tag => {
      const name = (tag.nom || '').trim();
      const match = name.match(/^([^:/-]+)[:/-]/);
      let familyName = 'Ungrouped';
      if (match) {
        familyName = match[1].trim();
      } else {
        const firstWord = name.split(/\s+/)[0];
        if (firstWord && firstWordCounts[firstWord] > 1) familyName = firstWord;
      }

      if (!groups[familyName]) groups[familyName] = { name: familyName, tags: [] };
      groups[familyName].tags.push(tag);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.name === 'Ungrouped') return 1;
      if (b.name === 'Ungrouped') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [tags, tagSearch]);

  const toggleTagFamily = (name) => {
    setExpandedFamilies(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const renderCriteriaChips = (rawCriteres, tagsList) => {
    // Parse if rawCriteres is a JSON string
    let criteres = rawCriteres;
    // Robustly handle stringified or double-stringified JSON
    while (typeof criteres === 'string' && criteres.trim() !== '') {
      try { 
        const parsed = JSON.parse(criteres); 
        if (parsed === null || typeof parsed !== 'object') break;
        criteres = parsed;
      } catch { break; }
    }
    if (!criteres || typeof criteres !== 'object') return null;

    const chips = [];
    const labelMap = {
      type_client: 'Type',
      ville: 'Ville',
      sexe: 'Sexe',
      nationalite: 'Nat.',
      tag_ids: 'Tags',
      actif: 'Actif',
      handicap_min: 'Hcp ≥',
      handicap_max: 'Hcp ≤',
    };

    // 1. Process filterRules if present
    if (Array.isArray(criteres.filterRules)) {
      criteres.filterRules.forEach((rule, rIdx) => {
        const { field, operator, value } = rule;
        let display = value;
        if (field === 'tags') {
           const ids = Array.isArray(value) ? value : [value];
           const names = (tagsList || []).filter(t => ids.includes(t.id)).map(t => t.nom);
           display = names.length > 0 ? (names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')) : ids.join(',');
        }
        if (field === 'actif') display = (value === 'true' || value === true) ? 'Oui' : 'Non';
        
        let opLabel = operator === 'is' ? '' : ` (${operator})`;
        if (operator === 'includes') opLabel = '';
        if (operator === 'excludes') opLabel = ' (Excl.)';
        if (operator === 'contains') opLabel = ' (Contient)';
        
        const label = labelMap[field] || field;
        chips.push(
          <Chip 
            key={`rule-${rIdx}`} 
            label={`${label}${opLabel}: ${display}`} 
            size="small" 
            color="primary" 
            variant="filled" 
            sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.75 }, bgcolor: alpha('#0a84d6', 0.1), color: '#0a84d6', fontWeight: 700, border: '1px solid #0a84d6' }} 
          />
        );
      });
    }

    // 2. Process legacy criteria (skipping if already in filterRules)
    const handledFields = new Set((criteres.filterRules || []).map(r => r.field));

    // Handicap range combined
    if (!handledFields.has('handicap') && (criteres.handicap_min !== undefined || criteres.handicap_max !== undefined)) {
      const min = criteres.handicap_min;
      const max = criteres.handicap_max;
      if ((min !== '' && min !== undefined) || (max !== '' && max !== undefined)) {
        chips.push(
          <Chip 
            key="handicap_range" 
            label={`Hcp ${min !== '' && min !== undefined ? min : '0'}-${max !== '' && max !== undefined ? max : '54'}`} 
            size="small" 
            color="secondary" 
            variant="outlined" 
            sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.75 } }} 
          />
        );
      }
    }

    Object.entries(criteres).forEach(([key, value]) => {
      if (key === 'handicap_min' || key === 'handicap_max' || key === 'filterRules' || key === 'filterMatch') return;
      if (handledFields.has(key)) return;
      if (value === '' || value === null || value === undefined) return;
      
      let display = value;
      if (key === 'tag_ids') {
        const ids = Array.isArray(value) ? value : [value];
        const names = (tagsList || []).filter(t => ids.includes(t.id)).map(t => t.nom);
        display = names.length > 0 ? (names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')) : (Array.isArray(value) ? value.join(', ') : value);
      }
      if (key === 'actif') display = value ? 'Oui' : 'Non';
      
      if (typeof display === 'object' && display !== null) display = JSON.stringify(display);
      if (typeof display === 'string' && display.length > 15) display = display.substring(0, 15) + '...';
      
      const label = labelMap[key] || key;
      chips.push(
        <Chip 
          key={key} 
          label={`${label}: ${display}`} 
          size="small" 
          color="secondary" 
          variant="outlined" 
          sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.75 } }} 
        />
      );
    });

    if (criteres.search) {
      chips.push(
        <Chip 
          key="search_crit" 
          label={`Recherche: "${criteres.search}"`} 
          size="small" 
          color="info" 
          variant="outlined" 
          sx={{ fontSize: 10, height: 20, '& .MuiChip-label': { px: 0.75 }, border: '1px dashed #0288d1' }} 
        />
      );
    }

    return chips;
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={6} gap={3}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>
            Segments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Filter your audience into groups based on specific criteria.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ px: 4 }}>
            Create Segment
          </Button>
        </Box>
      </Box>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <Box 
          sx={{
            position: 'fixed',
            bottom: 30,
            left: { xs: '50%', md: 'calc(50% + 120px)' }, // adjust for sidebar
            transform: 'translateX(-50%)',
            bgcolor: '#241C15',
            color: 'white',
            px: 3,
            py: 1.5,
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selectedIds.length} segment{selectedIds.length > 1 ? 's' : ''} selected
          </Typography>
          <Box display="flex" gap={1}>
            <Button 
              size="small" 
              variant="contained" 
              onClick={() => navigate(`/contacts?segmentIds=${selectedIds.join(',')}`)}
              sx={{ bgcolor: '#0a84d6', color: '#FFFFFF', fontWeight: 600, '&:hover': { bgcolor: '#0761a0' } }}
            >
              View Combined Audience
            </Button>
            <Button size="small" sx={{ color: 'white' }} onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </Box>
        </Box>
      )}

      <Paper sx={{ mb: 6, p: 4, borderRadius: 0, border: '1px solid #bfc9cf', bgcolor: '#F5F7F9' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', mb: 2 }}>
          Quick Segments
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use these templates to quickly group your audience.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {segmentsExamples.map((example, index) => (
            <Chip
              key={index}
              label={example.nom}
              onClick={() => createExampleSegment(example)}
              variant="outlined"
              sx={{ bgcolor: 'white', borderColor: '#bfc9cf', '&:hover': { bgcolor: '#F0F7FF', borderColor: '#0a84d6' } }}
            />
          ))}
          {/* Explicit Tour Operator Example */}
          <Chip
            label="Tour Operators (Family Builder)"
            onClick={() => createExampleSegment({ nom: 'Tour Operators (All)', criteres: { type_client: 'entreprise' }})} // Ideally would pre-fill with tag_ids if we knew them, but name implies purpose
            variant="outlined"
            sx={{ bgcolor: '#3b3f44', color: 'white', borderColor: '#3b3f44', '&:hover': { bgcolor: '#2d3034' } }}
          />
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress size={60} /></Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={3} mb={4}>
            {paginatedItems.length === 0 ? (
              <Box gridColumn="1 / -1" textAlign="center" py={6} bgcolor="#F9F9F9" borderRadius={2} border="1px dashed #D9D9D9">
                <FilterListIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" fontFamily="Georgia, serif">Aucun segment</Typography>
                <Typography variant="body2" color="text.secondary">Create your first segment to start grouping tags.</Typography>
              </Box>
            ) : (
              paginatedItems.map((s) => (
                <Paper 
                  key={s.id} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2, 
                    border: '1px solid #D9D9D9', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      borderColor: '#FFE01B',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox 
                        checked={selectedIds.includes(s.id)}
                        onChange={() => handleSelectOne(s.id)}
                        sx={{ p: 0 }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
                        {s.nom}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Modifier">
                        <IconButton 
                          onClick={() => handleOpen(s)} 
                          size="small"
                          sx={{ '&:hover': { bgcolor: '#F0F0F0' } }}
                        >
                          <EditIcon fontSize="small" sx={{ color: '#555' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton 
                          onClick={() => handleDelete(s.id)} 
                          size="small"
                          sx={{ '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={3} flexGrow={1}>
                    {renderCriteriaChips(s.criteres, tags) || (
                       <Typography variant="body2" color="text.secondary" fontStyle="italic">Aucun critère</Typography>
                    )}
                  </Box>

                  <Divider sx={{ mx: -3, mb: 2, borderColor: '#F0F0F0' }} />

                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      <PeopleIcon sx={{ color: '#3b3f44', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b3f44' }}>
                        {s.nb_clients ?? '—'} <Typography component="span" variant="caption" color="text.secondary" fontWeight="normal">Contacts</Typography>
                      </Typography>
                    </Box>
                    <Button 
                      size="small" 
                      variant="text"
                      onClick={() => navigate(`/contacts?segmentIds=${s.id}`)} 
                      sx={{ 
                        color: '#3b3f44', 
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#F5F7F9', color: '#0a84d6' }
                      }}
                    >
                      View Audience
                    </Button>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
          {items.length > 0 && (
            <EnhancedPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={items.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              loading={loading}
              itemLabel="segments"
            />
          )}
        </>
      )}


      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 }}}>
        <DialogTitle sx={{ fontSize: 24, fontWeight: 600, fontFamily: 'Georgia, serif', pb: 2 }}>
          {edit ? 'Edit Segment' : 'Create Segment'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} p={2} bgcolor="#F5F7F9" borderRadius={0} border="1px solid #bfc9cf">
              <Box>
                <Typography variant="subtitle1" fontWeight={600} fontFamily="Inter, sans-serif">
                  Estimated Audience Size
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Based on your current criteria below.
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {previewLoading ? <CircularProgress size={24} /> : <PeopleIcon sx={{ color: '#241C15', fontSize: 28 }} />}
                <Typography variant="h5" fontWeight={700} color="#241C15">
                  {previewLoading ? '...' : (previewCount ?? '-')}
                </Typography>
              </Box>
            </Box>

            <TextField 
              label="Segment Name" 
              name="nom" 
              value={form.nom} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              required 
              sx={{ mb: 4 }}
              placeholder="e.g., Tour Operators (All)"
              InputLabelProps={{ shrink: true }}
            />
            
            <Typography variant="h6" fontWeight={600} fontFamily="Georgia, serif" mb={1}>
              Group Tags (Family Builder)
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select multiple specific tags from the families below to group them.
            </Typography>
            
            <Box mb={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                }}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #bfc9cf', p: 1, bgcolor: 'white' }}>
                {families.map(family => {
                  const familyTagIds = family.tags.map(t => t.id);
                  const selectedInFamily = (form.criteres.tag_ids || []).filter(id => familyTagIds.includes(id));
                  const isAllSelected = familyTagIds.length > 0 && selectedInFamily.length === familyTagIds.length;
                  const isExpanded = !!expandedFamilies[family.name];
                  
                  return (
                    <Box key={family.name} sx={{ mb: 1, borderBottom: '1px solid #f0f0f0' }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#F5F7F9' }
                        }}
                        onClick={() => toggleTagFamily(family.name)}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                          <FolderIcon sx={{ color: '#8a9298', fontSize: 20 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{family.name}</Typography>
                          <Chip label={family.tags.length} size="small" sx={{ height: 18, fontSize: 10 }} />
                        </Box>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              size="small" 
                              checked={isAllSelected}
                              indeterminate={selectedInFamily.length > 0 && !isAllSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const current = new Set(form.criteres.tag_ids || []);
                                if (e.target.checked) {
                                  familyTagIds.forEach(id => current.add(id));
                                } else {
                                  familyTagIds.forEach(id => current.delete(id));
                                }
                                handleCriteriaChange('tag_ids', Array.from(current));
                              }}
                            />
                          }
                          label={<Typography variant="caption">Select All</Typography>}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Box>
                      
                      <Collapse in={isExpanded}>
                        <Box sx={{ pl: 4, pb: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1 }}>
                          {family.tags.map(tag => (
                            <FormControlLabel
                              key={tag.id}
                              control={
                                <Checkbox 
                                  size="small"
                                  checked={(form.criteres.tag_ids || []).includes(tag.id)}
                                  onChange={(e) => {
                                    const current = new Set(form.criteres.tag_ids || []);
                                    if (e.target.checked) current.add(tag.id);
                                    else current.delete(tag.id);
                                    handleCriteriaChange('tag_ids', Array.from(current));
                                  }}
                                />
                              }
                              label={<Typography variant="body2" sx={{ fontSize: 13 }}>{tag.nom}</Typography>}
                            />
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
              
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {(form.criteres.tag_ids || []).length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ width: '100%', fontWeight: 700 }}>Selected Tags:</Typography>
                    {(form.criteres.tag_ids || []).map(id => {
                      const tag = tags.find(t => t.id === id);
                      return (
                        <Chip 
                          key={id} 
                          label={tag?.nom || id} 
                          size="small" 
                          onDelete={() => {
                            const current = (form.criteres.tag_ids || []).filter(tId => tId !== id);
                            handleCriteriaChange('tag_ids', current);
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#F9F9F9', borderTop: '1px solid #E5E7EB' }}>
            <Button onClick={handleClose} size="large" sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" size="large" sx={{ borderRadius: 0, px: 4, bgcolor: '#0a84d6', color: '#FFFFFF', fontWeight: 600, '&:hover': { bgcolor: '#0761a0' } }}>
              {edit ? 'Save Changes' : 'Create Segment'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: preview contacts for a segment */}
      <Dialog open={!!contactsPreviewForId} onClose={() => dispatch(clearContactsPreview())} maxWidth="sm" fullWidth>
        <DialogTitle>Contacts du segment</DialogTitle>
        <DialogContent>
          {contactsPreviewLoading ? (
            <Box display="flex" justifyContent="center" my={3}><CircularProgress /></Box>
          ) : (
            <Box>
              {(!contactsPreview || contactsPreview.length === 0) ? (
                <Typography variant="body2" color="text.secondary">Aucun contact</Typography>
              ) : (
                contactsPreview.slice(0, 50).map(c => (
                  <Box key={c.id} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                    <Typography sx={{ fontWeight: 600 }}>{c.prenom} {c.nom} <Typography component="span" color="text.secondary">• {c.email}</Typography></Typography>
                    <Typography variant="caption" color="text.secondary">Sexe: {c.sexe || '-'} • Nationalité: {c.nationalite || '-'} • Ville: {c.ville || '-'}</Typography>
                  </Box>
                ))
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dispatch(clearContactsPreview())}>Fermer</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog: blocking campaigns with detach */}
      <Dialog open={blockDialog.open} onClose={() => setBlockDialog({ open: false, segmentId: null, campaigns: [], selected: {} })} maxWidth="sm" fullWidth>
        <DialogTitle>Segment utilisé par des campagnes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pour supprimer ce segment, détachez-le des campagnes suivantes.
          </Typography>
          <Box>
            {blockDialog.campaigns.map(c => (
              <Box key={c.id} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #eee' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{c.titre}</Typography>
                  <Typography variant="caption" color="text.secondary">ID: {c.id} • Statut: {c.statut}</Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={!!blockDialog.selected[c.id]} onChange={() => toggleCampaignSelect(c.id)} />}
                  label={blockDialog.selected[c.id] ? 'Sélectionné' : 'Sélectionner'}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialog({ open: false, segmentId: null, campaigns: [], selected: {} })}>Annuler</Button>
          <Button variant="contained" onClick={detachSelectedCampaigns}>Détacher sélectionnées</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Segments; 