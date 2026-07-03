import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Switch, CircularProgress, 
  Alert, Tooltip as MuiTooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, IconButton,
  Divider, Chip
} from '@mui/material';
import {
  Cake as CakeIcon,
  Autorenew as AutorenewIcon,
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  FlashOn as FlashOnIcon,
  Label as LabelIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  AccessTime as AccessTimeIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import axios from '../api/axios';

const AutomationCard = ({ automation, onToggle, onDelete, onEdit }) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e) => {
    const newStatus = e.target.checked;
    setToggling(true);
    await onToggle(automation.id, newStatus);
    setToggling(false);
  };

  const getIcon = (type, config) => {
    if (type === 'birthday') return <CakeIcon sx={{ color: '#0a84d6', fontSize: 32 }} />;
    if (config?.trigger === 'scheduled') return <ScheduleIcon sx={{ color: '#f59e0b', fontSize: 32 }} />;
    if (config?.trigger === 'membership_expiring') return <TimerIcon sx={{ color: '#ef4444', fontSize: 32 }} />;
    return <AutorenewIcon sx={{ color: '#0a84d6', fontSize: 32 }} />;
  };

  const config = typeof automation.config === 'string' ? JSON.parse(automation.config) : automation.config;

  const getDescription = () => {
    if (automation.type === 'birthday') {
      return "Envoi automatique d'un email d'anniversaire chaque matin à 8h00 aux membres VIP.";
    }
    
    if (config?.trigger === 'contact_added') return 'Dès qu\'un nouveau contact est ajouté à l\'audience.';
    if (config?.trigger === 'tag_added') return `Dès que le tag '${config.condition}' est appliqué.`;
    if (config?.trigger === 'membership_expiring') return `Relance automatique ${config.days_before} jours avant l'expiration de l'abonnement.`;
    if (config?.trigger === 'scheduled') {
      const freq = config.recurrence === 'once' ? 'Une seule fois' : `Récurrent (${config.recurrence})`;
      return `Prévu le ${new Date(config.scheduled_date).toLocaleString()} - ${freq}`;
    }
    return "Automatisation personnalisée.";
  };

  return (
    <Card sx={{ 
      border: '1px solid',
      borderColor: automation.actif ? '#0a84d6' : '#bfc9cf',
      borderRadius: 3,
      transition: 'all 0.3s ease',
      boxShadow: automation.actif ? '0 8px 24px rgba(10, 132, 214, 0.12)' : 'none',
      position: 'relative',
      overflow: 'visible',
      bgcolor: automation.actif ? '#fff' : '#fcfdfe'
    }}>
      <Box sx={{ position: 'absolute', top: -12, right: 12, display: 'flex', gap: 1 }}>
        {automation.type === 'custom' && (
          <>
            <IconButton 
              size="small" 
              onClick={() => onEdit(automation)}
              sx={{ bgcolor: 'white', color: 'primary.main', border: '1.5px solid #0a84d6', '&:hover': { bgcolor: '#f0f7ff' }, boxShadow: 2 }}
            >
              <EditIcon fontSize="small" style={{ fontSize: '1rem' }} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => onDelete(automation.id)}
              sx={{ bgcolor: 'white', color: 'error.main', border: '1.5px solid #ef4444', '&:hover': { bgcolor: '#fff5f5' }, boxShadow: 2 }}
            >
              <DeleteIcon fontSize="small" style={{ fontSize: '1rem' }} />
            </IconButton>
          </>
        )}
      </Box>

      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: automation.actif ? 'rgba(10, 132, 214, 0.1)' : 'rgba(191, 201, 207, 0.1)' }}>
              {getIcon(automation.type, config)}
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{automation.nom}</Typography>
              <Chip 
                label={automation.actif ? "Activé" : "En pause"} 
                size="small" 
                color={automation.actif ? "primary" : "default"}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, mt: 0.5 }}
              />
            </Box>
          </Box>
          <Switch 
            checked={automation.actif} 
            onChange={handleToggle} 
            disabled={toggling}
            size="small"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, flexGrow: 1, fontSize: '0.85rem' }}>
          {getDescription()}
        </Typography>

        <Divider sx={{ my: 1.5, opacity: 0.6 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" display="block" color="text.disabled" sx={{ fontWeight: 600 }}>
              DERNIÈRE EXÉCUTION
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {automation.derniere_execution ? new Date(automation.derniere_execution).toLocaleDateString() : 'Jamais'}
            </Typography>
          </Box>
          {config?.recurrence && config.recurrence !== 'once' && (
            <Chip 
              icon={<AutorenewIcon style={{ fontSize: '0.9rem' }} />} 
              label={config.recurrence} 
              size="small" 
              variant="outlined"
              sx={{ borderStyle: 'dashed' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const Automations = () => {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Builder State
  const [openBuilder, setOpenBuilder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tags, setTags] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const [nom, setNom] = useState('');
  const [trigger, setTrigger] = useState('contact_added');
  const [condition, setCondition] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [audienceTag, setAudienceTag] = useState('');
  const [daysBefore, setDaysBefore] = useState(30);
  const [saving, setSaving] = useState(false);

  const fetchAutomations = async () => {
    try {
      const res = await axios.get('/automations');
      setAutomations(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load automations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [tRes, tempRes] = await Promise.all([
        axios.get('/contacts/tags'),
        axios.get('/templates')
      ]);
      setTags(tRes.data);
      setTemplates(tempRes.data);
    } catch(e) {
      console.error("Failed to load tags or templates");
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchDependencies();
  }, []);

  const handleToggle = async (id, actif) => {
    try {
      await axios.put(`/automations/${id}/toggle`, { actif });
      setAutomations(automations.map(a => a.id === id ? { ...a, actif } : a));
    } catch (err) {
      alert("Failed to toggle automation status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette automation ?")) return;
    try {
      await axios.delete(`/automations/${id}`);
      setAutomations(automations.filter(a => a.id !== id));
    } catch (err) {
      alert("Failed to delete automation.");
    }
  };

  const handleEdit = (auto) => {
    const c = typeof auto.config === 'string' ? JSON.parse(auto.config) : auto.config;
    setEditingId(auto.id);
    setNom(auto.nom);
    setTrigger(c.trigger || 'contact_added');
    setCondition(c.condition || '');
    setTemplateId(c.action_template_id || '');
    setQuickMessage(c.quick_message || '');
    setScheduledDate(c.scheduled_date || '');
    setRecurrence(c.recurrence || 'once');
    setAudienceTag(c.audience_tag || '');
    setDaysBefore(c.days_before || 30);
    setOpenBuilder(true);
  };

  const handleSaveCustom = async () => {
    if (!nom || (!templateId && !quickMessage)) {
      alert("Veuillez donner un nom et choisir un template ou écrire un message.");
      return;
    }

    if (trigger === 'scheduled' && (!scheduledDate || !audienceTag)) {
      alert("Pour une automation programmée, la date et l'audience (Tag) sont requis.");
      return;
    }

    setSaving(true);
    try {
      const config = {
        trigger,
        condition: trigger === 'tag_added' ? condition : null,
        action_template_id: templateId || null,
        quick_message: quickMessage || null,
        scheduled_date: trigger === 'scheduled' ? scheduledDate : null,
        recurrence: trigger === 'scheduled' ? recurrence : 'once',
        audience_tag: trigger === 'scheduled' ? audienceTag : null,
        days_before: trigger === 'membership_expiring' ? daysBefore : null
      };

      if (editingId) {
        const res = await axios.put(`/automations/${editingId}`, { nom, config });
        setAutomations(automations.map(a => a.id === editingId ? res.data : a));
      } else {
        const res = await axios.post('/automations', { nom, config });
        setAutomations([...automations, res.data]);
      }
      
      handleCloseBuilder();
    } catch(err) {
      alert(err.response?.data?.message || 'Failed to save automation.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseBuilder = () => {
    setOpenBuilder(false);
    setEditingId(null);
    setNom(''); setTrigger('contact_added'); setCondition(''); setTemplateId('');
    setQuickMessage(''); setScheduledDate(''); setRecurrence('once'); setAudienceTag('');
    setDaysBefore(30);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#204170' }}>
            Marketing Automation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gérez vos parcours clients et vos messages programmés en toute simplicité.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpenBuilder(true)}
          sx={{ px: 4, py: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(32, 65, 112, 0.25)' }}
        >
          Créer un parcours
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : automations.length === 0 ? (
        <Box textAlign="center" py={10} sx={{ border: '2px dashed #e0e6eb', borderRadius: 4, bgcolor: '#fbfcfd' }}>
          <AutorenewIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">Aucune automatisation configurée.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => setOpenBuilder(true)}>Démarrer maintenant</Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {automations.map((automation) => (
            <Grid item xs={12} sm={6} md={4} key={automation.id}>
              <AutomationCard automation={automation} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openBuilder} onClose={handleCloseBuilder} maxWidth="sm" fullWidth scroll="body">
        <DialogTitle sx={{ fontWeight: 800, pb: 1, color: '#204170' }}>
          {editingId ? 'Modifier l\'Automation' : 'Nouveau Parcours Client'}
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <TextField 
              label="Nom du Parcours" 
              placeholder="ex: Email de Bienvenue"
              fullWidth 
              variant="outlined"
              size="small"
              value={nom} 
              onChange={e => setNom(e.target.value)} 
            />

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#64748b', fontWeight: 700 }}>
                 <FlashOnIcon fontSize="small" /> ÉVÉNEMENT DÉCLENCHEUR
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={trigger} onChange={e => setTrigger(e.target.value)}>
                  <MenuItem value="contact_added">Dès qu'un nouveau contact est ajouté</MenuItem>
                  <MenuItem value="tag_added">Dès qu'un Tag spécifique est appliqué</MenuItem>
                  <MenuItem value="membership_expiring">Relance avant FIN d'abonnement (Abonnés)</MenuItem>
                  <MenuItem value="scheduled">À une date/heure précise (Calendrier)</MenuItem>
                </Select>
              </FormControl>
              
              {trigger === 'tag_added' && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Choisir le Tag cible</InputLabel>
                  <Select value={condition} onChange={e => setCondition(e.target.value)} label="Choisir le Tag cible">
                    {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {trigger === 'membership_expiring' && (
                <TextField
                  label="Nombre de jours avant expiration"
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mt: 2 }}
                  value={daysBefore}
                  onChange={e => setDaysBefore(e.target.value)}
                  helperText="L'email sera envoyé X jours exactement avant la date de fin."
                />
              )}

              {trigger === 'scheduled' && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Date et Heure de début"
                    type="datetime-local"
                    fullWidth
                    size="small"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Récurrence</InputLabel>
                    <Select value={recurrence} onChange={e => setRecurrence(e.target.value)} label="Récurrence">
                      <MenuItem value="once">Une seule fois</MenuItem>
                      <MenuItem value="daily">Chaque jour</MenuItem>
                      <MenuItem value="weekly">Chaque semaine</MenuItem>
                      <MenuItem value="monthly">Chaque mois</MenuItem>
                      <MenuItem value="yearly">Chaque année (Anniversaire de date)</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Envoyer à l'audience (Tag)</InputLabel>
                    <Select value={audienceTag} onChange={e => setAudienceTag(e.target.value)} label="Envoyer à l'audience (Tag)">
                      {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#64748b', fontWeight: 700 }}>
                 <EmailIcon fontSize="small" /> ACTION À EFFECTUER
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Utiliser un modèle d'email</InputLabel>
                <Select 
                  value={templateId} 
                  onChange={e => { setTemplateId(e.target.value); if(e.target.value) setQuickMessage(''); }}
                  label="Utiliser un modèle d'email"
                >
                  <MenuItem value=""><em>-- Pas de modèle (Utiliser Message Rapide) --</em></MenuItem>
                  {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>)}
                </Select>
              </FormControl>

              {!templateId && (
                <TextField 
                  label="Message Rapide"
                  placeholder="Écrivez votre message ici..."
                  multiline
                  rows={4}
                  fullWidth
                  sx={{ mt: 2 }}
                  value={quickMessage}
                  onChange={e => setQuickMessage(e.target.value)}
                  helperText="Le message sera envoyé dans le cadre officiel du club."
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={handleCloseBuilder} color="inherit" sx={{ fontWeight: 600 }}>Annuler</Button>
          <Button onClick={handleSaveCustom} variant="contained" disabled={saving} sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}>
            {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Activer l\'Automation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Automations;
