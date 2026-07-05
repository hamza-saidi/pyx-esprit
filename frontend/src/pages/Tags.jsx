import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTags,
  fetchTagsWithCounts,
  addTag,
  updateTag,
  deleteTag,
} from '../features/tags/tagsSlice';
import {
  Box, Typography, Button, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Tooltip, Chip, Grid, Checkbox, List, ListItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EnhancedPagination from '../components/EnhancedPagination';
import { mergeTags } from '../features/tags/tagsSlice';
import { addSegment, fetchSegments } from '../features/segments/segmentsSlice';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { FormControlLabel, Switch, Collapse, Divider, Radio, RadioGroup } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import GroupsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { alpha } from '@mui/material/styles';

const emptyTag = { nom: '' };
const renderVal = (v) => {
  const s = (v === null || v === undefined) ? '' : String(v).trim();
  return s ? s : (<span style={{ color: '#9aa0a6', fontStyle: 'italic' }}>—</span>);
};

const Tags = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error, tagsWithCounts, countsLoading } = useSelector((state) => state.tags);
  const { items: segments } = useSelector((state) => state.segments || { items: [] });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyTag);
  const [targetSegmentId, setTargetSegmentId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [createSegmentDialogOpen, setCreateSegmentDialogOpen] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [targetId, setTargetId] = useState('');
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [groupByPrefix, setGroupByPrefix] = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchTagsWithCounts());
    dispatch(fetchSegments());
  }, [dispatch]);

  const handleOpen = (tag = null) => {
    setEdit(tag);
    setForm(tag ? { ...tag } : emptyTag);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = (form.nom || '').trim();
    if (!trimmed) return;
    const payload = { nom: trimmed };
    if (edit) {
      await dispatch(updateTag({ id: edit.id, data: payload }));
    } else {
      await dispatch(addTag(payload));
    }
    setOpen(false);
    // Recharger les compteurs après ajout/modification
    dispatch(fetchTagsWithCounts());
  };

  const handleDelete = (id) => {
    dispatch(deleteTag(id));
    // Recharger les compteurs après suppression
    setTimeout(() => dispatch(fetchTagsWithCounts()), 500);
  };

  const contactCountMap = useMemo(() => {
    const map = new Map();
    (tagsWithCounts || []).forEach(tag => {
      map.set(tag.id, tag.contactCount || 0);
    });
    return map;
  }, [tagsWithCounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items || [];
    return (items || []).filter(t => String(t.nom || '').toLowerCase().includes(q));
  }, [items, search]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const families = useMemo(() => {
    if (!groupByPrefix) return [];
    
    // First pass: identify potential prefixes
    const groups = {};
    const firstWordCounts = {};

    filtered.forEach(tag => {
      const name = (tag.nom || '').trim();
      // Try explicit separator first
      const match = name.match(/^([^:/-]+)[:/-]/);
      let candidate = '';
      
      if (match) {
        candidate = match[1].trim();
      } else {
        // Otherwise try the first word
        candidate = name.split(/\s+/)[0];
      }

      if (candidate) {
        firstWordCounts[candidate] = (firstWordCounts[candidate] || 0) + 1;
      }
    });

    // Second pass: assign to groups
    filtered.forEach(tag => {
      const name = (tag.nom || '').trim();
      const match = name.match(/^([^:/-]+)[:/-]/);
      let familyName = 'Ungrouped';

      if (match) {
        familyName = match[1].trim();
      } else {
        const firstWord = name.split(/\s+/)[0];
        // Only group if it's a shared prefix (at least 2 tags)
        if (firstWord && firstWordCounts[firstWord] > 1) {
          familyName = firstWord;
        }
      }

      if (!groups[familyName]) groups[familyName] = { name: familyName, tags: [], totalContacts: 0 };
      groups[familyName].tags.push(tag);
      groups[familyName].totalContacts += (contactCountMap.get(tag.id) || 0);
    });

    return Object.values(groups).sort((a, b) => {
      if (a.name === 'Ungrouped') return 1;
      if (b.name === 'Ungrouped') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, groupByPrefix, contactCountMap]);

  const toggleFamily = (name) => {
    setExpandedFamilies(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = () => {
    const all = {};
    families.forEach(f => { all[f.name] = true; });
    setExpandedFamilies(all);
  };

  const collapseAll = () => {
    setExpandedFamilies({});
  };

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page]);

  const suggestions = [
    'Pays: France, Espagne, Maroc',
    'Langue: FR, EN, AR',
    'Type client: Membre, Entreprise',
    'Niveau: Débutant, Intermédiaire, Avancé',
    'Intérêts: Compétition, Formation, Offres',
  ];

  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Supprimer ${selectedIds.length} étiquette(s) ? Cette action est irréversible.`)) return;
    for (const id of selectedIds) {
      await dispatch(deleteTag(id));
    }
    setSelectedIds([]);
    setTimeout(() => dispatch(fetchTagsWithCounts()), 500);
  };

  const handleMerge = async () => {
    if (!targetId) return;
    const sourceIds = selectedIds.filter(id => id !== targetId);
    if (sourceIds.length === 0) return;
    
    const res = await dispatch(mergeTags({ sourceIds, targetId }));
    if (!res.error) {
      setSnackbar({ open: true, message: 'Étiquettes fusionnées avec succès', severity: 'success' });
      setSelectedIds([]);
      setMergeDialogOpen(false);
    } else {
      setSnackbar({ open: true, message: res.payload || 'Fusion échouée', severity: 'error' });
    }
  };

  const findDuplicates = () => {
    const groups = {};
    (items || []).forEach(tag => {
      const normalized = (tag.nom || '').trim().toLowerCase();
      if (!groups[normalized]) groups[normalized] = [];
      groups[normalized].push(tag);
    });

    const dupGroups = Object.values(groups).filter(g => g.length > 1);
    setDuplicateGroups(dupGroups);
    setWizardOpen(true);
  };

  const mergeGroup = async (group) => {
    const master = group[0];
    const sourceIds = group.slice(1).map(t => t.id);
    const res = await dispatch(mergeTags({ sourceIds, targetId: master.id }));
    if (!res.error) {
      setDuplicateGroups(prev => prev.filter(g => g !== group));
      setSnackbar({ open: true, message: `Fusionné dans "${master.nom}"`, severity: 'success' });
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }} 
        mb={6} 
        gap={3}
      >
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Georgia, serif', mb: 1 }}>
            Étiquettes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Utilisez des étiquettes pour labelliser et organiser votre audience.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          {selectedIds.length > 0 && (
            <>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {
                  const tagIds = selectedIds.join(',');
                  navigate(`/contacts?tagIds=${tagIds}`);
                }}
                startIcon={<VisibilityIcon />}
              >
                Voir les contacts ({selectedIds.length})
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={() => {
                  setTargetId(selectedIds[0]);
                  setMergeDialogOpen(true);
                }}
                startIcon={<MergeTypeIcon />}
              >
                Fusionner ({selectedIds.length})
              </Button>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {
                  const defaultName = selectedIds.length > 1 ? `Segment ${new Date().toLocaleDateString()}` : (items.find(t=>t.id===selectedIds[0])?.nom || '');
                  setNewSegmentName(defaultName);
                  setCreateSegmentDialogOpen(true);
                }}
                startIcon={<GroupsIcon />}
              >
                Créer un segment
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleBulkDelete}
                startIcon={<DeleteIcon />}
              >
                Supprimer ({selectedIds.length})
              </Button>
            </>
          )}
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={groupByPrefix} onChange={(e) => setGroupByPrefix(e.target.checked)} size="small" color="secondary" />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Grouper par familles</Typography>}
              sx={{ ml: 1 }}
            />
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={findDuplicates}
              startIcon={<AutoFixHighIcon />}
            >
              Doublons
            </Button>
          </Box>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen()} 
            sx={{ px: 4 }}
          >
            Créer une étiquette
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 6, p: 4, borderRadius: 0, border: '1px solid #bfc9cf', bgcolor: '#F5F7F9' }}>
        <Box display="flex" gap={3} alignItems="center" flexWrap="wrap">
          <TextField 
            label="Rechercher"
            placeholder="Rechercher par nom..."
            value={search} 
            onChange={(e)=>setSearch(e.target.value)}
            variant="outlined"
            size="small"
          />
          {groupByPrefix && families.length > 0 && (
            <Box display="flex" gap={1}>
              <Button size="small" onClick={expandAll}>Tout déplier</Button>
              <Button size="small" onClick={collapseAll}>Tout replier</Button>
            </Box>
          )}
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress size={60} sx={{ color: '#0a84d6' }} />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : groupByPrefix ? (
        <Box display="flex" flexDirection="column" gap={4}>
          {families.map(family => (
            <Paper 
              key={family.name}
              sx={{ 
                p: 0, 
                borderRadius: 0, 
                border: '1px solid #bfc9cf', 
                overflow: 'hidden',
                bgcolor: 'white'
              }}
            >
              <Box 
                onClick={() => toggleFamily(family.name)}
                sx={{ 
                  p: 2, 
                  bgcolor: '#F5F7F9', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  '&:hover': { bgcolor: '#eceff2' }
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {expandedFamilies[family.name] ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                  <FolderIcon sx={{ color: '#8a9298' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                    {family.name}
                  </Typography>
                  <Chip label={`${family.tags.length} étiquette${family.tags.length > 1 ? 's' : ''}`} size="small" sx={{ borderRadius: 0, fontWeight: 700 }} />
                </Box>
                <Box display="flex" alignItems="center" gap={4}>
                   <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary" display="block">PORTÉE</Typography>
                      <Typography variant="subtitle2" fontWeight={700}>{family.totalContacts} Contacts</Typography>
                   </Box>
                   <Button 
                    size="small" 
                    variant="outlined" 
                    color="secondary" 
                    startIcon={<GroupsIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewSegmentName(`${family.name} Group`);
                      setSelectedIds(family.tags.map(t => t.id));
                      setCreateSegmentDialogOpen(true);
                    }}
                   >
                     Créer un segment
                   </Button>
                </Box>
              </Box>
              
              <Collapse in={expandedFamilies[family.name]}>
                <Divider />
                <Grid container spacing={0} sx={{ bgcolor: 'white' }}>
                   {family.tags.map(t => {
                      const count = contactCountMap.get(t.id) ?? 0;
                      const isSelected = selectedIds.includes(t.id);
                      return (
                        <Grid item xs={12} sm={6} md={4} key={t.id} sx={{ borderRight: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                           <Box p={2} display="flex" justifyContent="space-between" alignItems="center" sx={{ bgcolor: isSelected ? alpha('#0a84d6', 0.05) : 'transparent' }}>
                              <Box display="flex" alignItems="center" gap={1.5}>
                                <Checkbox 
                                  size="small" 
                                  checked={isSelected} 
                                  onChange={() => toggleSelect(t.id)} 
                                  sx={{ p: 0.5 }}
                                />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.nom}</Typography>
                                  <Typography 
                                    variant="caption" 
                                    color="primary" 
                                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                    onClick={() => navigate(`/contacts?tagId=${t.id}`)}
                                  >
                                    {count} Contacts
                                  </Typography>
                                </Box>
                              </Box>
                              <Box display="flex">
                                <IconButton size="small" onClick={() => handleOpen(t)}><EditIcon fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => handleDelete(t.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                              </Box>
                           </Box>
                        </Grid>
                      );
                   })}
                </Grid>
              </Collapse>
            </Paper>
          ))}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {paginatedItems.length === 0 ? (
            <Grid item xs={12}>
              <Box 
                p={8} 
                textAlign="center" 
                sx={{ border: '1px dashed #D9D9D9', bgcolor: '#FAFAFA' }}
              >
                 <Typography variant="h6" color="text.secondary">
                  {search ? 'Aucune étiquette ne correspond à votre recherche.' : "Vous n'avez encore créé aucune étiquette."}
                </Typography>
              </Box>
            </Grid>
          ) : (
            paginatedItems.map((t) => {
              const count = contactCountMap.get(t.id) ?? 0;
              const isSelected = selectedIds.includes(t.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      borderRadius: 0, 
                      border: '1px solid',
                      borderColor: isSelected ? '#0a84d6' : '#bfc9cf',
                      bgcolor: isSelected ? '#F0F7FF' : 'white',
                      transition: 'all 0.2s',
                      position: 'relative',
                      '&:hover': {
                        borderColor: '#0a84d6',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Checkbox 
                          size="small" 
                          checked={isSelected} 
                          onChange={() => toggleSelect(t.id)}
                          sx={{ p: 0 }}
                        />
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontFamily: 'Georgia, serif', 
                            fontWeight: 700,
                            wordBreak: 'break-word',
                            mr: 2
                          }}
                        >
                          {t.nom}
                        </Typography>
                      </Box>
                      <Box display="flex">
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => handleOpen(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isSelected && (
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => handleDelete(t.id)} sx={{ color: 'error.main' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        pt: 2,
                        borderTop: '1px solid #F0F0F0'
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Contacts
                        </Typography>
                        <Typography 
                          variant="h4" 
                          component="button"
                          onClick={() => navigate(`/contacts?tagId=${t.id}`)}
                          sx={{ 
                            border: 'none',
                            background: 'none',
                            p: 0,
                            cursor: 'pointer',
                            fontWeight: 700, 
                            color: '#241C15',
                            '&:hover': {
                              color: '#007C89', // Mailchimp blue for links
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {countsLoading ? '---' : count}
                        </Typography>
                      </Box>
                      <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => navigate(`/composer?campagneMode=1&tagIds=${t.id}`)}
                        sx={{ fontWeight: 700 }}
                      >
                        Cibler
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {filtered.length > 0 && !groupByPrefix && (
        <Box mt={6}>
          <EnhancedPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            loading={loading}
            itemLabel="tags"
          />
        </Box>
      )}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          {edit ? "Modifier l'étiquette" : 'Créer une étiquette'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField 
              label="Nom de l'étiquette"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              placeholder="ex. : VIP, Membre, Partenaire"
            />
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                Suggestions :
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {suggestions.map((s, i) => (
                  <Chip 
                    key={i} 
                    label={s.split(':')[0]} 
                    size="small" 
                    variant="outlined" 
                    onClick={() => setForm(prev=>({ ...prev, nom: s.split(':')[1]?.split(',')[0]?.trim() || prev.nom }))} 
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F0F0F0' } }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained" color="secondary">
              {edit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MERGE DIALOG */}
      <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          Fusionner les étiquettes sélectionnées
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Choisissez l&apos;<strong>étiquette principale</strong>. Toutes les autres étiquettes sélectionnées seront supprimées et leurs contacts déplacés vers cette étiquette.
          </Typography>
          <TextField
            select
            fullWidth
            label="Étiquette principale"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            SelectProps={{ native: true }}
          >
            {selectedIds.map(id => {
              const tag = items.find(t => t.id === id);
              return <option key={id} value={id}>{tag?.nom || id}</option>;
            })}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setMergeDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleMerge} variant="contained" color="secondary" startIcon={<MergeTypeIcon />}>
            Fusionner
          </Button>
        </DialogActions>
      </Dialog>

      {/* DUP WIZARD */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Assistant de nettoyage des doublons
          <Chip label={`${duplicateGroups.length} groupe${duplicateGroups.length > 1 ? 's' : ''} trouvé${duplicateGroups.length > 1 ? 's' : ''}`} size="small" color="primary" />
        </DialogTitle>
        <DialogContent dividers>
          {duplicateGroups.length === 0 ? (
            <Box p={4} textAlign="center">
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography>Aucun doublon potentiel trouvé (comparaison insensible à la casse).</Typography>
            </Box>
          ) : (
            <List>
              {duplicateGroups.map((group, idx) => (
                <ListItem key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, p: 2, bgcolor: '#F8F9FA', border: '1px solid #E9ecef' }}>
                   <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Groupe : &ldquo;{group[0].nom.trim()}&rdquo;</Typography>
                      <Button size="small" variant="contained" onClick={() => mergeGroup(group)} startIcon={<MergeTypeIcon />}>Tout fusionner</Button>
                   </Box>
                   <Box display="flex" flexWrap="wrap" gap={0.5}>
                     {group.map(t => (
                        <Chip key={t.id} label={`${t.nom} (${contactCountMap.get(t.id) || 0})`} size="small" variant="outlined" />
                     ))}
                   </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setWizardOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* CREATE/UPDATE SEGMENT DIALOG */}
      <Dialog open={createSegmentDialogOpen} onClose={() => setCreateSegmentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          Gérer le segment pour la sélection
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Enregistrer ces {selectedIds.length} étiquette{selectedIds.length > 1 ? 's' : ''} dans un segment nouveau ou existant.
          </Typography>

          <RadioGroup 
            value={targetSegmentId ? 'update' : 'create'} 
            onChange={(e) => {
              if (e.target.value === 'create') setTargetSegmentId('');
              else if (segments.length > 0) setTargetSegmentId(segments[0]?.id || '');
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="create" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Créer un nouveau segment</Typography>} labelPlacement="end" />
            <FormControlLabel value="update" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Mettre à jour un segment existant</Typography>} labelPlacement="end" />
          </RadioGroup>

          {!targetSegmentId ? (
            <TextField
              fullWidth
              label="Nom du segment"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              required
              autoFocus
              size="small"
            />
          ) : (
            <TextField
              select
              fullWidth
              label="Sélectionner un segment"
              value={targetSegmentId}
              onChange={(e) => setTargetSegmentId(e.target.value)}
              size="small"
              SelectProps={{ native: true }}
            >
              {(segments || []).map(s => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateSegmentDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<GroupsIcon />}
            onClick={async () => {
              if (targetSegmentId) {
                // Update existing
                const segment = segments.find(s => s.id == targetSegmentId);
                let criteres = segment.criteres;
                if (typeof criteres === 'string') try { criteres = JSON.parse(criteres); } catch { criteres = {}; }
                
                // Add new tags to existing ones (merge)
                const currentTags = Array.isArray(criteres.tag_ids) ? criteres.tag_ids : [];
                const mergedTags = Array.from(new Set([...currentTags, ...selectedIds]));
                
                const res = await dispatch(updateSegment({
                  id: targetSegmentId,
                  data: { criteres: { ...criteres, tag_ids: mergedTags } }
                }));
                 
                if (!res.error) {
                   setSnackbar({ open: true, message: `Segment "${segment.nom}" mis à jour !`, severity: 'success' });
                   setCreateSegmentDialogOpen(false);
                   setSelectedIds([]);
                   dispatch(fetchSegments());
                }
              } else {
                // Create new
                if (!newSegmentName.trim()) return;
                const criteres = {
                  tag_ids: selectedIds,
                  filterRules: [
                    {
                      id: Date.now().toString(),
                      field: 'tags',
                      operator: 'includes',
                      value: selectedIds
                    }
                  ],
                  filterMatch: 'any'
                };
                
                const res = await dispatch(addSegment({
                  nom: newSegmentName,
                  criteres
                }));
                if (!res.error) {
                  setSnackbar({ open: true, message: `Segment "${newSegmentName}" créé !`, severity: 'success' });
                  setCreateSegmentDialogOpen(false);
                  setSelectedIds([]);
                  dispatch(fetchSegments());
                } else {
                  setSnackbar({ open: true, message: res.payload || 'Échec de la création du segment', severity: 'error' });
                }
              }
            }}
          >
            {targetSegmentId ? 'Mettre à jour' : 'Créer le segment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tags; 