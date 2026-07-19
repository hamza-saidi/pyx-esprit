import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  fetchCampaigns, addCampaign, updateCampaign, sendCampaign,
  scheduleCampaign, calculateRecipients, sendTestEmail, fetchCampaignStatsLight,
} from '../features/campaigns/campaignsSlice';
import { fetchTags } from '../features/tags/tagsSlice';
import { fetchSegments } from '../features/segments/segmentsSlice';
import {
  Box, Typography, Button, TextField, CircularProgress, Tooltip, Chip, Alert,
  MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScienceIcon from '@mui/icons-material/Science';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import MonitorIcon from '@mui/icons-material/Monitor';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EmailEditor from '../components/EmailEditor';
import AIAssistDrawer from '../components/AIAssistDrawer';
import TemplatePicker from '../components/TemplatePicker';
import axiosInstance from '../api/axios';

// ── Constants ──────────────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Configuration', 'Contenu', 'Audience', 'Révision'];

const SESSION_KEY = 'campaign_wizard_new';

const TYPE_CARDS = [
  { value: 'newsletter', emoji: '📰', label: 'Newsletter', desc: 'Information régulière à votre base' },
  { value: 'relance',   emoji: '🔄', label: 'Relance',    desc: 'Ré-engager les inactifs ou non-ouvreurs' },
  { value: 'test_ab',   emoji: '⚡', label: 'A/B Test',   desc: 'Comparer deux lignes d\'objet' },
];

const AUDIENCE_CARDS = [
  { value: 'all',     emoji: '👥', label: 'Tous les contacts', desc: 'Envoyer à toute votre base' },
  { value: 'segment', emoji: '🎯', label: 'Par segment',       desc: 'Cibler un groupe précis' },
  { value: 'tags',    emoji: '🏷️', label: 'Par étiquette',    desc: 'Filtrer par tag' },
];

const emptyCampaign = {
  titre: '', sujet: '', sujet_b: '', preheader: '',
  contenu_html: '', contenu_texte: '',
  utm_source: 'newsletter', utm_medium: 'email', utm_content: '',
  statut: 'brouillon', type_campagne: 'newsletter',
  audience: 'all', tags_ids: [], segment_id: '',
  limite_envois: '', date_programmation: '', send_mode: 'now',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function subjectScore(sujet) {
  const s = (sujet || '').trim();
  if (!s) return 0;
  let score = 0;
  const len = s.length;
  if (len >= 20 && len <= 60) score += 40; else if (len >= 10) score += 20;
  if (s.includes('{{')) score += 15;
  if (s.includes('?')) score += 10;
  if (/\d/.test(s)) score += 10;
  if (s !== s.toUpperCase()) score += 10;
  const capWords = s.split(' ').filter((w) => w.length > 2 && w === w.toUpperCase()).length;
  if (capWords <= 1) score += 10;
  if ((s.match(/[!?]/g) || []).length <= 2) score += 5;
  return Math.min(score, 100);
}

function scoreColor(s) { return s >= 70 ? '#16a34a' : s >= 40 ? '#d97706' : '#dc2626'; }
function scoreLabel(s) { return s >= 70 ? 'Bon objet' : s >= 40 ? 'Peut mieux faire' : s > 0 ? 'À améliorer' : ''; }

// ── Sub-components ─────────────────────────────────────────────────────────────

const WizardProgress = ({ step, steps }) => (
  <Box display="flex" alignItems="center" flex={1} mx={3}>
    {steps.map((label, i) => (
      <React.Fragment key={i}>
        <Box display="flex" alignItems="center" gap={0.75} sx={{ flexShrink: 0 }}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: i < step ? '#16a34a' : i === step ? 'secondary.main' : '#e5e7eb',
            color: i <= step ? '#fff' : '#9ca3af',
            fontWeight: 700, fontSize: 12, transition: 'all 0.25s',
          }}>
            {i < step ? <CheckIcon sx={{ fontSize: 14 }} /> : i + 1}
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: i === step ? 700 : 400, color: i === step ? 'text.primary' : 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
        {i < steps.length - 1 && (
          <Box sx={{ flex: 1, height: 2, mx: 1.5, bgcolor: i < step ? '#16a34a' : '#e5e7eb', transition: 'background-color 0.25s', minWidth: 24 }} />
        )}
      </React.Fragment>
    ))}
  </Box>
);

const SelectCard = ({ emoji, label, desc, selected, onClick, minWidth = 140 }) => (
  <Box onClick={onClick} sx={{
    flex: 1, minWidth, p: 2.5,
    border: '2px solid', borderColor: selected ? 'secondary.main' : '#e5e7eb',
    borderRadius: 2.5, cursor: 'pointer',
    bgcolor: selected ? '#f5f3ff' : '#fff',
    transition: 'all 0.15s',
    '&:hover': { borderColor: 'secondary.light', bgcolor: '#faf5ff' },
  }}>
    <Typography fontSize={28} mb={0.75}>{emoji}</Typography>
    <Typography fontWeight={700} fontSize={14} mb={0.25}>{label}</Typography>
    <Typography fontSize={12} color="text.secondary" lineHeight={1.4}>{desc}</Typography>
  </Box>
);

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CampaignWizardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const { items, recipientPreview } = useSelector((s) => s.campaigns);
  const tagsState    = useSelector((s) => s.tags    || { items: [] });
  const segmentsState = useSelector((s) => s.segments || { items: [] });

  // Resolve campaign for edit mode
  const isEdit = Boolean(id);
  const campaignFromState = location.state?.campaign
    || (isEdit ? (Array.isArray(items) ? items : []).find((c) => String(c.id) === String(id)) : null);

  // Wizard state
  const [wizardStep,  setWizardStep]  = useState(0);
  const [form,        setForm]        = useState(emptyCampaign);
  const [stepError,   setStepError]   = useState('');
  const [contentWarned, setContentWarned] = useState(false);
  const [audienceTouched, setAudienceTouched] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [aiPanel,     setAiPanel]     = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [draftId,     setDraftId]     = useState(null);
  const [savedAt,     setSavedAt]     = useState(null);
  const [autoSaving,  setAutoSaving]  = useState(false);
  const autoSaveTimerRef = useRef(null);
  const [utmOpen,     setUtmOpen]     = useState(false);
  const [optimalTime, setOptimalTime] = useState(undefined);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateToLoad, setTemplateToLoad] = useState(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [testEmailDialog, setTestEmailDialog] = useState({ open: false, email: '', sending: false, sent: false, error: '' });
  const [loadingCampaign, setLoadingCampaign] = useState(isEdit && !campaignFromState);
  const [sessionRestored, setSessionRestored] = useState(false);
  const sessionSaveTimerRef = useRef(null);

  // Load tags/segments on mount
  useEffect(() => {
    dispatch(fetchTags());
    dispatch(fetchSegments());
    if (!Array.isArray(items) || items.length === 0) dispatch(fetchCampaigns());
  }, []); // eslint-disable-line

  // ── sessionStorage persistence (new campaigns only) ────────────────────────
  // Restore on mount
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { step, form: sf, draftId: sd } = JSON.parse(saved);
        if (sf?.titre) {
          setForm(sf);
          setWizardStep(step || 0);
          if (sd) setDraftId(sd);
          setSavedAt(new Date());
          setSessionRestored(true);
          setTimeout(() => setSessionRestored(false), 4000);
        }
      }
    } catch (_) {}
  }, []); // eslint-disable-line

  // Save on every form/step/draftId change (debounced 800 ms)
  useEffect(() => {
    if (isEdit) return;
    clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step: wizardStep, form, draftId }));
      } catch (_) {}
    }, 800);
    return () => clearTimeout(sessionSaveTimerRef.current);
  }, [wizardStep, form, draftId, isEdit]); // eslint-disable-line

  // Populate form from campaign (edit mode)
  useEffect(() => {
    if (campaignFromState) {
      const c = campaignFromState;
      setForm({
        ...c,
        tags_ids: Array.isArray(c.tags_ids) ? c.tags_ids : [],
        titre:     String(c.titre || ''),
        sujet:     String(c.sujet || ''),
        sujet_b:   String(c.sujet_b || c.parametres?.sujet_b || ''),
        preheader: String(c.parametres?.preheader || ''),
        contenu_html:  String(c.contenu_html || ''),
        contenu_texte: String(c.contenu_texte || ''),
        utm_source: String(c.parametres?.utm?.source || 'newsletter'),
        utm_medium: String(c.parametres?.utm?.medium || 'email'),
        utm_content: String(c.parametres?.utm?.content || ''),
        statut: String(c.statut || 'brouillon'),
        type_campagne: String(c.type_campagne || 'newsletter'),
        audience: String(c.audience || 'all'),
        segment_id: c.segment_id || '',
        limite_envois: c.limite_envois || '',
        date_programmation: c.date_programmation || '',
        send_mode: c.date_programmation ? 'schedule' : 'now',
      });
      setDraftId(c.id);
      setAudienceTouched(true);
      setLoadingCampaign(false);
    } else if (isEdit && !loadingCampaign) {
      // fetch directly if not in store
      setLoadingCampaign(true);
      axiosInstance.get(`/campagnes/${id}`)
        .then(r => {
          const c = r.data;
          setForm({
            ...c,
            tags_ids: Array.isArray(c.tags_ids) ? c.tags_ids : [],
            titre: String(c.titre || ''),
            sujet: String(c.sujet || ''),
            sujet_b: String(c.sujet_b || c.parametres?.sujet_b || ''),
            preheader: String(c.parametres?.preheader || ''),
            contenu_html: String(c.contenu_html || ''),
            contenu_texte: String(c.contenu_texte || ''),
            utm_source: String(c.parametres?.utm?.source || 'newsletter'),
            utm_medium: String(c.parametres?.utm?.medium || 'email'),
            utm_content: String(c.parametres?.utm?.content || ''),
            statut: String(c.statut || 'brouillon'),
            type_campagne: String(c.type_campagne || 'newsletter'),
            audience: String(c.audience || 'all'),
            segment_id: c.segment_id || '',
            limite_envois: c.limite_envois || '',
            date_programmation: c.date_programmation || '',
            send_mode: c.date_programmation ? 'schedule' : 'now',
          });
          setDraftId(c.id);
          setAudienceTouched(true);
        })
        .catch(() => navigate('/campagnes'))
        .finally(() => setLoadingCampaign(false));
    }
  }, [campaignFromState, id]); // eslint-disable-line

  // Recipient count when audience changes
  useEffect(() => {
    if (!audienceTouched) return;
    dispatch(calculateRecipients({
      audience: form.audience,
      segment_id: form.segment_id || undefined,
      tags_ids: form.tags_ids?.length ? form.tags_ids : undefined,
    }));
  }, [audienceTouched, form.audience, form.segment_id, form.tags_ids?.join(',')]); // eslint-disable-line

  // Optimal send time
  useEffect(() => {
    setOptimalTime(undefined);
    axiosInstance.get('/campagnes/stats/optimal-time')
      .then(r => setOptimalTime(r.data.suggestion || null))
      .catch(() => setOptimalTime(null));
  }, []);

  const handleQuickSave = async () => {
    if (!form.titre.trim() || autoSaving) return;
    const campaignId = draftId;
    const payload = {
      titre: form.titre.trim(),
      sujet: form.sujet.trim() || '(Sans objet)',
      contenu_html: form.contenu_html || '',
      type_campagne: form.type_campagne || 'newsletter',
      statut: 'brouillon',
    };
    setAutoSaving(true);
    try {
      if (campaignId) {
        await dispatch(updateCampaign({ id: campaignId, data: payload })).unwrap();
      } else {
        const res = await dispatch(addCampaign(payload)).unwrap();
        if (res?.campagne?.id) setDraftId(res.campagne.id);
      }
      setSavedAt(new Date());
    } catch { /* silent */ }
    setAutoSaving(false);
  };

  // Autosave brouillon — debounce 30s
  useEffect(() => {
    if (!form.titre.trim()) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(handleQuickSave, 30000);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form.titre, form.sujet, form.contenu_html, form.type_campagne]); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────

  const score = subjectScore(form.sujet);

  const audienceLabel = useMemo(() => {
    if (form.audience === 'all') return 'Tous les contacts';
    if (form.audience === 'segment' && form.segment_id) {
      const seg = (segmentsState.items || []).find((s) => String(s.id) === String(form.segment_id));
      return seg ? `Segment : ${seg.nom}` : 'Segment';
    }
    if (form.audience === 'tags' && form.tags_ids?.length) {
      const names = (tagsState.items || []).filter((t) => form.tags_ids.includes(t.id)).map((t) => t.nom);
      return names.length ? `Étiquettes : ${names.join(', ')}` : 'Étiquettes sélectionnées';
    }
    return 'membres du club';
  }, [form.audience, form.segment_id, form.tags_ids, segmentsState.items, tagsState.items]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleHtmlChange = (html) => setForm((f) => ({ ...f, contenu_html: html }));
  const handleTextChange = (text) => setForm((f) => ({ ...f, contenu_texte: text }));
  const handleAIApply = ({ sujet, contenu_html }) => setForm((f) => ({ ...f, sujet, contenu_html }));

  const clearSessionDraft = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  };

  const handleCancel = () => {
    clearTimeout(autoSaveTimerRef.current);
    clearSessionDraft();
    navigate('/campagnes');
  };

  const handleNext = () => {
    setStepError('');
    if (wizardStep === 0 && !form.titre.trim()) { setStepError('Le titre est requis.'); return; }
    if (wizardStep === 1) {
      if (!form.sujet.trim()) { setStepError("L'objet de l'email est requis."); return; }
      const textLen = (form.contenu_html || '').replace(/<[^>]*>/g, '').trim().length;
      if (textLen < 50 && !contentWarned) {
        setStepError("Le contenu de l'email semble vide. Ajoutez du contenu, ou cliquez à nouveau sur Continuer pour ignorer.");
        setContentWarned(true);
        return;
      }
    }
    setContentWarned(false);
    setWizardStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => { setStepError(''); setWizardStep((s) => Math.max(s - 1, 0)); };

  const handleWizardSubmit = async (action) => {
    setSubmitting(true);
    setStepError('');
    const payload = {
      titre: (form.titre || '').trim(),
      sujet: form.sujet?.trim() || undefined,
      sujet_b: form.type_campagne === 'test_ab' ? (form.sujet_b?.trim() || undefined) : undefined,
      contenu_html: form.contenu_html?.length >= 10 ? form.contenu_html : '<p>Contenu</p>',
      contenu_texte: form.contenu_texte || undefined,
      type_campagne: form.type_campagne || 'newsletter',
      audience: form.audience,
      segment_id: form.segment_id || undefined,
      tags_ids: form.tags_ids?.length ? form.tags_ids : undefined,
      date_programmation: action === 'schedule' && form.date_programmation ? form.date_programmation : undefined,
      parametres: {
        ...(form.parametres || {}),
        preheader: form.preheader?.trim() || '',
        sujet_b: form.type_campagne === 'test_ab' ? (form.sujet_b?.trim() || '') : '',
        test_ab: form.type_campagne === 'test_ab',
        utm: {
          source: form.utm_source?.trim() || 'newsletter',
          medium: form.utm_medium?.trim() || 'email',
          ...(form.utm_content?.trim() ? { content: form.utm_content.trim() } : {}),
        },
      },
    };
    clearTimeout(autoSaveTimerRef.current);
    const campaignId = draftId;
    const res = await dispatch(campaignId ? updateCampaign({ id: campaignId, data: payload }) : addCampaign(payload));
    if (res.meta?.requestStatus === 'fulfilled') {
      if (action === 'send') {
        const newId = res.payload?.campagne?.id ?? campaignId;
        if (newId) {
          dispatch(sendCampaign(newId));
          const iv = setInterval(() => dispatch(fetchCampaignStatsLight(newId)), 3000);
          setTimeout(() => clearInterval(iv), 5 * 60 * 1000);
        }
      }
      clearSessionDraft();
      navigate('/campagnes');
    } else {
      const msg = res.payload || res.error?.message || 'Erreur lors de la sauvegarde';
      setStepError(Array.isArray(msg?.errors) ? msg.errors.join(', ') : String(msg));
    }
    setSubmitting(false);
  };

  const openTemplateDialog = async () => {
    setTemplateOpen(true);
    try {
      const res = await axiosInstance.get('/templates');
      setSavedTemplates(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch { setSavedTemplates([]); }
  };

  const loadTemplate = (html) => {
    setTemplateToLoad(html);
    setForm(f => ({ ...f, contenu_html: html }));
  };

  const buildChecklist = () => {
    const hasUnsub = /unsubscribe_link|se d.sabonner/i.test(form.contenu_html);
    const hasPlaceholderLinks = (form.contenu_html.match(/href="#"/g) || []).length > 0;
    const hasPlaceholderImgs = form.contenu_html.includes('placehold.co');
    const textContent = form.contenu_html.replace(/<[^>]*>/g, '').trim();
    return [
      { id: 'titre',    label: 'Titre renseigné',                         ok: !!form.titre.trim(),              critical: true },
      { id: 'sujet',    label: "Objet de l'email renseigné",              ok: !!form.sujet.trim(),              critical: true },
      { id: 'contenu',  label: 'Contenu non vide (> 50 caractères)',      ok: textContent.length > 50,          critical: true },
      { id: 'dest',     label: 'Destinataires calculés (> 0)',             ok: (recipientPreview?.count || 0) > 0, critical: true },
      { id: 'unsub',    label: 'Lien de désabonnement présent',           ok: hasUnsub,                         critical: true },
      { id: 'links',    label: 'Aucun lien "#" non remplacé',             ok: !hasPlaceholderLinks,             critical: false },
      { id: 'imgs',     label: 'Aucune image placeholder',                ok: !hasPlaceholderImgs,              critical: false },
    ];
  };

  const openChecklist = (action) => { setPendingAction(action); setChecklistOpen(true); };

  const handleTestSend = async () => {
    setTestEmailDialog((s) => ({ ...s, sending: true, sent: false, error: '' }));
    const res = await dispatch(sendTestEmail({
      email_test: testEmailDialog.email,
      sujet: form.sujet || '(Sans objet)',
      contenu_html: form.contenu_html,
    }));
    if (res.meta?.requestStatus === 'fulfilled') {
      setTestEmailDialog((s) => ({ ...s, sending: false, sent: true }));
    } else {
      setTestEmailDialog((s) => ({ ...s, sending: false, error: res.payload || "Erreur lors de l'envoi" }));
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loadingCampaign) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress size={32} sx={{ color: '#2563eb' }} />
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#f8fafc' }}>

      {/* Session restore banner */}
      {sessionRestored && (
        <Alert
          severity="info"
          onClose={() => setSessionRestored(false)}
          sx={{ borderRadius: 0, py: 0.25, fontSize: 13, '& .MuiAlert-message': { py: 0.5 } }}
        >
          Brouillon restauré — votre progression depuis la dernière session a été récupérée.
        </Alert>
      )}

      {/* TOP BAR */}
      <Box sx={{ px: 3, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', flexShrink: 0, gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5} sx={{ flexShrink: 0 }}>
          <Tooltip title="Quitter sans sauvegarder">
            <IconButton size="small" onClick={handleCancel} sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" lineHeight={1}>
              {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
            </Typography>
            {form.titre ? (
              <Typography fontWeight={700} fontSize={15} lineHeight={1.3} noWrap sx={{ maxWidth: 200 }}>{form.titre}</Typography>
            ) : (
              <Typography fontSize={13} color="text.disabled" lineHeight={1.3}>Sans titre</Typography>
            )}
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
          {autoSaving ? (
            <><CircularProgress size={10} sx={{ color: '#94a3b8' }} /><Typography variant="caption" color="text.disabled" fontSize={11}>Sauvegarde…</Typography></>
          ) : savedAt ? (
            <><SaveIcon sx={{ fontSize: 12, color: '#22c55e' }} /><Typography variant="caption" sx={{ fontSize: 11, color: '#22c55e' }}>Sauvegardé à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography></>
          ) : form.titre.trim() ? (
            <Typography variant="caption" sx={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>Non sauvegardé</Typography>
          ) : null}
        </Box>

        <WizardProgress step={wizardStep} steps={WIZARD_STEPS} />

        {wizardStep === 1 && (
          <Box display="flex" gap={1} alignItems="center" flexShrink={0}>
            <Tooltip title="Sauvegarder comme brouillon sans quitter l'éditeur">
              <Button variant="outlined" size="small" startIcon={autoSaving ? <CircularProgress size={12} /> : <SaveIcon />}
                onClick={handleQuickSave}
                disabled={autoSaving || !form.titre.trim()}
                sx={{ borderColor: '#64748b', color: '#64748b', '&:hover': { bgcolor: '#f8fafc', borderColor: '#475569' } }}>
                Sauvegarder
              </Button>
            </Tooltip>
            <Tooltip title="Envoyer un email test pour vérifier le rendu dans votre boîte mail">
              <Button variant="outlined" size="small" startIcon={<ScienceIcon />}
                onClick={() => setTestEmailDialog((s) => ({ ...s, open: true, sent: false, error: '' }))}
                sx={{ borderColor: '#2563eb', color: '#2563eb', '&:hover': { bgcolor: '#eff6ff', borderColor: '#1d4ed8' } }}>
                Email test
              </Button>
            </Tooltip>
            <Tooltip title={aiPanel ? "Fermer l'assistant IA" : "Générer le contenu avec l'IA"}>
              <Button variant={aiPanel ? 'contained' : 'outlined'} size="small" startIcon={<AutoAwesomeIcon />}
                onClick={() => setAiPanel((v) => !v)}
                sx={aiPanel
                  ? { bgcolor: '#7c3aed', color: '#fff', '&:hover': { bgcolor: '#6d28d9' } }
                  : { borderColor: '#8b5cf6', color: '#7c3aed', '&:hover': { bgcolor: '#f5f3ff' } }}>
                Assistance IA
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* STEP CONTENT */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Step 0 — Configuration */}
        {wizardStep === 0 && (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', p: { xs: 3, md: 5 } }}>
            <Box sx={{ width: '100%', maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stepError && <Alert severity="error">{stepError}</Alert>}

              <TextField label="Titre de la campagne" name="titre" value={form.titre} onChange={handleChange}
                fullWidth autoFocus helperText="Usage interne — non visible par les destinataires" />

              <Box>
                <Typography variant="body2" fontWeight={700} mb={2} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
                  Type de campagne
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {TYPE_CARDS.map((tc) => (
                    <SelectCard key={tc.value} emoji={tc.emoji} label={tc.label} desc={tc.desc}
                      selected={form.type_campagne === tc.value}
                      onClick={() => setForm((f) => ({ ...f, type_campagne: tc.value }))} minWidth={150} />
                  ))}
                </Box>
              </Box>

              {/* UTM tracking */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 1, borderBottom: `1px solid ${utmOpen ? '#e2e8f0' : 'transparent'}`, mb: utmOpen ? 2 : 0 }}
                  onClick={() => setUtmOpen(o => !o)}>
                  <Typography variant="body2" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
                    Paramètres UTM (tracking avancé)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 600 }}>{utmOpen ? 'Masquer ▲' : 'Configurer ▼'}</Typography>
                </Box>
                {utmOpen && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ bgcolor: '#f8fafc', px: 1.5, py: 1, borderRadius: 1, display: 'block' }}>
                      Ces paramètres sont ajoutés automatiquement à tous les liens de votre email pour le suivi Google Analytics.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField label="utm_source" name="utm_source" value={form.utm_source || ''} onChange={handleChange}
                        size="small" fullWidth placeholder="Ex: newsletter" helperText="Source du trafic" inputProps={{ maxLength: 100 }} />
                      <TextField label="utm_medium" name="utm_medium" value={form.utm_medium || ''} onChange={handleChange}
                        size="small" fullWidth placeholder="Ex: email, sms" helperText="Canal marketing" inputProps={{ maxLength: 100 }} />
                    </Box>
                    <TextField label="utm_content (optionnel)" name="utm_content" value={form.utm_content || ''} onChange={handleChange}
                      size="small" fullWidth placeholder="Ex: banniere-haut, cta-principal"
                      helperText="Pour distinguer plusieurs liens dans un même email" inputProps={{ maxLength: 200 }} />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 1 — Contenu */}
        {wizardStep === 1 && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {stepError && <Alert severity="error" onClose={() => setStepError('')} sx={{ mb: 0.5 }}>{stepError}</Alert>}
              <Box display="flex" gap={1.5} alignItems="flex-start">
                {(() => {
                  const sLen = (form.sujet || '').length;
                  const sColor = sLen === 0 ? '#94a3b8' : sLen < 20 ? '#dc2626' : sLen <= 60 ? '#16a34a' : '#d97706';
                  const sHint  = sLen === 0 ? '60 recommandés' : sLen <= 60 ? 'idéal ✓' : 'trop long — risque de coupure';
                  return (
                    <TextField label="Objet de l'email" name="sujet" value={form.sujet} onChange={handleChange} fullWidth
                      helperText={`${sLen} / 60 — ${sHint} · astuce : {{prenom}} pour personnaliser`}
                      FormHelperTextProps={{ sx: { color: sColor, fontWeight: sLen > 0 ? 500 : 400 } }}
                      inputProps={{ maxLength: 100 }} />
                  );
                })()}
                <Tooltip title="Choisir un modèle d'email comme point de départ">
                  <Button variant="outlined" size="small" startIcon={<CollectionsBookmarkIcon />} onClick={openTemplateDialog}
                    sx={{ flexShrink: 0, mt: 0.5, borderColor: '#e5e7eb', color: '#57606a', '&:hover': { borderColor: '#0969da', color: '#0969da' } }}>
                    Templates
                  </Button>
                </Tooltip>
              </Box>
              {(() => {
                const phLen = (form.preheader || '').length;
                const phColor = phLen === 0 ? '#94a3b8' : phLen < 20 ? '#dc2626' : phLen <= 90 ? '#16a34a' : '#d97706';
                const phHint  = phLen === 0 ? '90 recommandés' : phLen < 20 ? 'trop court' : phLen <= 90 ? 'idéal ✓' : 'trop long';
                return (
                  <TextField label="Texte de prévisualisation (preheader)" name="preheader" value={form.preheader || ''}
                    onChange={handleChange} fullWidth size="small"
                    placeholder="Texte visible dans la boîte de réception avant ouverture…"
                    helperText={`${phLen} / 90 — ${phHint}`}
                    FormHelperTextProps={{ sx: { color: phColor, fontWeight: phLen > 0 ? 500 : 400 } }}
                    inputProps={{ maxLength: 150 }} />
                );
              })()}
              {form.sujet?.length > 0 && (
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box flex={1} sx={{ height: 5, borderRadius: 3, bgcolor: '#e5e7eb', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${score}%`, bgcolor: scoreColor(score), transition: 'width 0.3s ease, background-color 0.3s ease', borderRadius: 3 }} />
                  </Box>
                  <Chip label={`${score}/100 — ${scoreLabel(score)}`} size="small"
                    sx={{ bgcolor: `${scoreColor(score)}18`, color: scoreColor(score), fontWeight: 700, fontSize: 11 }} />
                  <Tooltip title="Ajouter le prénom du destinataire">
                    <Chip label="+ {{prenom}}" size="small" variant="outlined" clickable
                      onClick={() => setForm((f) => ({ ...f, sujet: f.sujet + ' {{prenom}}' }))}
                      sx={{ fontSize: 11, fontFamily: 'monospace' }} />
                  </Tooltip>
                </Box>
              )}
              {form.type_campagne === 'test_ab' && (
                <TextField label="Objet B — variante A/B" name="sujet_b" value={form.sujet_b} onChange={handleChange}
                  fullWidth size="small" helperText="Sera envoyé à 50% de l'audience" inputProps={{ maxLength: 100 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <EmailEditor value={form.contenu_html} onChange={handleHtmlChange} onTextChange={handleTextChange}
                templateHtml={templateToLoad} onTemplateLoaded={() => setTemplateToLoad(null)} />
            </Box>
          </Box>
        )}

        {/* Step 2 — Audience */}
        {wizardStep === 2 && (
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', p: { xs: 3, md: 5 } }}>
            <Box sx={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stepError && <Alert severity="error">{stepError}</Alert>}

              {form.audience === 'custom' ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  <Typography fontWeight={700} fontSize={13} mb={0.5}>Audience personnalisée (campagne de suivi)</Typography>
                  <Typography fontSize={13}>
                    Les destinataires ont été sélectionnés via la fonctionnalité de suivi (cliqueurs, non-ouvreurs…).
                    L'audience est verrouillée — passez à l'étape suivante.
                  </Typography>
                </Alert>
              ) : (
                <Box>
                  <Typography variant="body2" fontWeight={700} mb={2} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
                    Qui recevra cette campagne ?
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    {AUDIENCE_CARDS.map((ac) => (
                      <SelectCard key={ac.value} emoji={ac.emoji} label={ac.label} desc={ac.desc}
                        selected={form.audience === ac.value}
                        onClick={() => { setAudienceTouched(true); setForm((f) => ({ ...f, audience: ac.value })); }}
                        minWidth={150} />
                    ))}
                  </Box>
                </Box>
              )}

              {form.audience === 'segment' && (
                <TextField select label="Segment" name="segment_id" value={form.segment_id}
                  onChange={(e) => { setAudienceTouched(true); handleChange(e); }} fullWidth>
                  {(segmentsState.items || []).map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.nom}</MenuItem>
                  ))}
                </TextField>
              )}

              {form.audience === 'tags' && (
                <TextField select label="Étiquettes" name="tags_ids" value={form.tags_ids}
                  onChange={(e) => {
                    setAudienceTouched(true);
                    const v = Array.from(e.target.selectedOptions || []).map((o) => parseInt(o.value, 10));
                    setForm((f) => ({ ...f, tags_ids: v }));
                  }}
                  SelectProps={{ multiple: true, native: true }}
                  inputProps={{ style: { height: 100 } }} fullWidth>
                  {(tagsState.items || []).map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </TextField>
              )}

              {audienceTouched && recipientPreview?.count != null && (
                <Box sx={{ p: 3, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography fontSize={32}>👥</Typography>
                  <Box>
                    <Typography fontWeight={800} fontSize={32} color="#15803d" lineHeight={1}>
                      {recipientPreview.count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">destinataires estimés</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Step 3 — Révision & Envoi */}
        {wizardStep === 3 && (
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left */}
            <Box sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0, overflowY: 'auto', p: 3, bgcolor: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {stepError && <Alert severity="error">{stepError}</Alert>}

              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Récapitulatif
                </Typography>
                <Box display="flex" flexDirection="column" gap={1} mt={1.5}>
                  {[
                    { label: 'Titre', value: form.titre || '—' },
                    { label: 'Type', value: TYPE_CARDS.find((t) => t.value === form.type_campagne)?.label || form.type_campagne },
                    { label: 'Audience', value: audienceLabel },
                    { label: 'Destinataires', value: recipientPreview?.count != null ? `${recipientPreview.count.toLocaleString()} contacts` : 'Non calculé' },
                  ].map((item) => (
                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 0.75, borderBottom: '1px solid #f1f5f9' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.label}</Typography>
                      <Typography fontSize={13} fontWeight={600} textAlign="right" sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {form.sujet && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Objet de l'email</Typography>
                  <Typography fontWeight={600} fontSize={14} mb={1}>{form.sujet}</Typography>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box flex={1} sx={{ height: 4, borderRadius: 2, bgcolor: '#e5e7eb', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${score}%`, bgcolor: scoreColor(score), borderRadius: 2 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: scoreColor(score), fontWeight: 700 }}>{score}/100</Typography>
                  </Box>
                  {form.type_campagne === 'test_ab' && form.sujet_b && (
                    <Box mt={1.25} pt={1.25} sx={{ borderTop: '1px dashed #e5e7eb' }}>
                      <Typography variant="caption" color="text.secondary">Variante B</Typography>
                      <Typography fontSize={13} fontWeight={600}>{form.sujet_b}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Send mode */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Mode d'envoi
                </Typography>
                <Box display="flex" flexDirection="column" gap={1.25} mt={1.5}>
                  {[
                    { value: 'now',      emoji: '🚀', label: 'Envoyer maintenant', desc: 'Envoi immédiat' },
                    { value: 'schedule', emoji: '⏰', label: 'Programmer',          desc: 'Choisir une date' },
                    { value: 'draft',    emoji: '📝', label: 'Brouillon',           desc: 'Finaliser plus tard' },
                  ].map((sm) => (
                    <Box key={sm.value} onClick={() => setForm((f) => ({ ...f, send_mode: sm.value }))} sx={{
                      p: 1.5, border: '2px solid',
                      borderColor: form.send_mode === sm.value ? 'secondary.main' : '#e5e7eb',
                      borderRadius: 2, cursor: 'pointer',
                      bgcolor: form.send_mode === sm.value ? '#f5f3ff' : '#fff',
                      display: 'flex', alignItems: 'center', gap: 1.5, transition: 'all 0.15s',
                      '&:hover': { borderColor: 'secondary.light' },
                    }}>
                      <Typography fontSize={20}>{sm.emoji}</Typography>
                      <Box>
                        <Typography fontWeight={700} fontSize={13}>{sm.label}</Typography>
                        <Typography fontSize={11} color="text.secondary">{sm.desc}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                {form.send_mode === 'schedule' && (
                  <Box mt={2}>
                    <TextField label="Date et heure d'envoi" name="date_programmation" type="datetime-local"
                      value={form.date_programmation || ''} onChange={handleChange}
                      fullWidth size="small" InputLabelProps={{ shrink: true }} />
                    {optimalTime !== undefined && (
                      <Box sx={{ mt: 1, px: 1.5, py: 1, bgcolor: optimalTime ? '#f0fdf4' : '#f8fafc', border: `1px solid ${optimalTime ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <AutoAwesomeIcon sx={{ fontSize: 13, color: optimalTime ? '#16a34a' : '#94a3b8' }} />
                        {optimalTime ? (
                          <>
                            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, flex: 1 }}>
                              Créneau optimal : {optimalTime.label} · +{optimalTime.boostPct}% d'ouvertures
                            </Typography>
                            <Button size="small" sx={{ py: 0, px: 1, minHeight: 'auto', fontSize: 11, color: '#15803d', textTransform: 'none', fontWeight: 700 }}
                              onClick={() => {
                                const now = new Date(); const target = new Date();
                                const daysAhead = ((optimalTime.day + 7 - now.getDay()) % 7) || 7;
                                target.setDate(now.getDate() + daysAhead);
                                target.setHours(optimalTime.hour, 0, 0, 0);
                                setForm(f => ({ ...f, date_programmation: target.toISOString().slice(0, 16) }));
                              }}>Utiliser</Button>
                          </>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                            Données insuffisantes — envoyez quelques campagnes pour obtenir une suggestion
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right — email preview */}
            <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', overflow: 'hidden', p: 2, bgcolor: '#f1f5f9', gap: 1 }}>
              <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', p: 1.5, mb: 0.5, flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, display: 'block', mb: 1 }}>
                  Aperçu boîte de réception
                </Typography>
                <Box sx={{ bgcolor: '#f8f9fa', borderRadius: 1.5, p: 1.25, display: 'flex', alignItems: 'flex-start', gap: 1.5, border: '1px solid #e9ecef' }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>G</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>Golf Huub</Typography>
                      <Typography sx={{ fontSize: 11, color: '#5f6368', flexShrink: 0 }}>maintenant</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                      {form.sujet || '(Sans objet)'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#5f6368', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                      {form.preheader || <em style={{ color: '#9aa0a6' }}>Texte de prévisualisation non défini</em>}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" justifyContent="space-between" flexShrink={0}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
                  Aperçu de l'email
                </Typography>
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Vue desktop">
                    <IconButton size="small" onClick={() => setPreviewMode('desktop')}
                      sx={{ color: previewMode === 'desktop' ? 'secondary.main' : 'text.disabled', bgcolor: previewMode === 'desktop' ? '#f5f3ff' : 'transparent' }}>
                      <MonitorIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Vue mobile (375px)">
                    <IconButton size="small" onClick={() => setPreviewMode('mobile')}
                      sx={{ color: previewMode === 'mobile' ? 'secondary.main' : 'text.disabled', bgcolor: previewMode === 'mobile' ? '#f5f3ff' : 'transparent' }}>
                      <SmartphoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', bgcolor: '#e2e8f0', borderRadius: 2, p: previewMode === 'mobile' ? 1 : 0 }}>
                <Box sx={{ width: previewMode === 'mobile' ? 375 : '100%', height: '100%', bgcolor: '#fff', borderRadius: previewMode === 'mobile' ? 2 : 0, overflow: 'hidden', boxShadow: previewMode === 'mobile' ? '0 4px 24px rgba(0,0,0,0.15)' : '0 1px 8px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                  <iframe srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;}</style></head><body>${form.contenu_html}</body></html>`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="Aperçu campagne" sandbox="allow-same-origin" />
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* BOTTOM BAR */}
      <Box sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Button startIcon={wizardStep > 0 ? <ArrowBackIcon /> : null}
          onClick={wizardStep > 0 ? handleBack : handleCancel} disabled={submitting} sx={{ color: 'text.secondary' }}>
          {wizardStep === 0 ? 'Annuler' : 'Retour'}
        </Button>
        <Box display="flex" gap={1.5}>
          {wizardStep < WIZARD_STEPS.length - 1 ? (
            <Button variant="contained" color="secondary" endIcon={<ArrowForwardIcon />} onClick={handleNext} size="large">
              Continuer
            </Button>
          ) : (
            <>
              <Button variant="outlined" startIcon={submitting ? <CircularProgress size={14} /> : <SaveIcon />}
                onClick={() => handleWizardSubmit('draft')} disabled={submitting}>
                Sauvegarder brouillon
              </Button>
              {form.send_mode === 'draft' ? null : form.send_mode === 'schedule' ? (
                <Button variant="contained" color="secondary" size="large"
                  startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <ScheduleIcon />}
                  onClick={() => handleWizardSubmit('schedule')} disabled={submitting || !form.date_programmation}>
                  Programmer l'envoi
                </Button>
              ) : (
                <Button variant="contained" color="secondary" size="large"
                  startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                  onClick={() => openChecklist('send')} disabled={submitting}>
                  Envoyer maintenant
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Template picker */}
      <TemplatePicker open={templateOpen} savedTemplates={savedTemplates}
        onClose={() => setTemplateOpen(false)} onSelect={loadTemplate} />

      {/* Checklist pré-envoi */}
      {checklistOpen && (() => {
        const items = buildChecklist();
        const criticalFails = items.filter(i => i.critical && !i.ok);
        const canSend = criticalFails.length === 0;
        return (
          <Dialog open onClose={() => setChecklistOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: canSend ? '#22c55e' : '#ef4444' }} />
              Vérification avant envoi
            </DialogTitle>
            <DialogContent>
              <List dense disablePadding>
                {items.map(item => (
                  <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {item.ok
                        ? <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                        : item.critical
                          ? <CancelIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                          : <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 18 }} />}
                    </ListItemIcon>
                    <ListItemText primary={item.label}
                      primaryTypographyProps={{ fontSize: 13, fontWeight: item.ok ? 400 : 600, color: item.ok ? 'text.primary' : (item.critical ? '#ef4444' : '#92400e') }} />
                  </ListItem>
                ))}
              </List>
              {!canSend && <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>Corrigez les points en rouge avant d'envoyer.</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setChecklistOpen(false)} sx={{ color: '#6b7280' }}>Annuler</Button>
              <Button variant="contained" disabled={!canSend || submitting}
                startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
                onClick={() => { setChecklistOpen(false); handleWizardSubmit(pendingAction); }}
                sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                Confirmer l'envoi
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* AI Drawer */}
      <AIAssistDrawer open={aiPanel} onClose={() => setAiPanel(false)}
        audienceLabel={audienceLabel} recipientCount={recipientPreview?.count} onApply={handleAIApply} />

      {/* Test email dialog */}
      <Dialog open={testEmailDialog.open} onClose={() => setTestEmailDialog((s) => ({ ...s, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon fontSize="small" sx={{ color: '#2563eb' }} />
          Envoyer un email de test
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" mb={2} lineHeight={1.6}>
            L'email sera envoyé avec le préfixe <strong>[TEST]</strong> dans l'objet.
          </Typography>
          {testEmailDialog.sent  && <Alert severity="success" sx={{ mb: 2 }}>Email envoyé — vérifiez votre boîte.</Alert>}
          {testEmailDialog.error && <Alert severity="error"   sx={{ mb: 2 }}>{testEmailDialog.error}</Alert>}
          <TextField label="Adresse email de destination" type="email" fullWidth
            value={testEmailDialog.email}
            onChange={(e) => setTestEmailDialog((s) => ({ ...s, email: e.target.value, sent: false }))}
            disabled={testEmailDialog.sending} autoFocus placeholder="vous@example.com"
            onKeyDown={(e) => { if (e.key === 'Enter' && testEmailDialog.email) handleTestSend(); }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setTestEmailDialog((s) => ({ ...s, open: false }))}>Fermer</Button>
          <Button variant="contained" onClick={handleTestSend}
            disabled={!testEmailDialog.email || testEmailDialog.sending}
            startIcon={testEmailDialog.sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}>
            {testEmailDialog.sending ? 'Envoi…' : 'Envoyer le test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
