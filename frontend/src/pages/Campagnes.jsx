import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  IconButton,
  Tooltip,
  TextField,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReplayIcon from '@mui/icons-material/Replay';
import {
  fetchCampaigns,
  deleteCampaign,
  sendCampaign,
  duplicateCampaign,
} from '../features/campaigns/campaignsSlice';
import { fetchTags } from '../features/tags/tagsSlice';
import axios from '../api/axios';
import FollowUpWizard from '../components/FollowUpWizard';

const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'brouillon':
      return 'default';
    case 'programmée':
      return 'primary';
    case 'en_cours':
      return 'info';
    case 'envoyée':
      return 'success';
    case 'annulée':
      return 'warning';
    case 'erreur':
      return 'error';
    default:
      return 'default';
  }
};

const normalizeIdList = (raw) => {
  if (Array.isArray(raw)) return raw.filter((v) => v !== null && v !== undefined);
  if (typeof raw === 'number') return [raw];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((v) => Number(v) || v);
    }
  }
  return [];
};

const Campagnes = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items = [], loading, error } = useSelector((state) => state.campaigns || {});
  const tagsState = useSelector((state) => state.tags || { items: [] });
  const tagsMap = React.useMemo(() => {
    const map = new Map();
    (tagsState.items || []).forEach((tag) => {
      if (tag && tag.id != null) {
        map.set(tag.id, tag.nom || `Tag #${tag.id}`);
      }
    });
    return map;
  }, [tagsState.items]);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [duplicateDialog, setDuplicateDialog] = useState({ open: false, campaign: null, newTitle: '' });
  const [previewState, setPreviewState] = useState({
    open: false,
    loading: false,
    html: '',
    title: '',
    subject: '',
    campaignId: null,
  });
  const [followUpDialog, setFollowUpDialog] = useState({ open: false, campaign: null });
  const [sending, setSending] = useState(false);
  const handlePreview = async (campaign) => {
    if (!campaign?.id) return;
    setPreviewState({
      open: true,
      loading: true,
      html: '',
      title: campaign.titre || 'Aperçu campagne',
      subject: campaign.sujet || '',
      campaignId: campaign.id,
    });
    try {
      const res = await axios.get(`/campagnes/${campaign.id}`);
      const data = res.data || {};
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        html: data.contenu_html || '<p>(Aucun contenu)</p>',
        title: data.titre || prev.title,
        subject: data.sujet || prev.subject,
      }));
    } catch (err) {
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        html: `<p style="color:red">Impossible de charger l'aperçu: ${err?.response?.data?.message || err.message || 'Erreur inconnue'}</p>`,
      }));
    }
  };


  useEffect(() => {
    dispatch(fetchCampaigns());
    dispatch(fetchTags());
  }, [dispatch]);

  const filteredCampaigns = useMemo(() => {
    let filtered = items;
    
    // Filtre par statut
    if (statusFilter) {
      filtered = filtered.filter(campaign => campaign.statut === statusFilter);
    }
    
    // Filtre par recherche
    if (search.trim()) {
      const lower = search.toLowerCase();
      filtered = filtered.filter((campaign) => {
        const titre = String(campaign?.titre || '').toLowerCase();
        const sujet = String(campaign?.sujet || '').toLowerCase();
        const statut = String(campaign?.statut || '').toLowerCase();
        return (
          titre.includes(lower) ||
          sujet.includes(lower) ||
          statut.includes(lower)
        );
      });
    }
    
    return filtered;
  }, [items, search, statusFilter]);

  const handleRefresh = () => {
    dispatch(fetchCampaigns());
  };

  const handleCreate = () => {
    navigate('/composer?campagneMode=1');
  };

  const handleEdit = (id) => {
    navigate(`/composer?campagneMode=1&campagneId=${id}`);
  };

  const handleViewReport = (id) => {
    navigate(`/statistics?tab=2&campaignId=${id}`);
  };

  const handleConfirmDelete = (campaign) => {
    setSelectedCampaign(campaign);
    setConfirmDeleteId(campaign?.id || null);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await dispatch(deleteCampaign(confirmDeleteId)).unwrap();
      setConfirmDeleteId(null);
      setSelectedCampaign(null);
    } catch (err) {
      alert(err?.message || 'Suppression impossible');
    }
  };

  const handleSend = async (campaign) => {
    if (!campaign?.id || sending) return;
    try {
      setSending(true);
      await dispatch(sendCampaign(campaign.id)).unwrap();
      await dispatch(fetchCampaigns());
      alert('Campagne envoyée avec succès !');
    } catch (err) {
      alert(err?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleDuplicate = (campaign) => {
    setDuplicateDialog({
      open: true,
      campaign,
      newTitle: `${campaign.titre} (Copie)`
    });
  };

  const confirmDuplicate = async () => {
    if (!duplicateDialog.campaign?.id) return;
    try {
      await dispatch(duplicateCampaign({
        id: duplicateDialog.campaign.id,
        nouveau_titre: duplicateDialog.newTitle.trim() || undefined
      })).unwrap();
      setDuplicateDialog({ open: false, campaign: null, newTitle: '' });
      await dispatch(fetchCampaigns());
      alert('Campagne dupliquée avec succès ! Vous pouvez maintenant la modifier et l\'envoyer.');
    } catch (err) {
      alert(err?.message || 'Erreur lors de la duplication');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={260}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Chargement des campagnes...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error">
          {typeof error === 'string' ? error : 'Erreur lors du chargement des campagnes'}
        </Alert>
      );
    }

    if (!filteredCampaigns.length) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
          flexDirection="column"
          textAlign="center"
          sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 4 }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune campagne
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Utilisez le bouton &laquo; Nouvelle campagne &raquo; pour commencer avec le composer.
          </Typography>
        </Box>
      );
    }

    return (
      <Paper sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Campaign</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCampaigns.map((campaign) => (
              <TableRow key={campaign.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">
                    {campaign.titre || 'Sans titre'}
                  </Typography>
                  {(() => {
                    const tagList = normalizeIdList(campaign.tags_ids);
                    if (!tagList.length) return null;
                    return (
                    <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                      {tagList.slice(0, 3).map((tagId) => {
                        const label = tagsMap.get(Number(tagId)) || `Tag #${tagId}`;
                        return (
                        <Chip
                          key={`${campaign.id}-${tagId}`}
                          label={label}
                          size="small"
                          variant="outlined"
                        />
                        );
                      })}
                      {tagList.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{tagList.length - 3}
                        </Typography>
                      )}
                    </Box>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {campaign.sujet || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={campaign.statut || '—'}
                    color={statusColor(campaign.statut)}
                  />
                </TableCell>
                <TableCell align="right">
                  {campaign.date_creation
                    ? new Date(campaign.date_creation).toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Quick Preview">
                    <IconButton size="small" onClick={() => handlePreview(campaign)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Campaign">
                    <IconButton size="small" onClick={() => handleEdit(campaign.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {campaign.statut === 'brouillon' && (
                    <Tooltip title="Send Now">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleSend(campaign)}
                          disabled={sending}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {campaign.statut === 'envoyée' && (
                    <>
                      <Tooltip title="View Report">
                        <IconButton
                          size="small"
                          onClick={() => handleViewReport(campaign.id)}
                          sx={{ color: '#0a84d6' }}
                        >
                          <AssessmentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Créer un suivi">
                        <IconButton
                          size="small"
                          onClick={() => setFollowUpDialog({ open: true, campaign })}
                          sx={{ color: '#3b82f6' }}
                        >
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {(campaign.statut === 'envoyée' || campaign.statut === 'programmée' || campaign.statut === 'brouillon') && (
                    <Tooltip title="Reuse Campaign">
                      <IconButton
                        size="small"
                        onClick={() => handleDuplicate(campaign)}
                        sx={{ color: 'primary.main' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete Campaign">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleConfirmDelete(campaign)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    );
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
            Campaigns
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and monitor your newsletter performance.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ px: 4 }}
          >
            New Campaign
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 6, p: 4, borderRadius: 0, border: '1px solid #D9D9D9', bgcolor: '#F6F6F6' }}>
        <Box display="flex" gap={3} alignItems="center" flexWrap="wrap">
          <TextField
            label="Search campaigns"
            placeholder="Title, subject or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 250, bgcolor: 'white' }}
            variant="outlined"
            size="small"
          />
          <FormControl sx={{ minWidth: 200, bgcolor: 'white' }} size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="brouillon">Draft</MenuItem>
              <MenuItem value="programmée">Scheduled</MenuItem>
              <MenuItem value="envoyée">Sent</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 0, border: '1px solid #D9D9D9' }}>
        {renderContent()}
      </TableContainer>

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Supprimer la campagne</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer{' '}
            <strong>{selectedCampaign?.titre || 'cette campagne'}</strong> ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={duplicateDialog.open}
        onClose={() => setDuplicateDialog({ open: false, campaign: null, newTitle: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Réutiliser cette campagne</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Une copie de la campagne{' '}
            <strong>{duplicateDialog.campaign?.titre || ''}</strong> sera créée avec le statut "brouillon".
            Vous pourrez ensuite la modifier et l'envoyer.
          </Typography>
          <TextField
            label="Titre de la nouvelle campagne"
            value={duplicateDialog.newTitle}
            onChange={(e) => setDuplicateDialog(prev => ({ ...prev, newTitle: e.target.value }))}
            fullWidth
            required
            helperText="Le titre doit contenir au moins 3 caractères"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialog({ open: false, campaign: null, newTitle: '' })}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={confirmDuplicate}
            disabled={!duplicateDialog.newTitle || duplicateDialog.newTitle.trim().length < 3}
          >
            Dupliquer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewState.open}
        onClose={() => setPreviewState((prev) => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Aperçu: {previewState.title}
          {previewState.subject ? ` — ${previewState.subject}` : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {previewState.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={240}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                overflow: 'auto',
                bgcolor: '#f9f9f9',
                p: 2,
                borderRadius: 1,
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: previewState.html }}
                style={{ background: '#fff', padding: '12px', borderRadius: '8px' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewState((prev) => ({ ...prev, open: false }))}>
            Fermer
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const id = previewState.campaignId;
              setPreviewState((prev) => ({ ...prev, open: false }));
              if (id) handleEdit(id);
            }}
          >
            Modifier
          </Button>
        </DialogActions>
      </Dialog>

      <FollowUpWizard
        open={followUpDialog.open}
        campaign={followUpDialog.campaign}
        onClose={() => setFollowUpDialog({ open: false, campaign: null })}
        onSuccess={() => {
          dispatch(fetchCampaigns());
        }}
      />
    </Box>
  );
};

export default Campagnes;

