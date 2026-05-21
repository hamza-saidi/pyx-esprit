import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { fetchTemplates } from '../features/templates/templatesSlice';
import {
  Box,
  Typography,
  Button,
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
  Autocomplete,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import EmailEditor from '../components/EmailEditor';
import FollowUpWizard from '../components/FollowUpWizard';

const emptyCampaign = {
  titre: '',
  sujet: '',
  contenu_html: '',
  design_json: null,
  statut: 'brouillon',
  audience: 'all',
  tags_ids: [],
  segment_id: '',
  category_id: '',
  distribution_id: '',
  limite_envois: '',
  date_programmation: '',
  type_campagne: 'newsletter'
};

const CampaignsCards = () => {
  const dispatch = useDispatch();
  const { items, loading, error, recipientPreview, progress } = useSelector((state) => state.campaigns || {});
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
  const [detailsDialog, setDetailsDialog] = useState({ open: false, campaign: null });
  const [followUpDialog, setFollowUpDialog] = useState({ open: false, campaign: null });
  const editorApiRef = useRef(null);

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
      segment_id: audience === 'segment' ? prev.segment_id : ''
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
    if (campaign && typeof campaign === 'object') {
      setEdit(campaign);
      setForm({
        ...emptyCampaign,
        ...campaign,
        tags_ids: Array.isArray(campaign.tags_ids) ? campaign.tags_ids : (campaign.tags_ids ? [campaign.tags_ids] : []),
        titre: String(campaign.titre || ''),
        sujet: String(campaign.sujet || ''),
        contenu_html: String(campaign.contenu_html || ''),
        design_json: campaign.design_json || null,
        statut: String(campaign.statut || 'brouillon'),
        audience: String(campaign.audience || 'all'),
        segment_id: campaign.segment_id || '',
        category_id: campaign.category_id || '',
        distribution_id: campaign.distribution_id || '',
        limite_envois: campaign.limite_envois || '',
        date_programmation: campaign.date_programmation || ''
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
    editorApiRef.current = null;
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
    // If leaving the content step, sync the latest builder HTML
    if (activeStep === 1) {
      exportLatestFromBuilder()?.then((latest) => {
        if (latest && latest.html) {
          setForm((prev) => ({ ...prev, contenu_html: latest.html, design_json: latest.design ?? prev.design_json }));
        }
        setActiveStep((prev) => prev + 1);
      });
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Handle editor change (EmailEditor)
  const handleEditorChange = (html) => {
    setForm(prev => ({
      ...prev,
      contenu_html: html
    }));
  };

  // Calculate recipients
  const handleCalculateRecipients = async () => {
    try {
      const payload = {
        audience: form.audience,
        tags_ids: form.tags_ids,
        segment_id: form.segment_id,
        category_id: form.category_id,
        distribution_id: form.distribution_id,
        limite_envois: form.limite_envois
      };
      await dispatch(calculateRecipients(payload));
    } catch (error) {
      console.error('Error calculating recipients:', error);
    }
  };

  // Export latest builder HTML/design before submit if editor is present
  const exportLatestFromBuilder = async () => null;

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Ensure we have the freshest content from the builder
      const latest = await exportLatestFromBuilder();
      let contenu_html = form.contenu_html || '';
      const design_json = latest?.design ?? form.design_json;

      // If content is effectively empty (after stripping tags), provide a small fallback
      const visibleLen = (contenu_html || '').replace(/<[^>]*>/g, '').trim().length;
      if (visibleLen < 5) {
        contenu_html = '<p>Contenu email</p>';
      }

      const payload = {
        titre: form.titre.trim(),
        sujet: form.sujet.trim() || undefined,
        contenu_html,
        design_json,
        statut: form.statut === 'envoi_immediat' ? 'brouillon' : (form.date_programmation ? 'programmée' : 'brouillon'),
        audience: form.audience,
        tags_ids: form.tags_ids,
        segment_id: form.segment_id || undefined,
        category_id: form.category_id || undefined,
        distribution_id: form.distribution_id || undefined,
        limite_envois: form.limite_envois || undefined,
        date_programmation: (() => {
          const raw = form.date_programmation;
          if (!raw) return undefined;
          const dt = new Date(raw);
          if (isNaN(dt.getTime())) return undefined;
          if (dt <= new Date()) return undefined; // avoid backend validation error
          return raw;
        })(),
        type_campagne: 'newsletter'
      };

      const action = edit 
        ? updateCampaign({ id: edit.id, data: payload })
        : addCampaign(payload);
      const res = await dispatch(action);

      if (res && res.meta && res.meta.requestStatus === 'fulfilled') {
        setSnackbar({ open: true, message: edit ? 'Campagne mise à jour avec succès' : 'Campagne créée avec succès', severity: 'success' });
        // If user chose "Envoyer maintenant", trigger send right away
        try {
          const newId = res?.payload?.campagne?.id || (edit ? edit.id : null);
          if (form.statut === 'envoi_immediat' && newId) {
            await dispatch(sendCampaign(newId));
            setSnackbar({ open: true, message: 'Envoi immédiat déclenché', severity: 'success' });
          }
        } catch {}
        handleClose();
      } else {
        const details = Array.isArray(res?.payload?.errors) && res.payload.errors.length > 0
          ? res.payload.errors.join(', ')
          : '';
        const base = res?.payload?.message || 'Erreur lors de la sauvegarde';
        setSnackbar({ open: true, message: details ? `${base}: ${details}` : base, severity: 'error' });
      }
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

  // Handle duplicate
  const handleDuplicate = (campaign) => {
    const duplicatedCampaign = {
      ...campaign,
      titre: `${campaign.titre} (Copie)`,
      statut: 'brouillon',
      date_envoi: null,
      date_programmation: null
    };
    handleOpen(duplicatedCampaign);
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

  // Get campaign details
  const getCampaignDetails = (campaign) => {
    const segment = segmentsState.items?.find(s => s.id === campaign.segment_id);
    const category = categoriesState.items?.find(c => c.id === campaign.category_id);
    const distribution = distributionsState.items?.find(d => d.id === campaign.distribution_id);
    const tags = tagsState.items?.filter(t => campaign.tags_ids?.includes(t.id)) || [];

    return { segment, category, distribution, tags };
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
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Aperçu des destinataires
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cliquez sur "Calculer" pour voir le nombre de destinataires
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCalculateRecipients}
                sx={{ mt: 1 }}
              >
                Calculer
              </Button>
              {recipientPreview && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>{recipientPreview.total} destinataires</strong> trouvés
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Contenu de l'email
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Saisissez votre message. Seul ce contenu sera envoyé.
            </Typography>
            <EmailEditor value={form.contenu_html} onChange={handleEditorChange} />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Envoi
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Choisissez comment envoyer cette campagne.
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Mode</InputLabel>
              <Select
                value={form.date_programmation ? 'schedule' : (form.statut === 'envoi_immediat' ? 'now' : 'draft')}
                onChange={(e) => {
                  const mode = e.target.value;
                  if (mode === 'draft') {
                    setForm((prev) => ({ ...prev, statut: 'brouillon', date_programmation: '' }));
                  } else if (mode === 'now') {
                    setForm((prev) => ({ ...prev, statut: 'envoi_immediat', date_programmation: '' }));
                  } else if (mode === 'schedule') {
                    setForm((prev) => ({ ...prev, statut: 'programmée', date_programmation: prev.date_programmation || new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16) }));
                  }
                }}
                label="Mode"
              >
                <MenuItem value="draft">Brouillon (enregistrer seulement)</MenuItem>
                <MenuItem value="now">Envoyer maintenant</MenuItem>
                <MenuItem value="schedule">Programmer</MenuItem>
              </Select>
            </FormControl>

            {form.statut === 'programmée' && (
              <TextField
                label="Date et heure d'envoi"
                type="datetime-local"
                value={form.date_programmation || ''}
                onChange={(e) => handleChange('date_programmation', e.target.value)}
                fullWidth
                margin="normal"
                inputProps={{ min: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16) }}
                helperText="Choisissez une date/heure future"
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
                  <strong>{recipientPreview.total} destinataires</strong> seront contactés
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Campagnes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Créer
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
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

      {/* Campaigns Cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement...</Typography>
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
              ? 'Aucune campagne ne correspond à vos critères'
              : 'Créez votre première campagne pour commencer'
            }
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredCampaigns.map((campaign) => {
            const { segment, category, distribution, tags } = getCampaignDetails(campaign);
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={campaign.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      boxShadow: 2,
                      borderColor: '#1976d2'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    {/* Header with status */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {String(campaign.titre || 'Sans titre')}
                      </Typography>
                      <Chip
                        label={String(campaign.statut || '')}
                        color={getStatusColor(campaign.statut)}
                        size="small"
                      />
                    </Box>

                    {/* Subject */}
                    {campaign.sujet && (
                      <Typography variant="body2" color="text.secondary" noWrap mb={1}>
                        {String(campaign.sujet)}
                      </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    {/* Details */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Date: {campaign.date_envoi 
                          ? new Date(campaign.date_envoi).toLocaleDateString()
                          : campaign.date_programmation
                          ? new Date(campaign.date_programmation).toLocaleDateString()
                          : 'Non définie'
                        }
                      </Typography>
                      
                      {segment && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Segment: {segment.nom}
                        </Typography>
                      )}
                      
                      {category && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Catégorie: {category.nom}
                        </Typography>
                      )}
                      
                      {distribution && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Distribution: {distribution.nom}
                        </Typography>
                      )}
                    </Box>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {tags.slice(0, 2).map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.nom}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {tags.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{tags.length - 2} autres
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                    <Tooltip title="Voir détails">
                      <IconButton 
                        size="small" 
                        onClick={() => setDetailsDialog({ open: true, campaign })}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => handleOpen(campaign)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dupliquer">
                      <IconButton size="small" onClick={() => handleDuplicate(campaign)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    {campaign.statut === 'brouillon' && (
                      <Tooltip title="Envoyer">
                        <IconButton size="small" onClick={() => handleSend(campaign.id)}>
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {campaign.statut === 'envoyée' && (
                      <Tooltip title="Créer un suivi">
                        <IconButton
                          size="small"
                          onClick={() => setFollowUpDialog({ open: true, campaign })}
                          sx={{ color: '#3b82f6', '&:hover': { bgcolor: 'rgba(59,130,246,0.08)' } }}
                        >
                          <ReplayIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Supprimer">
                      <IconButton 
                        size="small" 
                        onClick={() => setConfirmDeleteId(campaign.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Follow-Up Wizard */}
      <FollowUpWizard
        open={followUpDialog.open}
        campaign={followUpDialog.campaign}
        onClose={() => setFollowUpDialog({ open: false, campaign: null })}
        onSuccess={() => {
          dispatch(fetchCampaigns());
          setSnackbar({ open: true, message: 'Campagne de suivi créée avec succès !', severity: 'success' });
        }}
      />

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
              disabled={!form.titre.trim()}
            >
              {edit ? 'Mettre à jour' : 'Créer la campagne'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.open} onClose={() => setDetailsDialog({ open: false, campaign: null })} maxWidth="md" fullWidth>
        <DialogTitle>Détails de la campagne</DialogTitle>
        <DialogContent>
          {detailsDialog.campaign && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {String(detailsDialog.campaign.titre || 'Sans titre')}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Informations générales</Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Sujet:</strong> {String(detailsDialog.campaign.sujet || 'Non défini')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Statut:</strong> {String(detailsDialog.campaign.statut || '')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date de création:</strong> {detailsDialog.campaign.date_creation 
                    ? new Date(detailsDialog.campaign.date_creation).toLocaleString()
                    : 'Non définie'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date d'envoi:</strong> {detailsDialog.campaign.date_envoi 
                    ? new Date(detailsDialog.campaign.date_envoi).toLocaleString()
                    : detailsDialog.campaign.date_programmation
                    ? new Date(detailsDialog.campaign.date_programmation).toLocaleString()
                    : 'Non programmée'
                  }
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Audience</Typography>
                {(() => {
                  const { segment, category, distribution, tags } = getCampaignDetails(detailsDialog.campaign);
                  return (
                    <>
                      {segment && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Segment:</strong> {segment.nom}
                        </Typography>
                      )}
                      {category && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Catégorie:</strong> {category.nom}
                        </Typography>
                      )}
                      {distribution && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Distribution:</strong> {distribution.nom}
                        </Typography>
                      )}
                      {tags.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Tags:</strong>
                          </Typography>
                          {tags.map((tag) => (
                            <Chip
                              key={tag.id}
                              label={tag.nom}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>

              {detailsDialog.campaign.contenu_html && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Aperçu du contenu</Typography>
                  <Box 
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      p: 2, 
                      maxHeight: 300, 
                      overflow: 'auto',
                      bgcolor: 'grey.50'
                    }}
                    dangerouslySetInnerHTML={{ __html: detailsDialog.campaign.contenu_html }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, campaign: null })}>
            Fermer
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDetailsDialog({ open: false, campaign: null });
              handleOpen(detailsDialog.campaign);
            }}
          >
            Modifier
          </Button>
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

export default CampaignsCards;

