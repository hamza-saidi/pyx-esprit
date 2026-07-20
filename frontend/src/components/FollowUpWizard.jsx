import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchFollowupGroups, addCampaign, sendCampaign } from '../features/campaigns/campaignsSlice';
import axios from '../api/axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, CircularProgress,
  Stepper, Step, StepLabel, Alert, Chip, Divider,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import EmailEditor from './EmailEditor';
import TemplatePicker from './TemplatePicker';

const STEPS = ['Choisir l\'audience', 'Écrire l\'email', 'Envoyer'];

const htmlTemplate = (body) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;font-size:15px;line-height:1.7"><tr><td style="padding:32px 24px">${body}</td></tr></table>`;

const GROUP_SUGGESTIONS = {
  clickers: {
    subjectPrefix: 'Suite à votre intérêt — ',
    htmlBody: htmlTemplate(`<p>Bonjour {{prenom}},</p><p>Vous avez récemment cliqué sur notre dernière communication. Nous voulions aller plus loin avec vous.</p><p><strong>[Votre message de conversion ici]</strong></p><p>Merci de votre confiance,<br>L'équipe Golf Huub</p>`),
  },
  openers: {
    subjectPrefix: 'Vous avez manqué quelque chose — ',
    htmlBody: htmlTemplate(`<p>Bonjour {{prenom}},</p><p>Nous avons remarqué que vous avez ouvert notre dernier email mais n'avez pas encore agi.</p><p>Voici une autre opportunité de <strong>[bénéfice clé]</strong>.</p><p><strong>[Votre message ici]</strong></p><p>À bientôt,<br>L'équipe Golf Huub</p>`),
  },
  non_openers: {
    subjectPrefix: '[Rappel] ',
    htmlBody: htmlTemplate(`<p>Bonjour {{prenom}},</p><p>Vous avez peut-être manqué notre dernier message. Nous vous le repartageons avec un objet différent.</p><p><strong>[Votre message ici]</strong></p><p>À bientôt,<br>L'équipe Golf Huub</p>`),
  },
  errors: {
    subjectPrefix: 'Mise à jour de vos coordonnées — ',
    htmlBody: htmlTemplate(`<p>Bonjour {{prenom}},</p><p>Nous avons tenté de vous joindre mais votre adresse semble avoir rencontré un problème technique.</p><p>Pourriez-vous nous confirmer vos coordonnées ou nous indiquer une adresse alternative ?</p><p>Merci d'avance,<br>L'équipe Golf Huub</p>`),
  },
};

const GroupCard = ({ groupKey, group, selected, onSelect }) => {
  const isSelected = selected === groupKey;
  const colors = {
    clickers: { bg: '#fff7ed', border: '#f97316', icon: '🔥', chip: '#f97316' },
    openers: { bg: '#eff6ff', border: '#3b82f6', icon: '👀', chip: '#3b82f6' },
    non_openers: { bg: '#f0fdf4', border: '#22c55e', icon: '😴', chip: '#22c55e' },
    errors: { bg: '#fef2f2', border: '#ef4444', icon: '❌', chip: '#ef4444' },
  };
  const c = colors[groupKey] || colors.non_openers; // Fallback to avoid crash

  return (
    <Box
      onClick={() => onSelect(groupKey)}
      sx={{
        flex: 1,
        minWidth: 160,
        p: 2.5,
        border: `2px solid ${isSelected ? c.border : '#e5e7eb'}`,
        borderRadius: 2,
        cursor: 'pointer',
        bgcolor: isSelected ? c.bg : '#fff',
        transition: 'all 0.18s ease',
        position: 'relative',
        '&:hover': { borderColor: c.border, bgcolor: c.bg }
      }}
    >
      {isSelected && (
        <CheckCircleOutlineIcon sx={{ position: 'absolute', top: 10, right: 10, color: c.border, fontSize: 20 }} />
      )}
      <Typography sx={{ fontSize: 32, mb: 1 }}>{c.icon}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#111827', mb: 0.5 }}>
        {group.label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: '#6b7280', mb: 1.5, lineHeight: 1.5 }}>
        {group.description}
      </Typography>
      <Chip
        label={`${group.count} contacts`}
        size="small"
        sx={{
          bgcolor: isSelected ? c.border : '#f3f4f6',
          color: isSelected ? '#fff' : '#374151',
          fontWeight: 600,
          fontSize: 12
        }}
      />
    </Box>
  );
};

const FollowUpWizard = ({ open, campaign, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [groupsData, setGroupsData] = useState(null);
  const [groupsError, setGroupsError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({ titre: '', sujet: '', contenu_html: '', sendMode: 'draft' });
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Load groups + templates when dialog opens
  useEffect(() => {
    if (open && campaign?.id) {
      setStep(0);
      setSelectedGroup(null);
      setGroupsData(null);
      setGroupsError(null);
      setSubmitError(null);
      setDone(false);
      setTemplatePickerOpen(false);
      setLoading(true);
      Promise.all([
        dispatch(fetchFollowupGroups(campaign.id)).unwrap(),
        axios.get('/templates').then(r => r.data).catch(() => []),
      ]).then(([groupData, tmplData]) => {
        setGroupsData(groupData);
        setTemplates(tmplData);
        setLoading(false);
      }).catch(err => { setGroupsError(String(err)); setLoading(false); });
    }
  }, [open, campaign?.id, dispatch]);

  // Pre-fill form when group is selected
  useEffect(() => {
    if (selectedGroup && groupsData) {
      const sug = GROUP_SUGGESTIONS[selectedGroup];
      setForm({
        titre: `${groupsData.campaign_titre} — Suivi ${groupsData.groups[selectedGroup]?.label || ''}`,
        sujet: `${sug.subjectPrefix}${groupsData.campaign_titre}`,
        contenu_html: sug.htmlBody,
        sendMode: 'draft',
      });
    }
  }, [selectedGroup, groupsData]);

  const handleNext = () => {
    if (step === 0 && !selectedGroup) return;
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const group = groupsData.groups[selectedGroup];
      const payload = {
        titre: form.titre.trim() || `Suivi — ${campaign.titre}`,
        sujet: form.sujet.trim() || `Suivi de la campagne ${campaign.titre}`,
        contenu_html: form.contenu_html,
        audience: 'custom',
        contacts_ids: group.contact_ids,
        type_campagne: 'newsletter',
        statut: 'brouillon',
      };

      const res = await dispatch(addCampaign(payload)).unwrap();
      const newId = res?.campagne?.id;

      if (form.sendMode === 'now' && newId) {
        await dispatch(sendCampaign(newId)).unwrap();
      }

      setDone(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(typeof err === 'string' ? err : (err?.message || 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (loading && step === 0 && !groupsData) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
          <CircularProgress size={36} sx={{ color: '#3b82f6' }} />
          <Typography color="text.secondary">Analyse des comportements...</Typography>
        </Box>
      );
    }

    if (groupsError) {
      return <Alert severity="error" sx={{ mt: 2 }}>{groupsError}</Alert>;
    }

    if (done) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" py={6} gap={2}>
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#22c55e' }} />
          <Typography variant="h6" fontWeight={700}>Campagne de suivi créée !</Typography>
          <Typography color="text.secondary" textAlign="center">
            {form.sendMode === 'now'
              ? 'L\'envoi a été déclenché.'
              : 'La campagne a été enregistrée en brouillon. Vous pouvez la retrouver dans la liste des campagnes.'}
          </Typography>
          <Button variant="contained" onClick={onClose} sx={{ mt: 1, bgcolor: '#111827', '&:hover': { bgcolor: '#1f2937' } }}>
            Fermer
          </Button>
        </Box>
      );
    }

    switch (step) {
      case 0:
        return (
          <Box>
            <Typography sx={{ mb: 2.5, color: '#6b7280', fontSize: 14 }}>
              Choisissez quel groupe de contacts vous voulez recibler depuis la campagne <strong>"{campaign?.titre}"</strong>.
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {groupsData && Object.entries(groupsData.groups).map(([key, group]) => (
                <GroupCard
                  key={key}
                  groupKey={key}
                  group={group}
                  selected={selectedGroup}
                  onSelect={setSelectedGroup}
                />
              ))}
            </Box>
            {selectedGroup && groupsData && (
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Typography sx={{ fontSize: 13, color: '#374151' }}>
                  <strong>{groupsData.groups[selectedGroup].count} contacts</strong> recevront cette campagne de suivi.
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box display="flex" flexDirection="column" gap={2} sx={{ height: '100%' }}>
            <Box display="flex" gap={2} alignItems="flex-start">
              <TextField
                label="Titre (interne)"
                value={form.titre}
                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                fullWidth
                size="small"
                helperText="Visible uniquement par vous"
              />
              <TextField
                label="Objet de l'email"
                value={form.sujet}
                onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
                fullWidth
                size="small"
                helperText="Ce que vos contacts verront dans leur boîte"
              />
              <Tooltip title="Charger un modèle">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CollectionsBookmarkIcon fontSize="small" />}
                  onClick={() => setTemplatePickerOpen(true)}
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0, height: 40, mt: 0.25 }}
                >
                  Modèle
                </Button>
              </Tooltip>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <EmailEditor
                value={form.contenu_html}
                onChange={html => setForm(f => ({ ...f, contenu_html: html }))}
                canvasHeight="calc(85vh - 320px)"
              />
            </Box>

            <TemplatePicker
              open={templatePickerOpen}
              savedTemplates={templates}
              onClose={() => setTemplatePickerOpen(false)}
              onSelect={html => setForm(f => ({ ...f, contenu_html: html }))}
            />
          </Box>
        );

      case 2:
        return (
          <Box display="flex" flexDirection="column" gap={2.5}>
            <Box sx={{ p: 2.5, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Récapitulatif</Typography>
              <Typography fontSize={13} color="text.secondary"><strong>Audience :</strong> {groupsData?.groups[selectedGroup]?.label} ({groupsData?.groups[selectedGroup]?.count} contacts)</Typography>
              <Typography fontSize={13} color="text.secondary"><strong>Objet :</strong> {form.sujet}</Typography>
              <Typography fontSize={13} color="text.secondary"><strong>Titre :</strong> {form.titre}</Typography>
            </Box>

            <Divider />

            <FormControl size="small" fullWidth>
              <InputLabel>Mode d'envoi</InputLabel>
              <Select
                value={form.sendMode}
                label="Mode d'envoi"
                onChange={e => setForm(f => ({ ...f, sendMode: e.target.value }))}
              >
                <MenuItem value="draft">Enregistrer en brouillon</MenuItem>
                <MenuItem value="now">Envoyer maintenant</MenuItem>
              </Select>
            </FormControl>

            {submitError && <Alert severity="error">{submitError}</Alert>}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={done ? onClose : undefined} maxWidth="xl" fullWidth PaperProps={{
      sx: { borderRadius: 3, overflow: 'hidden', height: step === 1 ? '90vh' : 'auto' }
    }}>
      <DialogTitle sx={{ bgcolor: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ReplayIcon sx={{ color: '#38bdf8' }} />
          <Typography fontWeight={700} fontSize={16}>Créer une campagne de suivi</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#fff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {!done && (
        <Box sx={{ px: 3, pt: 2.5, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <Stepper activeStep={step} sx={{ pb: 2 }}>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel sx={{
                  '& .MuiStepLabel-label': { fontSize: 13, fontWeight: step === STEPS.indexOf(label) ? 600 : 400 }
                }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      <DialogContent sx={{ py: 3, px: 3, minHeight: 300, display: step === 1 ? 'flex' : 'block', flexDirection: 'column', overflow: step === 1 ? 'hidden' : 'auto' }}>
        {renderStep()}
      </DialogContent>

      {!done && !groupsError && (
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f3f4f6', bgcolor: '#fafafa', justifyContent: 'space-between' }}>
          <Button
            onClick={step === 0 ? onClose : handleBack}
            disabled={loading}
            sx={{ color: '#6b7280' }}
          >
            {step === 0 ? 'Annuler' : 'Retour'}
          </Button>
          {step < 2 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading || (step === 0 && !selectedGroup) || (step === 0 && !groupsData)}
              sx={{ bgcolor: '#111827', '&:hover': { bgcolor: '#1f2937' }, px: 3 }}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, px: 3 }}
            >
              {form.sendMode === 'now' ? 'Créer et envoyer' : 'Créer en brouillon'}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default FollowUpWizard;
