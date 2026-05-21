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
import { fetchTemplates } from '../features/templates/templatesSlice';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  Chip,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Autocomplete,
  Snackbar,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import BeeLikeEditor from '../components/email/BeeLikeEditor';

const emptyCampaign = {
  titre: '',
  sujet: '',
  contenu_html: '',
  design_json: null,
  statut: 'brouillon',
  audience: 'all',
  tags_ids: [],
  segment_id: '',
  limite_envois: '',
  date_programmation: '',
  type_campagne: 'newsletter'
};

const CampaignsComplete = () => {
  const dispatch = useDispatch();
  const { items, loading, error, recipientPreview } = useSelector((state) => state.campaigns || {});
  const tagsState = useSelector((state) => state.tags || { items: [] });
  const segmentsState = useSelector((state) => state.segments || { items: [] });
  const categoriesState = useSelector((state) => state.categories || { items: [] });
  const distributionsState = useSelector((state) => state.distributions || { items: [] });
  const templatesState = useSelector((state) => state.templates || { items: [] });

  // Safe data handling
  const safeItems = Array.isArray(items) ? items : [];

  // State management
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyCampaign);
  const [activeStep, setActiveStep] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [editorReady, setEditorReady] = useState(false);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchCampaigns());
    dispatch(fetchTags());
    dispatch(fetchSegments());
    dispatch(fetchCategories());
    dispatch(fetchDistributions());
    dispatch(fetchTemplates());
  }, [dispatch]);

  // Filter and search campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = safeItems;

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(campaign => 
        String(campaign.titre || '').toLowerCase().includes(searchLower) ||
        String(campaign.sujet || '').toLowerCase().includes(searchLower) ||
        String(campaign.statut || '').toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.statut === statusFilter);
    }

    return filtered;
  }, [safeItems, search, statusFilter]);

  // Handle form changes
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle audience change
  const handleAudienceChange = (event) => {
    const audience = event.target.value;
    setForm(prev => ({
      ...prev,
      audience,
      category_id: audience === 'category' ? prev.category_id : '',
      distribution_id: audience === 'distribution' ? prev.distribution_id : '',
      segment_id: audience === 'custom' ? prev.segment_id : ''
    }));
  };

  // Handle tags change
  const handleTagsChange = (event, newValue) => {
    setForm(prev => ({ ...prev, tags_ids: newValue.map(tag => tag.id) }));
  };

  // Handle segment change
  const handleSegmentChange = (event, newValue) => {
    setForm(prev => ({ ...prev, segment_id: newValue ? newValue.id : '' }));
  };

  // Handle category change
  const handleCategoryChange = (event, newValue) => {
    setForm(prev => ({ ...prev, category_id: newValue ? newValue.id : '' }));
  };

  // Handle distribution change
  const handleDistributionChange = (event, newValue) => {
    setForm(prev => ({ ...prev, distribution_id: newValue ? newValue.id : '' }));
  };

  // Open create/edit dialog
  const handleOpen = (campaign = null) => {
    if (campaign) {
      setEdit(campaign);
      setForm({
        ...campaign,
        tags_ids: Array.isArray(campaign.tags_ids) ? campaign.tags_ids : [],
        date_programmation: campaign.date_programmation ? campaign.date_programmation.slice(0, 16) : ''
      });
    } else {
      setEdit(null);
      setForm(emptyCampaign);
    }
    setActiveStep(0);
    setOpen(true);
  };

  // Close dialog
  const handleClose = () => {
    setOpen(false);
    setEdit(null);
    setForm(emptyCampaign);
    setActiveStep(0);
    setEditorReady(false);
  };

  // Handle step navigation
  const handleNext = () => {
    if (activeStep === 0) {
      // Validate step 1: Basic info
      if (!form.titre.trim()) {
        setSnackbar({ open: true, message: 'Le titre est requis', severity: 'error' });
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Handle editor ready
  const handleEditorReady = (editorApi) => {
    setEditorReady(true);
    if (form.design_json) {
      editorApi.loadDesign(form.design_json);
    }
  };

  // Handle editor change
  const handleEditorChange = (html, design) => {
    setForm(prev => ({
      ...prev,
      contenu_html: html,
      design_json: design
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        titre: form.titre.trim(),
        sujet: form.sujet.trim() || undefined,
        contenu_html: form.contenu_html,
        design_json: form.design_json,
        statut: form.date_programmation ? 'programmée' : 'brouillon',
        audience: form.audience,
        tags_ids: form.tags_ids,
        segment_id: form.segment_id || undefined,
        category_id: form.category_id || undefined,
        distribution_id: form.distribution_id || undefined,
        limite_envois: form.limite_envois || undefined,
        date_programmation: form.date_programmation || undefined,
        type_campagne: 'newsletter'
      };

      if (edit) {
        await dispatch(updateCampaign({ id: edit.id, data: payload }));
        setSnackbar({ open: true, message: 'Campagne mise à jour avec succès', severity: 'success' });
      } else {
        await dispatch(addCampaign(payload));
        setSnackbar({ open: true, message: 'Campagne créée avec succès', severity: 'success' });
      }
      
      handleClose();
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de la sauvegarde', severity: 'error' });
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await dispatch(deleteCampaign(id));
      setSnackbar({ open: true, message: 'Campagne supprimée avec succès', severity: 'success' });
      setConfirmDeleteId(null);
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  // Handle send
  const handleSend = async (id) => {
    try {
      await dispatch(sendCampaign(id));
      setSnackbar({ open: true, message: 'Campagne envoyée avec succès', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Erreur lors de l\'envoi', severity: 'error' });
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'brouillon': return 'default';
      case 'programmée': return 'primary';
      case 'en_cours': return 'info';
      case 'envoyée': return 'success';
      case 'annulée': return 'warning';
      case 'erreur': return 'error';
      default: return 'default';
    }
  };

  // Render step content
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              label="Titre de la campagne"
              value={form.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              fullWidth
              margin="normal"
              required
              helperText="Nom de votre campagne (visible uniquement par vous)"
            />
            <TextField
              label="Sujet de l'email"
              value={form.sujet}
              onChange={(e) => handleChange('sujet', e.target.value)}
              fullWidth
              margin="normal"
              helperText="Objet de l'email (visible par les destinataires)"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Audience</InputLabel>
              <Select
                value={form.audience}
                onChange={handleAudienceChange}
                label="Audience"
              >
                <MenuItem value="all">Tous les contacts</MenuItem>
                <MenuItem value="category">Par catégorie</MenuItem>
                <MenuItem value="distribution">Par distribution</MenuItem>
                <MenuItem value="segment">Par segment</MenuItem>
              </Select>
            </FormControl>
            
            {form.audience === 'category' && (
              <Autocomplete
                options={categoriesState.items || []}
                getOptionLabel={(option) => option.nom || ''}
                value={categoriesState.items?.find(c => c.id === form.category_id) || null}
                onChange={handleCategoryChange}
                renderInput={(params) => (
                  <TextField {...params} label="Catégorie" margin="normal" fullWidth />
                )}
              />
            )}
            
            {form.audience === 'distribution' && (
              <Autocomplete
                options={distributionsState.items || []}
                getOptionLabel={(option) => option.nom || ''}
                value={distributionsState.items?.find(d => d.id === form.distribution_id) || null}
                onChange={handleDistributionChange}
                renderInput={(params) => (
                  <TextField {...params} label="Distribution" margin="normal" fullWidth />
                )}
              />
            )}
            
            {form.audience === 'segment' && (
              <Autocomplete
                options={segmentsState.items || []}
                getOptionLabel={(option) => option.nom || ''}
                value={segmentsState.items?.find(s => s.id === form.segment_id) || null}
                onChange={handleSegmentChange}
                renderInput={(params) => (
                  <TextField {...params} label="Segment" margin="normal" fullWidth />
                )}
              />
            )}
            
            <Autocomplete
              multiple
              options={tagsState.items || []}
              getOptionLabel={(option) => option.nom || ''}
              value={tagsState.items?.filter(t => form.tags_ids.includes(t.id)) || []}
              onChange={handleTagsChange}
              renderInput={(params) => (
                <TextField {...params} label="Tags" margin="normal" fullWidth />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.nom}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Créer votre email
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Utilisez l'éditeur ci-dessous pour créer votre email avec des blocs glisser-déposer
            </Typography>
            <Box sx={{ height: 500, border: '1px solid #ddd', borderRadius: 1 }}>
              <BeeLikeEditor
                initialDesign={form.design_json}
                onReady={handleEditorReady}
                onChange={handleEditorChange}
              />
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration d'envoi
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Statut</InputLabel>
              <Select
                value={form.date_programmation ? 'programmée' : 'brouillon'}
                onChange={(e) => {
                  if (e.target.value === 'brouillon') {
                    handleChange('date_programmation', '');
                  }
                }}
                label="Statut"
              >
                <MenuItem value="brouillon">Brouillon (sauvegarder seulement)</MenuItem>
                <MenuItem value="programmée">Programmer l'envoi</MenuItem>
              </Select>
            </FormControl>
            
            {form.date_programmation && (
              <TextField
                label="Date et heure d'envoi"
                type="datetime-local"
                value={form.date_programmation}
                onChange={(e) => handleChange('date_programmation', e.target.value)}
                fullWidth
                margin="normal"
                inputProps={{
                  min: new Date().toISOString().slice(0, 16)
                }}
              />
            )}
            
            <TextField
              label="Limite d'envois (optionnel)"
              type="number"
              value={form.limite_envois}
              onChange={(e) => handleChange('limite_envois', e.target.value)}
              fullWidth
              margin="normal"
              helperText="Nombre maximum d'emails à envoyer"
            />
            
            {recipientPreview && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Aperçu des destinataires
                </Typography>
                <Typography variant="body2">
                  {recipientPreview.total} destinataires trouvés
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Campagnes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Créer une campagne
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          label="Rechercher"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Statut"
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="brouillon">Brouillon</MenuItem>
            <MenuItem value="programmée">Programmée</MenuItem>
            <MenuItem value="en_cours">En cours</MenuItem>
            <MenuItem value="envoyée">Envoyée</MenuItem>
            <MenuItem value="annulée">Annulée</MenuItem>
            <MenuItem value="erreur">Erreur</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Campaigns List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement des campagnes...</Typography>
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Alert severity="error">{String(error)}</Alert>
        </Box>
      ) : filteredCampaigns.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px" flexDirection="column">
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune campagne trouvée
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {search || statusFilter !== 'all' 
              ? 'Aucune campagne ne correspond à vos critères de recherche'
              : 'Créez votre première campagne pour commencer'
            }
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titre</TableCell>
                <TableCell>Sujet</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date d'envoi</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>{String(campaign.titre || '')}</TableCell>
                  <TableCell>{String(campaign.sujet || '')}</TableCell>
                  <TableCell>
                    <Chip
                      label={String(campaign.statut || '')}
                      color={getStatusColor(campaign.statut)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {campaign.date_envoi 
                      ? new Date(campaign.date_envoi).toLocaleString()
                      : campaign.date_programmation
                      ? new Date(campaign.date_programmation).toLocaleString()
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Modifier">
                      <IconButton onClick={() => handleOpen(campaign)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton onClick={() => setConfirmDeleteId(campaign.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    {campaign.statut === 'brouillon' && (
                      <Tooltip title="Envoyer">
                        <IconButton onClick={() => handleSend(campaign.id)}>
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          {edit ? 'Modifier la campagne' : 'Créer une nouvelle campagne'}
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Informations de base</StepLabel>
            </Step>
            <Step>
              <StepLabel>Contenu de l'email</StepLabel>
            </Step>
            <Step>
              <StepLabel>Configuration d'envoi</StepLabel>
            </Step>
          </Stepper>
          
          {renderStepContent(activeStep)}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Précédent</Button>
          )}
          {activeStep < 2 ? (
            <Button variant="contained" onClick={handleNext}>
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!form.titre.trim() || !form.contenu_html}
            >
              {edit ? 'Mettre à jour' : 'Créer la campagne'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cette campagne ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleDelete(confirmDeleteId)}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampaignsComplete;



















