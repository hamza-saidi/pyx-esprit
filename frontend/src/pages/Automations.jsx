import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Switch, CircularProgress,
  Alert, Tooltip as MuiTooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, IconButton,
  Divider, Chip, TablePagination, InputAdornment,
} from '@mui/material';
import {
  Cake as CakeIcon,
  Autorenew as AutorenewIcon,
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  FlashOn as FlashOnIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Timer as TimerIcon,
  ArrowForward as ArrowForwardIcon,
  PersonAdd as PersonAddIcon,
  Loyalty as LoyaltyIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import axios from '../api/axios';
import { useToast } from '../context/ToastContext';

// ── Séquence de renouvellement recommandée ─────────────────────────────────
const RENEWAL_SEQUENCE_STEPS = [
  {
    key: 'j-30',
    label: 'J-30',
    title: 'Rappel anticipé',
    desc: "Premier signal avant que l'adhésion expire.",
    days_before: 30,
    color: '#0a84d6',
    bg: '#e0f2fe',
    quickMessage: "Bonjour {{prenom}},\n\nVotre adhésion expire dans 30 jours. Pensez à la renouveler pour continuer à profiter de nos services sans interruption.\n\nÀ bientôt au club !",
  },
  {
    key: 'j-7',
    label: 'J-7',
    title: 'Rappel urgent',
    desc: 'Dernière semaine — appel à l\'action fort.',
    days_before: 7,
    color: '#d97706',
    bg: '#fef3c7',
    quickMessage: "Bonjour {{prenom}},\n\nPlus que 7 jours ! Votre adhésion expire le {{date_expiration}}. Renouvelez maintenant pour ne rien manquer.",
  },
  {
    key: 'j+1',
    label: 'J+1',
    title: 'Reconquête',
    desc: '1 jour après expiration — offre de retour.',
    days_before: -1,
    color: '#dc2626',
    bg: '#fee2e2',
    quickMessage: "Bonjour {{prenom}},\n\nVotre adhésion a expiré hier. Il n'est pas trop tard — rejoignez-nous à nouveau avec une offre de retour spéciale.",
  },
];

// ── Flow templates ─────────────────────────────────────────────────────────
const FLOW_TEMPLATES = [
  {
    id: 'birthday',
    label: 'Anniversaire',
    icon: <CakeIcon sx={{ fontSize: 20, color: '#ec4899' }} />,
    color: '#fdf2f8',
    border: '#f9a8d4',
    preset: { nom: 'Email Anniversaire', trigger: 'birthday', quickMessage: 'Joyeux anniversaire ! Profitez de notre offre spéciale pour votre journée.' },
  },
  {
    id: 'welcome',
    label: 'Bienvenue',
    icon: <PersonAddIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />,
    color: '#f5f3ff',
    border: '#c4b5fd',
    preset: { nom: 'Email de Bienvenue', trigger: 'contact_added', recurrence: 'once', quickMessage: 'Bienvenue dans notre club ! Nous sommes ravis de vous accueillir.' },
  },
  {
    id: 'expiry',
    label: 'Renouvellement',
    icon: <LoyaltyIcon sx={{ fontSize: 20, color: '#f59e0b' }} />,
    color: '#fffbeb',
    border: '#fde68a',
    preset: { nom: 'Rappel Renouvellement', trigger: 'membership_expiring', daysBefore: 30, quickMessage: 'Votre abonnement expire bientôt. Renouvelez dès maintenant pour continuer à profiter de nos services.' },
  },
];

// ── Calcule la prochaine exécution d'une automation scheduled ──────────────
function getNextRun(config) {
  if (!config) return null;

  if (config.trigger === 'birthday')
    return 'Quotidien · selon les anniversaires';
  if (config.trigger === 'contact_added')
    return "Lors du prochain nouveau contact";
  if (config.trigger === 'tag_added')
    return `Application du tag "${config.condition}"`;
  if (config.trigger === 'membership_expiring') {
    const db = Number(config.days_before);
    if (db < 0) return `${Math.abs(db)} j. après chaque expiration`;
    return `${db} j. avant chaque expiration`;
  }
  if (config.trigger === 'payment_pending')
    return 'Quotidien · membres en attente de paiement';

  if (config.trigger === 'scheduled') {
    const base = new Date(config.scheduled_date);
    if (isNaN(base.getTime())) return 'Date non définie';

    if (config.recurrence === 'once') {
      return base > new Date()
        ? base.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
        : 'Déjà exécuté';
    }

    const now = new Date();
    let next = new Date(base);
    let safetyCount = 0;
    while (next <= now && safetyCount++ < 10000) {
      switch (config.recurrence) {
        case 'daily':   next.setDate(next.getDate() + 1); break;
        case 'weekly':  next.setDate(next.getDate() + 7); break;
        case 'monthly': next.setMonth(next.getMonth() + 1); break;
        case 'yearly':  next.setFullYear(next.getFullYear() + 1); break;
        default: return null;
      }
    }
    return next.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  return null;
}

// ── FlowNode ───────────────────────────────────────────────────────────────
const FlowNode = ({ icon, label, color, bgColor }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: bgColor, border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Box>
    <Typography variant="caption" sx={{ fontSize: 10, color: '#64748b', fontWeight: 600, textAlign: 'center', maxWidth: 70 }}>
      {label}
    </Typography>
  </Box>
);

// ── RenewalSequenceSection ─────────────────────────────────────────────────
const RenewalSequenceSection = ({ automations, onCreateStep, onEditStep }) => {
  const getStepStatus = (step) => {
    const found = automations.find((a) => {
      if (a.type !== 'custom') return false;
      const c = typeof a.config === 'string' ? JSON.parse(a.config) : a.config;
      return c?.trigger === 'membership_expiring' && Number(c?.days_before) === step.days_before;
    });
    if (!found) return { state: 'empty', automation: null };
    return { state: found.actif ? 'active' : 'paused', automation: found };
  };

  return (
    <Box sx={{ mb: 5, p: 3, border: '1px solid #bfc9cf', borderRadius: 0, bgcolor: 'white' }}>
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <TimerIcon sx={{ color: '#d97706', fontSize: 22 }} />
        <Box>
          <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1 }}>
            Séquence de renouvellement
          </Typography>
          <Typography variant="caption" color="text.secondary">
            3 emails déclenchés automatiquement autour de la date d&apos;expiration de chaque membre.
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="stretch" gap={0} sx={{ overflowX: 'auto' }}>
        {RENEWAL_SEQUENCE_STEPS.map((step, idx) => {
          const { state, automation } = getStepStatus(step);
          return (
            <React.Fragment key={step.key}>
              {idx > 0 && (
                <Box display="flex" alignItems="center" sx={{ px: 1, flexShrink: 0 }}>
                  <ArrowForwardIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                </Box>
              )}
              <Box sx={{
                flex: 1,
                minWidth: 180,
                border: `1px solid ${state === 'active' ? step.color : '#e2e8f0'}`,
                borderTop: `3px solid ${step.color}`,
                p: 2,
                bgcolor: state === 'active' ? step.bg : '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 800, color: step.color, fontSize: 13, letterSpacing: 0.5 }}>
                    {step.label}
                  </Typography>
                  {state === 'active' && (
                    <Chip label="Actif" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: step.color, color: 'white' }} />
                  )}
                  {state === 'paused' && (
                    <Chip label="En pause" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
                  )}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {step.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {step.desc}
                </Typography>
                {state === 'empty' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onCreateStep(step)}
                    sx={{ mt: 1, borderRadius: 0, borderColor: step.color, color: step.color, fontWeight: 700, fontSize: 11 }}
                  >
                    Configurer
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onEditStep(automation)}
                    sx={{ mt: 1, borderRadius: 0, color: '#475569', fontWeight: 600, fontSize: 11 }}
                  >
                    Modifier
                  </Button>
                )}
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
};

// ── AutomationCard ─────────────────────────────────────────────────────────
const AutomationCard = ({ automation, onToggle, onDelete, onEdit }) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e) => {
    const newStatus = e.target.checked;
    setToggling(true);
    await onToggle(automation.id, newStatus);
    setToggling(false);
  };

  const config = typeof automation.config === 'string'
    ? JSON.parse(automation.config)
    : automation.config;

  const getDescription = () => {
    if (config?.trigger === 'birthday')
      return "Envoyé automatiquement le jour de l'anniversaire de chaque membre.";
    if (config?.trigger === 'contact_added') {
      const filter = config.audience_tag_filter;
      return filter
        ? `Dès qu'un nouveau contact avec le tag "${filter}" est ajouté.`
        : "Dès qu'un nouveau contact est ajouté à l'audience.";
    }
    if (config?.trigger === 'tag_added')
      return `Dès que le tag '${config.condition}' est appliqué.`;
    if (config?.trigger === 'membership_expiring') {
      const db = Number(config.days_before);
      const filter = config.audience_tag_filter;
      const timing = db < 0
        ? `${Math.abs(db)} j. après expiration`
        : `${db} j. avant expiration`;
      return filter
        ? `Relance ${timing} — tag "${filter}".`
        : `Relance automatique ${timing} de l'abonnement.`;
    }
    if (config?.trigger === 'payment_pending')
      return "Relance automatique quotidienne des membres avec un paiement en attente.";
    if (config?.trigger === 'scheduled') {
      const d = new Date(config.scheduled_date);
      const dateStr = isNaN(d.getTime())
        ? 'Date non définie'
        : d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
      const freq = config.recurrence === 'once' ? 'Une seule fois' : `Récurrent · ${config.recurrence}`;
      return `Prévu le ${dateStr} · ${freq}`;
    }
    return 'Automatisation personnalisée.';
  };

  const nextRun = getNextRun(config);

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: automation.actif ? '#0a84d6' : '#bfc9cf',
      borderRadius: 3,
      transition: 'all 0.3s ease',
      boxShadow: automation.actif ? '0 8px 24px rgba(10,132,214,0.12)' : 'none',
      position: 'relative',
      overflow: 'visible',
      bgcolor: automation.actif ? '#fff' : '#fcfdfe',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Action buttons */}
      <Box sx={{ position: 'absolute', top: -12, right: 12, display: 'flex', gap: 1, zIndex: 1 }}>
        <MuiTooltip title="Modifier">
          <IconButton
            size="small"
            onClick={() => onEdit(automation)}
            sx={{ bgcolor: 'white', color: 'primary.main', border: '1.5px solid #0a84d6', '&:hover': { bgcolor: '#f0f7ff' }, boxShadow: 2 }}
          >
            <EditIcon fontSize="small" style={{ fontSize: '1rem' }} />
          </IconButton>
        </MuiTooltip>
        <MuiTooltip title="Supprimer">
          <IconButton
            size="small"
            onClick={() => onDelete(automation.id)}
            sx={{ bgcolor: 'white', color: 'error.main', border: '1.5px solid #ef4444', '&:hover': { bgcolor: '#fff5f5' }, boxShadow: 2 }}
          >
            <DeleteIcon fontSize="small" style={{ fontSize: '1rem' }} />
          </IconButton>
        </MuiTooltip>
      </Box>

      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: automation.actif ? 'rgba(10,132,214,0.1)' : 'rgba(191,201,207,0.1)', flexShrink: 0 }}>
              {automation.type === 'birthday'
                ? <CakeIcon sx={{ color: '#0a84d6', fontSize: 32 }} />
                : config?.trigger === 'scheduled'
                  ? <ScheduleIcon sx={{ color: '#f59e0b', fontSize: 32 }} />
                  : config?.trigger === 'membership_expiring'
                    ? <TimerIcon sx={{ color: '#ef4444', fontSize: 32 }} />
                    : <AutorenewIcon sx={{ color: '#0a84d6', fontSize: 32 }} />}
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {automation.nom}
              </Typography>
              <Chip
                label={automation.actif ? 'Activé' : 'En pause'}
                size="small"
                color={automation.actif ? 'primary' : 'default'}
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, mt: 0.5 }}
              />
            </Box>
          </Box>
          <Switch checked={automation.actif} onChange={handleToggle} disabled={toggling} size="small" />
        </Box>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1, fontSize: '0.85rem', lineHeight: 1.55 }}>
          {getDescription()}
        </Typography>

        <Divider sx={{ my: 1.5, opacity: 0.6 }} />

        {/* Exécution info */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="caption" display="block" color="text.disabled" sx={{ fontWeight: 600 }}>
              DERNIÈRE EXÉCUTION
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {automation.derniere_execution
                ? new Date(automation.derniere_execution).toLocaleDateString('fr-FR')
                : 'Jamais'}
            </Typography>
          </Box>
          {nextRun && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" display="block" color="text.disabled" sx={{ fontWeight: 600 }}>
                PROCHAINE
              </Typography>
              <Box display="flex" alignItems="center" gap={0.4} justifyContent="flex-end">
                <CalendarIcon sx={{ fontSize: 10, color: automation.actif ? '#0a84d6' : '#94a3b8' }} />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: automation.actif ? '#0a84d6' : '#94a3b8', fontSize: '0.7rem' }}
                >
                  {nextRun}
                </Typography>
              </Box>
            </Box>
          )}
          {config?.recurrence && config.recurrence !== 'once' && (
            <Chip
              icon={<AutorenewIcon style={{ fontSize: '0.9rem' }} />}
              label={config.recurrence}
              size="small"
              variant="outlined"
              sx={{ borderStyle: 'dashed', alignSelf: 'center' }}
            />
          )}
        </Box>

        {/* Stats — always rendered for uniform height */}
        <Box display="flex" gap={3} mt={1.5} minHeight={38}>
          <Box>
            <Typography variant="caption" display="block" color="text.disabled" sx={{ fontWeight: 600 }}>ENVOIS</Typography>
            <Typography variant="caption" fontWeight={700} color={automation.nb_emails_envoyes > 0 ? 'text.primary' : 'text.disabled'}>
              {automation.nb_emails_envoyes > 0 ? automation.nb_emails_envoyes : '–'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" display="block" color="text.disabled" sx={{ fontWeight: 600 }}>OUVERTURE</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ color: automation.taux_ouverture > 0 ? '#16a34a' : 'text.disabled' }}>
              {automation.taux_ouverture > 0 ? `${automation.taux_ouverture}%` : '–'}
            </Typography>
          </Box>
        </Box>

      </CardContent>
    </Card>
  );
};

// ── Page principale ────────────────────────────────────────────────────────
const Automations = () => {
  const toast = useToast();
  const location = useLocation();

  const [automations, setAutomations]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(0);
  const [rowsPerPage, setRowsPerPage]   = useState(9);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  // Builder state
  const [openBuilder, setOpenBuilder]         = useState(false);
  const [editingId, setEditingId]             = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tags, setTags]                       = useState([]);
  const [templates, setTemplates]             = useState([]);
  const [nom, setNom]                         = useState('');
  const [trigger, setTrigger]                 = useState('contact_added');
  const [condition, setCondition]             = useState('');
  const [templateId, setTemplateId]           = useState('');
  const [quickMessage, setQuickMessage]       = useState('');
  const [scheduledDate, setScheduledDate]     = useState('');
  const [recurrence, setRecurrence]           = useState('once');
  const [audienceTag, setAudienceTag]         = useState('');
  const [audienceTagFilter, setAudienceTagFilter] = useState('');
  const [daysBefore, setDaysBefore]           = useState(30);
  const [saving, setSaving]                   = useState(false);

  // ── Filtered list — exclut les automations système (gérées automatiquement) ──
  const filteredAutomations = automations
    .filter(a => a.type === 'custom')
    .filter(a => a.nom.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchAutomations = async () => {
    try {
      const res = await axios.get('/automations');
      setAutomations(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les automations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [tRes, tempRes] = await Promise.all([
        axios.get('/contacts/tags'),
        axios.get('/templates'),
      ]);
      setTags(tRes.data);
      setTemplates(tempRes.data);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('create') === '1') {
      setOpenBuilder(true);
    }
  }, [location.search]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = async (id, actif) => {
    try {
      await axios.put(`/automations/${id}/toggle`, { actif });
      setAutomations(automations.map(a => a.id === id ? { ...a, actif } : a));
      toast.success(actif ? 'Automation activée.' : 'Automation mise en pause.');
    } catch {
      toast.error("Impossible de modifier le statut de l'automation.");
    }
  };

  const handleDelete = (id) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteDialog.id;
    setDeleteDialog({ open: false, id: null });
    try {
      await axios.delete(`/automations/${id}`);
      setAutomations(automations.filter(a => a.id !== id));
      toast.success('Automation supprimée.');
    } catch {
      toast.error("Impossible de supprimer l'automation.");
    }
  };

  const handleEdit = (auto) => {
    const c = typeof auto.config === 'string' ? JSON.parse(auto.config) : auto.config;
    setEditingId(auto.id);
    setNom(auto.nom);
    setTrigger(c.trigger || auto.type || 'contact_added');
    setCondition(c.condition || '');
    setTemplateId(c.action_template_id || '');
    setQuickMessage(c.quick_message || '');
    setScheduledDate(c.scheduled_date || '');
    setRecurrence(c.recurrence || 'once');
    setAudienceTag(c.audience_tag || '');
    setAudienceTagFilter(c.audience_tag_filter || c.tagFilter || '');
    setDaysBefore(c.days_before || 30);
    setOpenBuilder(true);
  };

  const handleSaveCustom = async () => {
    if (!nom || (!templateId && !quickMessage)) {
      toast.warning('Veuillez donner un nom et choisir un template ou écrire un message.');
      return;
    }

    if (trigger === 'scheduled') {
      if (!scheduledDate || !audienceTag) {
        toast.warning("Pour une automation programmée, la date et l'audience (Tag) sont requis.");
        return;
      }
      const scheduledMs = new Date(scheduledDate).getTime();
      if (isNaN(scheduledMs) || scheduledMs <= Date.now()) {
        toast.warning('La date de déclenchement doit être dans le futur.');
        return;
      }
    }

    setSaving(true);
    try {
      const config = {
        trigger,
        condition:            trigger === 'tag_added' ? condition : null,
        action_template_id:   templateId || null,
        quick_message:        quickMessage || null,
        scheduled_date:       trigger === 'scheduled' ? scheduledDate : null,
        recurrence:           trigger === 'scheduled' ? recurrence : 'once',
        audience_tag:         trigger === 'scheduled' ? audienceTag : null,
        audience_tag_filter:  ['contact_added', 'membership_expiring'].includes(trigger)
                                ? (audienceTagFilter || null)
                                : null,
        tagFilter:            trigger === 'birthday' ? (audienceTagFilter || 'Membre VIP') : undefined,
        days_before:          trigger === 'membership_expiring' ? daysBefore : null,
      };

      if (editingId) {
        const res = await axios.put(`/automations/${editingId}`, { nom, config });
        setAutomations(automations.map(a => a.id === editingId ? res.data : a));
        toast.success('Automation mise à jour.');
      } else {
        const res = await axios.post('/automations', { nom, config });
        setAutomations([...automations, res.data]);
        toast.success('Automation créée et activée.');
      }

      handleCloseBuilder();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'automation.");
    } finally {
      setSaving(false);
    }
  };

  const openBuilderWithPreset = (step) => {
    setEditingId(null);
    setSelectedTemplate(null);
    setNom(step.title);
    setTrigger('membership_expiring');
    setDaysBefore(step.days_before);
    setQuickMessage(step.quickMessage);
    setTemplateId('');
    setCondition('');
    setScheduledDate('');
    setRecurrence('once');
    setAudienceTag('');
    setAudienceTagFilter('');
    setOpenBuilder(true);
  };

  const handleCloseBuilder = () => {
    setOpenBuilder(false);
    setEditingId(null);
    setSelectedTemplate(null);
    setNom(''); setTrigger('contact_added'); setCondition(''); setTemplateId('');
    setQuickMessage(''); setScheduledDate(''); setRecurrence('once');
    setAudienceTag(''); setAudienceTagFilter(''); setDaysBefore(30);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Page header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
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
          sx={{ px: 4, py: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(32,65,112,0.25)' }}
        >
          Nouvelle automation
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Renewal sequence section */}
      {!loading && (
        <RenewalSequenceSection
          automations={automations}
          onCreateStep={openBuilderWithPreset}
          onEditStep={handleEdit}
        />
      )}

      {/* Search bar */}
      {!loading && automations.length > 0 && (
        <Box mb={3}>
          <TextField
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Rechercher une automation…"
            size="small"
            sx={{ width: { xs: '100%', sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />
          {searchQuery && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {filteredAutomations.length} résultat{filteredAutomations.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : filteredAutomations.length === 0 ? (
        <Box textAlign="center" py={10} sx={{ border: '2px dashed #e0e6eb', borderRadius: 4, bgcolor: '#fbfcfd' }}>
          <AutorenewIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">
            {searchQuery ? `Aucune automation correspondant à "${searchQuery}".` : 'Aucune automatisation configurée.'}
          </Typography>
          {!searchQuery && (
            <Button sx={{ mt: 2 }} onClick={() => setOpenBuilder(true)}>Démarrer maintenant</Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3} alignItems="stretch">
            {filteredAutomations
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((automation) => (
                <Grid item xs={12} sm={6} md={4} key={automation.id} sx={{ display: 'flex' }}>
                  <AutomationCard
                    automation={automation}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                </Grid>
              ))}
          </Grid>
          {filteredAutomations.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={filteredAutomations.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[6, 9, 18, 36]}
              labelRowsPerPage="Par page :"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              sx={{ mt: 2, borderTop: '1px solid #e5e7eb' }}
            />
          )}
        </>
      )}

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626', pb: 1 }}>
          Supprimer l'automation
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={14}>
            Cette action est irréversible. L'automation et toute sa configuration seront définitivement supprimées.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })} color="inherit" sx={{ fontWeight: 600 }}>
            Annuler
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error" sx={{ fontWeight: 700, px: 3 }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Builder dialog ───────────────────────────────────────────────── */}
      <Dialog open={openBuilder} onClose={handleCloseBuilder} maxWidth="sm" fullWidth scroll="body">
        <DialogTitle sx={{ fontWeight: 800, pb: 1, color: '#204170' }}>
          {editingId ? "Modifier l'automation" : 'Nouvelle automation'}
        </DialogTitle>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>

            {/* Quick-start templates */}
            {!editingId && (
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 1.25 }}>
                  DÉMARRAGE RAPIDE
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {FLOW_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTemplate === tpl.id;
                    return (
                      <Box
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedTemplate(tpl.id);
                          setNom(tpl.preset.nom);
                          setTrigger(tpl.preset.trigger);
                          if (tpl.preset.recurrence) setRecurrence(tpl.preset.recurrence);
                          if (tpl.preset.daysBefore) setDaysBefore(tpl.preset.daysBefore);
                          if (tpl.preset.quickMessage) setQuickMessage(tpl.preset.quickMessage);
                          setTemplateId('');
                          setAudienceTagFilter('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          px: 1.5, py: 0.875,
                          borderRadius: 2,
                          border: `2px solid ${tpl.border}`,
                          bgcolor: isSelected ? tpl.border : tpl.color,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? `0 2px 8px ${tpl.border}99` : 'none',
                          transform: isSelected ? 'translateY(-1px)' : 'none',
                          '&:hover': { bgcolor: tpl.border, transform: 'translateY(-1px)', boxShadow: `0 2px 8px ${tpl.border}66` },
                          outline: 'none',
                          '&:focus-visible': { outline: `2px solid ${tpl.border}`, outlineOffset: 2 },
                        }}
                      >
                        {tpl.icon}
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 12 }}>
                          {tpl.label}
                        </Typography>
                        {isSelected && <CheckCircleIcon sx={{ fontSize: 14, color: '#059669', ml: 0.25 }} />}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Name */}
            <TextField
              label="Nom de l'automation"
              placeholder="ex : Email de Bienvenue"
              fullWidth
              variant="outlined"
              size="small"
              value={nom}
              onChange={e => setNom(e.target.value)}
            />

            {/* Trigger section */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#64748b', fontWeight: 700 }}>
                <FlashOnIcon fontSize="small" /> ÉVÉNEMENT DÉCLENCHEUR
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={trigger} onChange={e => { setTrigger(e.target.value); setAudienceTagFilter(''); }}>
                  <MenuItem value="birthday">Le jour de l'anniversaire de chaque membre</MenuItem>
                  <MenuItem value="contact_added">Dès qu'un nouveau contact est ajouté</MenuItem>
                  <MenuItem value="tag_added">Dès qu'un Tag spécifique est appliqué</MenuItem>
                  <MenuItem value="membership_expiring">Relance avant fin d'abonnement</MenuItem>
                  <MenuItem value="payment_pending">Relance paiement en attente</MenuItem>
                  <MenuItem value="scheduled">À une date/heure précise</MenuItem>
                </Select>
              </FormControl>

              {/* birthday — info bloc + tag ciblé configurable */}
              {trigger === 'birthday' && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#fdf2f8', border: '1px solid #f9a8d4', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: '#9d174d', fontSize: 12, lineHeight: 1.6 }}>
                      <strong>Comment ça fonctionne :</strong> chaque matin, le système vérifie quels membres fêtent leur anniversaire aujourd'hui et leur envoie automatiquement l'email configuré ci-dessous.
                    </Typography>
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel>Étiquette ciblée</InputLabel>
                    <Select
                      value={audienceTagFilter}
                      onChange={e => setAudienceTagFilter(e.target.value)}
                      label="Étiquette ciblée"
                    >
                      {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                      Seuls les contacts portant cette étiquette reçoivent l'email d'anniversaire.
                    </Typography>
                  </FormControl>
                </Box>
              )}

              {/* contact_added — optional tag filter */}
              {trigger === 'contact_added' && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Filtrer par tag (optionnel)</InputLabel>
                  <Select
                    value={audienceTagFilter}
                    onChange={e => setAudienceTagFilter(e.target.value)}
                    label="Filtrer par tag (optionnel)"
                  >
                    <MenuItem value=""><em>— Tous les nouveaux contacts —</em></MenuItem>
                    {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    Laissez vide pour déclencher sur tous les nouveaux contacts.
                  </Typography>
                </FormControl>
              )}

              {/* tag_added */}
              {trigger === 'tag_added' && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Choisir le Tag cible</InputLabel>
                  <Select value={condition} onChange={e => setCondition(e.target.value)} label="Choisir le Tag cible">
                    {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              {/* membership_expiring */}
              {trigger === 'membership_expiring' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <TextField
                    label="Nombre de jours avant expiration"
                    type="number"
                    fullWidth
                    size="small"
                    value={daysBefore}
                    onChange={e => setDaysBefore(e.target.value)}
                    inputProps={{ max: 365 }}
                    helperText="Positif = avant expiration (ex: 30). Négatif = après expiration (ex: -1)."
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Filtrer par tag (optionnel)</InputLabel>
                    <Select
                      value={audienceTagFilter}
                      onChange={e => setAudienceTagFilter(e.target.value)}
                      label="Filtrer par tag (optionnel)"
                    >
                      <MenuItem value=""><em>— Tous les membres concernés —</em></MenuItem>
                      {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                      Laissez vide pour cibler tous les membres avec un abonnement expirant.
                    </Typography>
                  </FormControl>
                </Box>
              )}

              {/* payment_pending */}
              {trigger === 'payment_pending' && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff7ed', border: '1px solid #fdba74', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#9a3412', fontSize: 12, lineHeight: 1.6 }}>
                    <strong>Comment ça fonctionne :</strong> chaque jour, le système envoie automatiquement l'email configuré ci-dessous à tous les membres dont l'abonnement est au statut « en attente de paiement ».
                  </Typography>
                </Box>
              )}

              {/* scheduled */}
              {trigger === 'scheduled' && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Date et heure de début"
                    type="datetime-local"
                    fullWidth
                    size="small"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    inputProps={{ min: new Date().toISOString().slice(0, 16) }}
                    InputLabelProps={{ shrink: true }}
                    helperText="La date doit être dans le futur."
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Récurrence</InputLabel>
                    <Select value={recurrence} onChange={e => setRecurrence(e.target.value)} label="Récurrence">
                      <MenuItem value="once">Une seule fois</MenuItem>
                      <MenuItem value="daily">Chaque jour</MenuItem>
                      <MenuItem value="weekly">Chaque semaine</MenuItem>
                      <MenuItem value="monthly">Chaque mois</MenuItem>
                      <MenuItem value="yearly">Chaque année</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Envoyer à l'audience (Tag) *</InputLabel>
                    <Select value={audienceTag} onChange={e => setAudienceTag(e.target.value)} label="Envoyer à l'audience (Tag) *">
                      {tags.map(t => <MenuItem key={t.id} value={t.nom}>{t.nom}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>

            {/* Action section */}
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: '#64748b', fontWeight: 700 }}>
                <EmailIcon fontSize="small" /> ACTION À EFFECTUER
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Utiliser un modèle d'email</InputLabel>
                <Select
                  value={templateId}
                  onChange={e => { setTemplateId(e.target.value); if (e.target.value) setQuickMessage(''); }}
                  label="Utiliser un modèle d'email"
                >
                  <MenuItem value=""><em>— Message rapide (sans modèle) —</em></MenuItem>
                  {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>)}
                </Select>
              </FormControl>

              {!templateId && (
                <TextField
                  label="Message rapide"
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

            {/* Visual flow preview */}
            {(trigger || nom) && (
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 2 }}>
                  APERÇU DU PARCOURS
                </Typography>
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                  <FlowNode
                    icon={trigger === 'birthday'
                      ? <CakeIcon sx={{ fontSize: 18, color: '#ec4899' }} />
                      : <FlashOnIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />}
                    label={
                      trigger === 'birthday'              ? 'Anniversaire'
                      : trigger === 'contact_added'       ? 'Nouveau contact'
                      : trigger === 'tag_added'           ? 'Tag appliqué'
                      : trigger === 'membership_expiring' ? (Number(daysBefore) < 0 ? `J+${Math.abs(daysBefore)}` : `J-${daysBefore}`)

                      : 'Programmé'
                    }
                    color={trigger === 'birthday' ? '#f9a8d4' : '#c4b5fd'}
                    bgColor={trigger === 'birthday' ? '#fdf2f8' : '#f5f3ff'}
                  />
                  {audienceTagFilter && ['contact_added', 'membership_expiring'].includes(trigger) && (
                    <>
                      <ArrowForwardIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                      <FlowNode
                        icon={<LoyaltyIcon sx={{ fontSize: 18, color: '#f59e0b' }} />}
                        label={`Tag: ${audienceTagFilter}`}
                        color="#fde68a"
                        bgColor="#fffbeb"
                      />
                    </>
                  )}
                  <ArrowForwardIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                  <FlowNode
                    icon={<EmailIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />}
                    label={templateId ? 'Modèle' : (quickMessage ? 'Message' : 'Email')}
                    color="#bae6fd"
                    bgColor="#f0f9ff"
                  />
                  {(templateId || quickMessage) && (
                    <>
                      <ArrowForwardIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                      <FlowNode
                        icon={<PeopleIcon sx={{ fontSize: 18, color: '#16a34a' }} />}
                        label="Destinataires"
                        color="#bbf7d0"
                        bgColor="#f0fdf4"
                      />
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={handleCloseBuilder} color="inherit" sx={{ fontWeight: 600 }}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveCustom}
            variant="contained"
            disabled={saving}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
          >
            {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : "Activer l'automation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Automations;
