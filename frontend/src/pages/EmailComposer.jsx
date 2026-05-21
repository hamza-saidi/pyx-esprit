import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Grid, TextField, Button, Typography, Chip, Checkbox, Alert, FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import Autocomplete from '@mui/material/Autocomplete';
import EmailEditor from '../components/EmailEditor';
import axios from '../api/axios';
import { PRO_TEMPLATES } from '../data/proTemplates';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';
import PublicIcon from '@mui/icons-material/Public';
import CloseIcon from '@mui/icons-material/Close';
import { Card, CardMedia, CardContent, CardActions, Tabs, Tab } from '@mui/material';

const defaultSignature = ``;

const normalizeIdList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
  }
  if (typeof value === 'number') {
    return [value];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => Number(v))
          .filter((v) => !Number.isNaN(v));
      }
    } catch {
      return trimmed
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((v) => !Number.isNaN(v));
    }
  }
  if (value && typeof value === 'object') {
    const arr = Array.isArray(value) ? value : Object.values(value);
    return arr
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
  }
  return [];
};

const stripSignatureFromHtml = (htmlContent, signatureContent) => {
  if (!htmlContent) return '';
  if (!signatureContent) return htmlContent;
  const trimmedSignature = signatureContent.trim();
  if (!trimmedSignature) return htmlContent;
  const trimmedHtml = htmlContent.trimEnd();
  if (trimmedHtml.endsWith(trimmedSignature)) {
    return trimmedHtml.slice(0, trimmedHtml.length - trimmedSignature.length).trimEnd();
  }
  return htmlContent;
};

const EmailComposer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search || '');
  const campagneId = searchParams.get('campagneId');
  const campagneMode = searchParams.get('campagneMode') === '1' || searchParams.get('campagneMode') === 'true' || !!campagneId;
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<p>Bonjour,</p>');
  const [signature, setSignature] = useState(defaultSignature);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [mailerAttachments, setMailerAttachments] = useState([]);
  const [campaignAttachments, setCampaignAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  const [directContactIds, setDirectContactIds] = useState([]); // Pour les follow-ups
  const [recipientCount, setRecipientCount] = useState(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campagneLoading, setCampagneLoading] = useState(false);
  const [campaignAction, setCampaignAction] = useState('draft'); // draft | send_now | schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [campagneParams, setCampagneParams] = useState({});
  const [editorKey, setEditorKey] = useState(0);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const fileRef = useRef(null);
  const [tags, setTags] = useState([]);
  const [segments, setSegments] = useState([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState(0);
  const [savedTemplates, setSavedTemplates] = useState([]);

  useEffect(() => { (async () => { try { const res = await axios.get('/tags'); setTags(res.data || []); } catch {} })(); }, []);
  useEffect(() => { (async () => { try { const res = await axios.get('/segments'); setSegments(res.data || []); } catch {} })(); }, []);
  useEffect(() => { (async () => { try { const res = await axios.get('/templates'); setSavedTemplates(res.data || []); } catch {} })(); }, []);
  const sortedTags = useMemo(() => {
    return [...(tags || [])].sort((a, b) =>
      (a?.nom || '').localeCompare(b?.nom || '', 'fr', { sensitivity: 'base' })
    );
  }, [tags]);

  const selectedTagObjects = useMemo(() => {
    const ids = new Set(selectedTagIds || []);
    return sortedTags.filter((tag) => ids.has(tag.id));
  }, [sortedTags, selectedTagIds]);

  // Preselect tags, segment and contactIds (follow-up) from query params
  // Preselect tags, segment and contactIds (follow-up) from query params
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const tagIdsParam = params.get('tagIds');
      const segmentIdParam = params.get('segmentId');
      const contactIdsParam = params.get('contactIds');
      
      if (tagIdsParam) {
        const ids = tagIdsParam.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n));
        if (ids.length) setSelectedTagIds(ids);
      }
      
      if (segmentIdParam) {
        const segmentId = Number(segmentIdParam);
        if (!Number.isNaN(segmentId)) setSelectedSegmentId(segmentId);
      }

      if (contactIdsParam) {
        const ids = contactIdsParam.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n));
        if (ids.length) {
          setDirectContactIds(ids);
          setRecipientCount(ids.length);
        }
      }
    } catch {}
  }, [location.search]);

  // Automatic recipient recalculation
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasCriteria = (selectedTagIds || []).length > 0 || selectedSegmentId || (directContactIds || []).length > 0;
      if (!hasCriteria) {
        setRecipientCount(0);
        return;
      }
      try {
        const r = await axios.post('/campagnes/calculer-destinataires', {
          tags_ids: selectedTagIds || [],
          segment_id: selectedSegmentId || undefined,
          contacts_ids: directContactIds.length > 0 ? directContactIds : undefined,
          audience: 'custom'
        });
        setRecipientCount(r.data?.nombre_destinataires || 0);
      } catch (e) {
        console.error('Erreur calcul automatique destinataires:', e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedTagIds, selectedSegmentId, directContactIds]);


  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('/templates/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.url;
  };


  const handleAttachFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (campagneMode) {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file, file.name);
        try {
          setUploadingAttachment(true);
          console.log('[FRONTEND] Uploading attachment:', file.name, file.size, 'bytes');
          const res = await axios.post('/campagnes/attachments', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          console.log('[FRONTEND] Attachment uploaded successfully:', res.data);
          setCampaignAttachments((prev) => {
            const updated = [...prev, res.data];
            console.log('[FRONTEND] Campaign attachments updated:', updated);
            return updated;
          });
        } catch (err) {
          console.error('[FRONTEND] Error uploading attachment:', err);
          alert(err?.response?.data?.message || 'Erreur lors du téléversement de la pièce jointe');
        } finally {
          setUploadingAttachment(false);
        }
      }
    } else {
      setMailerAttachments((prev) => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeAttachment = (name) => setMailerAttachments(prev => prev.filter(f => f.name !== name));
  const removeCampaignAttachment = (id) => setCampaignAttachments(prev => prev.filter(att => att.id !== id));

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await axios.get(`/campagnes/attachments/${attachment.id}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: attachment.mimeType || response.headers['content-type'] || 'application/octet-stream'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name || 'piece_jointe';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data?.message || 'Téléchargement impossible');
    }
  };

  // Dynamically register image resize (Quill v2) once on mount, and only render editor after ready
  // no special mount needed for TinyMCE

  // --- Auto-save and Draft Restoration Logic ---
  const getDraftKey = () => campagneId ? `email_draft_${campagneId}` : 'email_draft_new';

  // Save draft on change
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't save if content is default or empty
      if (!html || html === '<p>Bonjour,</p>') return; 
      
      const draft = {
        subject,
        html,
        campaignTitle,
        selectedTagIds,
        selectedSegmentId,
        signature,
        campaignAction,
        scheduleDate,
        timestamp: Date.now()
      };
      
      localStorage.setItem(getDraftKey(), JSON.stringify(draft));
      console.log('[AUTOSAVE] Draft saved to localStorage');
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [subject, html, campaignTitle, selectedTagIds, selectedSegmentId, signature, campaignAction, scheduleDate]);

  // Restore draft on mount
  useEffect(() => {
    const savedDraftStr = localStorage.getItem(getDraftKey());
    if (savedDraftStr) {
      try {
        const draft = JSON.parse(savedDraftStr);
        // Only offer restoration if the draft is relatively recent (e.g. within 24 hours) or if it's a new campaign
        const isRecent = (Date.now() - draft.timestamp) < 24 * 60 * 60 * 1000;
        
        if (isRecent || !campagneId) {
          // Delaying the confirm slightly to ensure other initializations have run
          setTimeout(() => {
            const confirmRestore = window.confirm('Un brouillon enregistré localement a été trouvé. Voulez-vous le restaurer ?');
            if (confirmRestore) {
              if (draft.subject) setSubject(draft.subject);
              if (draft.html) setHtml(draft.html);
              if (draft.campaignTitle) setCampaignTitle(draft.campaignTitle);
              if (draft.selectedTagIds) setSelectedTagIds(draft.selectedTagIds);
              if (draft.selectedSegmentId) setSelectedSegmentId(draft.selectedSegmentId);
              if (draft.signature) setSignature(draft.signature);
              if (draft.campaignAction) setCampaignAction(draft.campaignAction);
              if (draft.scheduleDate) setScheduleDate(draft.scheduleDate);
              setEditorKey(k => k + 1); // Refresh editor with new content
              console.log('[AUTOSAVE] Draft restored');
            } else {
              localStorage.removeItem(getDraftKey());
            }
          }, 500);
        }
      } catch (e) {
        console.error('[AUTOSAVE] Error restoring draft:', e);
      }
    }
  }, [campagneId, campagneMode]); // Re-run if ID or Mode changes

  const clearDraft = () => {
    localStorage.removeItem(getDraftKey());
    console.log('[AUTOSAVE] Draft cleared');
  };

  useEffect(() => {
    if (!campagneMode) {
      setCampaignTitle('');
      setSelectedTagIds([]);
      setCampaignAction('draft');
      setScheduleDate('');
      setCampagneParams({});
      setSignature(defaultSignature);
      setHtml('<p>Bonjour,</p>');
      setEditorKey((key) => key + 1);
      setCampaignAttachments([]);
    }
  }, [campagneMode, location.search]);

  useEffect(() => {
    if (!campagneId) return;
    setCampagneLoading(true);
    (async () => {
      try {
        const res = await axios.get(`/campagnes/${campagneId}`);
        const data = res.data || {};
        const params = data.parametres || {};
        const loadedSignature = params.signature_html || defaultSignature;
        setCampagneParams(params);
        setCampaignAttachments(Array.isArray(params.attachments) ? params.attachments : []);
        setSignature(loadedSignature);
        setCampaignTitle(data.titre || '');
        setSubject(data.sujet || '');
        const baseHtml = stripSignatureFromHtml(data.contenu_html || '<p>Bonjour,</p>', loadedSignature);
        setHtml(baseHtml || '<p>Bonjour,</p>');
        setEditorKey((key) => key + 1);
        if (data.date_programmation) {
          setCampaignAction('schedule');
          try {
            setScheduleDate(new Date(data.date_programmation).toISOString().slice(0, 16));
          } catch {
            setScheduleDate('');
          }
        } else {
          setCampaignAction('draft');
          setScheduleDate('');
        }
        const tagValues = normalizeIdList(data.tags_ids);
        setSelectedTagIds(tagValues);
        setSelectedSegmentId(data.segment_id || null);
      } catch (e) {
        alert(e?.response?.data?.message || 'Erreur lors du chargement de la campagne');
      } finally {
        setCampagneLoading(false);
      }
    })();
  }, [campagneId]);

  const handleSend = async () => {
    try {
      setSending(true);
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('html', html);
      formData.append('signatureHtml', signature);
      mailerAttachments.forEach((f) => formData.append('attachments', f, f.name));
      
      if (!(selectedTagIds || []).length && !selectedSegmentId && !(directContactIds || []).length) {
        alert('Sélectionnez au moins un tag, un segment ou des contacts pour le follow-up.');
        setSending(false);
        return;
      }

      (selectedTagIds || []).forEach(id => formData.append('tagIds', String(id)));
      if (selectedSegmentId) formData.append('segment_id', String(selectedSegmentId));
      if (directContactIds.length > 0) {
        directContactIds.forEach(id => formData.append('contacts_ids', String(id)));
      }
      
      const res = await axios.post('/mailer/send-by-tags', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (res.data?.success) {
        const msg = res.data.total ? `Envoyés: ${res.data.processed}/${res.data.total} (batches=${res.data.batches})` : 'Email envoyé';
        alert(msg);
        clearDraft();
      } else {
        alert('Erreur envoi');
      }
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Erreur envoi');
    } finally {
      setSending(false);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      setSending(true);
      const editorHtmlWithoutSig = stripSignatureFromHtml(html || '', signature);
      const hasContent = editorHtmlWithoutSig && editorHtmlWithoutSig.replace(/<[^>]*>/g, '').trim().length > 0;
      const baseHtml = hasContent ? editorHtmlWithoutSig : '<p>Contenu email</p>';
      const renderedHtml = `${baseHtml}${signature || ''}`;

      const payload = {
        titre: (campaignTitle || subject || '').trim() || 'Campagne',
        sujet: subject.trim() || undefined,
        contenu_html: renderedHtml,
        type_campagne: 'newsletter',
        tags_ids: selectedTagIds || [],
        segment_id: selectedSegmentId || undefined,
        contacts_ids: directContactIds.length > 0 ? directContactIds : undefined,
        audience: directContactIds.length > 0 ? 'custom' : 'custom',
        statut: campaignAction === 'schedule' ? 'programmée' : 'brouillon',
        date_programmation: null,
      };

      const nextParams = { ...(campagneParams || {}) };
      delete nextParams.direct_emails;
      nextParams.signature_html = signature;
      nextParams.attachments = campaignAttachments;
      console.log('[FRONTEND] Saving campaign with attachments:', {
        count: campaignAttachments.length,
        attachments: campaignAttachments
      });
      payload.parametres = nextParams;

      if (campaignAction === 'schedule') {
        if (!scheduleDate) {
          alert('Veuillez choisir une date/heure pour programmer la campagne.');
          setSending(false);
          return;
        }
        const dateValue = new Date(scheduleDate);
        if (Number.isNaN(dateValue.getTime()) || dateValue <= new Date()) {
          alert('La date programmée doit être valide et future.');
          setSending(false);
          return;
        }
        payload.statut = 'programmée';
        payload.date_programmation = dateValue.toISOString();
      }

      if (campaignAction === 'send_now') {
        const hasRecipients = (selectedTagIds || []).length > 0 || selectedSegmentId || (directContactIds || []).length > 0;
        if (!hasRecipients) {
          alert('Sélectionnez une audience (tags, segment ou contacts de suivi) avant d\'envoyer.');
          setSending(false);
          return;
        }
      }
      let res;
      if (campagneId) {
        res = await axios.put(`/campagnes/${campagneId}`, payload);
      } else {
        res = await axios.post('/campagnes', payload);
      }

      const savedId = res?.data?.campagne?.id || campagneId || res?.data?.id;

      if (campaignAction === 'send_now' && savedId) {
        try {
          await axios.post(`/campagnes/${savedId}/envoyer`);
          alert('Campagne enregistrée et envoi immédiat déclenché.');
        } catch (sendErr) {
          alert(sendErr?.response?.data?.message || 'Campagne sauvegardée mais l\'envoi automatique a échoué.');
        }
      } else if (campaignAction === 'schedule') {
        alert(res.data?.message || 'Campagne programmée avec succès.');
      } else {
        alert(res.data?.message || (campagneId ? 'Campagne mise à jour' : 'Campagne créée'));
      }
      clearDraft();
      navigate('/campagnes');
    } catch (e) {
      alert(e?.response?.data?.message || 'Erreur lors de la sauvegarde de la campagne');
    } finally {
      setSending(false);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadTemplate = (templateHtml) => {
    if (html && html !== '<p>Bonjour,</p>') {
      if (!window.confirm('Ceci remplacera votre contenu actuel. Continuer ?')) return;
    }
    setHtml(templateHtml);
    setEditorKey(k => k + 1);
    setTemplateOpen(false);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F5F7F9' }}>
      {campagneMode && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 0, 
            border: '2px solid #3b3f44', 
            bgcolor: '#F0F7FF', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', color: '#3b3f44', fontWeight: 700 }}>Campaign Mode</Typography>
            <Typography variant="body2" color="text.secondary">
              Editing: <strong>{campaignTitle || 'New Campaign'}</strong>
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/campagnes')}
            sx={{ borderColor: '#3b3f44', color: '#3b3f44', '&:hover': { bgcolor: 'rgba(59, 63, 68, 0.05)' } }}
          >
            Back to Campaigns
          </Button>
        </Paper>
      )}
      <Typography variant="h3" sx={{ mb: 4, fontFamily: 'Georgia, serif', color: '#3b3f44', fontWeight: 700 }}>
        Email Composer
      </Typography>
      <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 0, border: '1px solid #bfc9cf', bgcolor: '#FFFFFF' }}>
        <Grid container spacing={2} alignItems="center">
          {campagneMode && (
            <Grid item xs={12} md={6}>
              <TextField
                label={<Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 700, color: '#241C15' }}>Campaign Name *</Typography>}
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                fullWidth
                required
                variant="standard"
                placeholder="e.g., Weekly Tournament Update"
                helperText="Internal reference only"
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              label={<Typography sx={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>Subject</Typography>}
              value={subject}
              onChange={(e)=>setSubject(e.target.value)}
              fullWidth
              variant="outlined"
            />
          </Grid>
          {/* Follow-up banner when contactIds are pre-filled */}
          {directContactIds.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="info" icon={searchParams.get('isFollowUp') === '1' ? "🔁" : "👥"} sx={{ borderRadius: 1 }}>
                {searchParams.get('isFollowUp') === '1' ? (
                  <>
                    <strong>Mode Follow-up :</strong> Cette campagne sera envoyée aux{' '}
                    <strong>{directContactIds.length} contact(s)</strong> qui n'ont pas ouvert la campagne précédente.
                  </>
                ) : (
                  <>
                    <strong>Sélection Personnalisée :</strong> Cette campagne sera envoyée aux{' '}
                    <strong>{directContactIds.length} contact(s)</strong> sélectionnés manuellement.
                  </>
                )}
                <Button size="small" sx={{ ml: 2 }} onClick={() => setDirectContactIds([])}>
                  Annuler la sélection
                </Button>
              </Alert>
            </Grid>
          )}
          {/* Removed Recipients TextField */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Typography variant="h6" sx={{ fontFamily: 'Georgia, serif', mr: 1 }}>Ciblage Audience :</Typography>
              {/* Removed sendByTags Checkbox and its label */}
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={sortedTags}
                getOptionLabel={(o) => o?.nom || ''}
                value={selectedTagObjects}
                onChange={(_, v) => setSelectedTagIds((v || []).map(x => x.id))}
                renderInput={(params) => <TextField {...params} label="Tags cibles" size="small" />}
                sx={{ minWidth: 360 }}
              />
              <Autocomplete
                options={segments || []}
                getOptionLabel={(o) => o?.nom || ''}
                value={segments.find(s => s.id === selectedSegmentId) || null}
                onChange={(_, v) => setSelectedSegmentId(v?.id || null)}
                renderInput={(params) => <TextField {...params} label="Segment (optionnel)" size="small" />}
                sx={{ minWidth: 280 }}
              />
              <Button size="small" variant="outlined" onClick={async()=>{
                try {
                  // Simplified recalculate logic, removed direct_emails
                  if ((selectedTagIds || []).length === 0 && !selectedSegmentId && (directContactIds || []).length === 0) {
                    setRecipientCount(0);
                    return;
                  }
                  const r = await axios.post('/campagnes/calculer-destinataires', {
                    tags_ids: selectedTagIds || [],
                    segment_id: selectedSegmentId || undefined,
                    contacts_ids: directContactIds.length > 0 ? directContactIds : undefined,
                    audience: 'custom'
                  });
                  setRecipientCount(r.data?.nombre_destinataires || 0);
                } catch (e) {
                  console.error('Erreur calcul destinataires:', e);
                  setRecipientCount(null);
                }
              }}>Recalculate</Button>
              {recipientCount !== null && (
                <Chip
                  label={`${recipientCount} destinataires`}
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button size="large" variant="contained" 
                onClick={campagneMode ? handleSaveCampaign : handleSend}
                disabled={
                  sending ||
                  (campagneMode && (campagneLoading || campaignTitle.trim().length < 3)) ||
                  !html || html.trim() === '<p>Bonjour,</p>' ||
                  ((selectedTagIds || []).length === 0 && !selectedSegmentId && directContactIds.length === 0)
                }
                sx={{ 
                  px: 6, 
                  py: 1.5,
                  bgcolor: '#3b3f44', 
                  color: '#FFFFFF', 
                  borderRadius: 0,
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#2d3034' },
                  '&.Mui-disabled': { bgcolor: '#bfc9cf' }
                }}
              >
                {campagneMode ? (campagneId ? 'Update Campaign' : 'Save Campaign') : 'Send Email'}
              </Button>
              <Button size="medium" variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setTemplateOpen(true)} sx={{ color: 'primary.main', borderColor: 'primary.main' }}>Load Template</Button>
              <Button size="medium" variant="outlined" onClick={()=>fileRef.current?.click()}>Add Attachments</Button>
              <Button
                size="medium"
                variant="outlined"
                onClick={() => setPreview(p => !p)}
              >
                {preview ? 'Back to Editor' : 'Preview'}
              </Button>

              {preview && (
                <Button
                  size="medium"
                  variant={showMobilePreview ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setShowMobilePreview(!showMobilePreview)}
                >
                  {showMobilePreview ? 'Desktop View' : 'Mobile View'}
                </Button>
              )}
            </Box>
            <input type="file" ref={fileRef} style={{ display: 'none' }} multiple onChange={handleAttachFiles} />
          </Grid>
        </Grid>
      </Paper>

      {campagneMode && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Mode d'enregistrement
          </Typography>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={campaignAction}
              label="Action"
              onChange={(e) => setCampaignAction(e.target.value)}
            >
              <MenuItem value="draft">Enregistrer comme brouillon</MenuItem>
              <MenuItem value="send_now">Enregistrer & envoyer maintenant</MenuItem>
              <MenuItem value="schedule">Programmer l'envoi</MenuItem>
            </Select>
          </FormControl>
          {campaignAction === 'schedule' && (
          <TextField
            sx={{ mt: 2, maxWidth: { xs: '100%', sm: 420 } }}
            label="Date/heure d'envoi"
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Choisissez une date future"
            fullWidth
          />
          )}
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        {campagneLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Chargement des informations de la campagne...
          </Alert>
        )}
        {!preview ? (
          <EmailEditor
            key={editorKey}
            value={html}
            onChange={(newHtml) => setHtml(newHtml)}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              p: 2,
              minHeight: 360,
              bgcolor: '#F6F6F6'
            }}
          >
            <Box
              sx={{
                width: showMobilePreview ? '375px' : '100%',
                bgcolor: 'white',
                boxShadow: showMobilePreview ? '0 0 20px rgba(0,0,0,0.1)' : 'none',
                transition: 'width 0.3s ease',
                p: 3,
                minHeight: 500,
                border: '1px solid #D9D9D9'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: `${stripSignatureFromHtml(html || '', signature)}${signature || ''}` }} />
            </Box>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Signature</Typography>
        <TextField multiline rows={4} fullWidth value={signature} onChange={(e)=>setSignature(e.target.value)} />
      </Paper>

      {(campagneMode ? campaignAttachments.length : mailerAttachments.length) > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Pièces jointes</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(campagneMode ? campaignAttachments : mailerAttachments).map((item) => {
              const label = item.name || item.filename || item.id;
              return (
                <Box
                  key={(item.id || item.name) + (item.size || '')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    {item.size && (
                      <Typography variant="caption" color="text.secondary">
                        {(item.size / 1024).toFixed(1)} Ko
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    {campagneMode && (
                      <Tooltip title="Télécharger">
                        <IconButton size="small" onClick={() => handleDownloadAttachment(item)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          campagneMode ? removeCampaignAttachment(item.id) : removeAttachment(item.name)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Choisir un modèle d'email</Typography>
          <IconButton onClick={() => setTemplateOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 500, bgcolor: '#f8fafc' }}>
          <Tabs value={templateTab} onChange={(e, v) => setTemplateTab(v)} sx={{ mb: 3 }}>
            <Tab icon={<PublicIcon />} iconPosition="start" label="Bibliothèque Premium" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Mes Modèles" />
          </Tabs>

          <Grid container spacing={3}>
            {templateTab === 0 ? (
              PRO_TEMPLATES.map(pt => (
                <Grid item xs={12} sm={6} md={4} key={pt.id}>
                  <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia component="img" height="140" image={pt.thumbnail} />
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{pt.nom}</Typography>
                      <Typography variant="body2" color="text.secondary">{pt.description}</Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2 }}>
                      <Button fullWidth variant="contained" onClick={() => loadTemplate(pt.contenu_html)}>Utiliser ce modèle</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            ) : (
              savedTemplates.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center', width: '100%' }}>
                  <Typography color="text.secondary">Aucun modèle enregistré trouvé.</Typography>
                </Box>
              ) : (
                savedTemplates.map(st => (
                  <Grid item xs={12} sm={6} md={4} key={st.id}>
                    <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ height: 140, bgcolor: '#f1f5f9', overflow: 'hidden', p: 1 }}>
                         <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%' }} dangerouslySetInnerHTML={{ __html: st.contenu_html }} />
                      </Box>
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>{st.nom}</Typography>
                      </CardContent>
                      <CardActions sx={{ p: 2 }}>
                        <Button fullWidth variant="contained" onClick={() => loadTemplate(st.contenu_html)}>Utiliser</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {uploadingAttachment && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Téléversement de la pièce jointe...
        </Typography>
      )}
    </Box>
  );
};

export default EmailComposer;


