import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, CardActions,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Chip, Tabs, Tab, CircularProgress, Divider, Paper,
  Tooltip, InputAdornment, Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Public as PublicIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import axios from '../api/axios';
import EmailEditor from '../components/EmailEditor';
import { PRO_TEMPLATES } from '../data/proTemplates';

const Templates = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  
  // Editor State
  const [openEditor, setOpenEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ nom: '', contenu_html: '' });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/templates');
      setItems(res.data);
    } catch (err) {
      setError("Impossible de charger les modèles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenEditor = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setForm({ nom: template.nom, contenu_html: template.contenu_html });
    } else {
      setEditingTemplate(null);
      setForm({ nom: '', contenu_html: '<div style="padding: 20px;"><h1>Nouveau Modèle</h1><p>Commencez à éditer...</p></div>' });
    }
    setOpenEditor(true);
  };

  const handleSave = async () => {
    if (!form.nom) return alert("Le nom est requis.");
    setSaving(true);
    try {
      if (editingTemplate && editingTemplate.id) {
        // Update
        const res = await axios.put(`/templates/${editingTemplate.id}`, form);
        setItems(items.map(item => item.id === editingTemplate.id ? res.data : item));
      } else {
        // Create
        const res = await axios.post('/templates', form);
        setItems([res.data, ...items]);
      }
      setOpenEditor(false);
    } catch (err) {
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce modèle ?")) return;
    try {
      await axios.delete(`/templates/${id}`);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleImport = async (proTemplate) => {
    try {
      const payload = {
        nom: proTemplate.nom,
        contenu_html: proTemplate.contenu_html
      };
      const res = await axios.post('/templates', payload);
      setItems([res.data, ...items]);
      setTab(0);
      alert(`${proTemplate.nom} a été ajouté à vos modèles !`);
    } catch (err) {
      alert("Erreur lors de l'import.");
    }
  };

  const filteredItems = items.filter(t => t.nom.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ p: 4, maxWidth: 1400, margin: '0 auto', bgcolor: '#fbfcfd', minHeight: '100vh' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#204170', mb: 1 }}>Bibliothèque de Templates</Typography>
          <Typography variant="body1" color="text.secondary">Créez et gérez vos propres modèles officiels pour vos campagnes.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenEditor()}
          sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Nouveau Modèle
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: '#f1f5f9', mb: 4, p: 0.5 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ minHeight: 48 }}>
          <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} iconPosition="start" label={`Mes Modèles (${items.length})`} sx={{ fontWeight: 700, px: 3 }} />
          <Tab icon={<PublicIcon sx={{ mr: 1 }} />} iconPosition="start" label="Bibliothèque Premium" sx={{ fontWeight: 700, px: 3 }} />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
          <Box mb={4}>
            <TextField 
              placeholder="Rechercher un modèle..."
              fullWidth
              size="medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ bgcolor: 'white', borderRadius: 3, '& fieldset': { borderRadius: 3 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="disabled" /></InputAdornment> }}
            />
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
          ) : filteredItems.length === 0 ? (
            <Box textAlign="center" py={10} border="2px dashed #cbd5e1" borderRadius={4}>
              <Typography color="text.secondary">Aucun modèle trouvé.</Typography>
              <Button sx={{ mt: 2 }} onClick={() => setTab(1)}>Explorer la bibliothèque premium</Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredItems.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card sx={{ borderRadius: 4, transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                    <Box sx={{ height: 200, bgcolor: '#f8fafc', overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => setPreview(item)}>
                      <Box sx={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '285%', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: item.contenu_html }} />
                      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }} />
                    </Box>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{item.nom}</Typography>
                      <Typography variant="caption" color="text.secondary">Mis à jour le {new Date(item.date_creation || Date.now()).toLocaleDateString()}</Typography>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                      <Box>
                         <Tooltip title="Éditer"><IconButton size="small" onClick={() => handleOpenEditor(item)} color="primary"><EditIcon /></IconButton></Tooltip>
                         <Tooltip title="Supprimer"><IconButton size="small" onClick={() => handleDelete(item.id)} color="error"><DeleteIcon /></IconButton></Tooltip>
                      </Box>
                      <Button variant="outlined" size="small" onClick={() => setPreview(item)}>Aperçu</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : (
        <Grid container spacing={3}>
          {PRO_TEMPLATES.map((pt) => (
            <Grid item xs={12} sm={6} md={4} key={pt.id}>
              <Card sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia component="img" height="180" image={pt.thumbnail} sx={{ bgcolor: 'white' }} />
                <CardContent sx={{ flex: 1 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{pt.nom}</Typography>
                    <Chip label={pt.categorie} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{pt.description}</Typography>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 2, bgcolor: '#fbfcfd' }}>
                  <Button fullWidth variant="contained" startIcon={<CheckCircleIcon />} onClick={() => handleImport(pt)}>Installer ce modèle</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {preview?.nom}
          <IconButton onClick={() => setPreview(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: 600 }}>
          <iframe title="preview" style={{ width: '100%', height: '100%', border: 'none' }} srcDoc={preview?.contenu_html} />
        </DialogContent>
        <DialogActions>
           <Button onClick={() => setPreview(null)}>Fermer</Button>
           <Button variant="contained" onClick={() => { handleOpenEditor(preview); setPreview(null); }}>Utiliser comme base</Button>
        </DialogActions>
      </Dialog>

      {/* Full Screen Editor Dialog */}
      <Dialog open={openEditor} onClose={() => setOpenEditor(false)} fullScreen>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#204170', color: 'white' }}>
            <Box display="flex" alignItems="center" gap={3}>
              <IconButton onClick={() => setOpenEditor(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
              <Typography variant="h6" fontWeight={700}>{editingTemplate ? 'Modification du Modèle' : 'Nouveau Modèle'}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <TextField 
                size="small" 
                placeholder="Nom du modèle" 
                value={form.nom} 
                onChange={(e) => setForm(f => ({ ...f, nom: e.target.value }))}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  borderRadius: 1,
                  input: { color: 'white', fontWeight: 600 },
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' } }
                }} 
              />
              <Button variant="contained" color="success" onClick={handleSave} disabled={saving} sx={{ fontWeight: 700 }}>
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <EmailEditor 
              value={form.contenu_html} 
              onChange={(newHtml) => setForm(f => ({ ...f, contenu_html: newHtml }))} 
            />
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Templates;