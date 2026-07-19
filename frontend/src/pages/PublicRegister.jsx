import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel, 
  Alert,
  IconButton
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import api from '../api/axios';

const translations = {
  en: {
    title: 'Contact Registration',
    subtitle: 'Please fill out the form',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'E-Mail',
    phone: 'Phone',
    gender: 'Gender',
    genderNotSpecified: 'Not specified',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    submit: 'Submit',
    success: 'Registration successful! Thank you.',
    error: 'An error occurred. Please try again.',
    required: 'This field is required'
  },
  de: {
    title: 'Kontakt Registrierung',
    subtitle: 'Bitte füllen Sie das Formular aus',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    gender: 'Geschlecht',
    genderNotSpecified: 'Nicht angegeben',
    male: 'Männlich',
    female: 'Weiblich',
    other: 'Andere',
    submit: 'Absenden',
    success: 'Registrierung erfolgreich! Vielen Dank.',
    error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    required: 'Dieses Feld ist erforderlich'
  }
};

const DEFAULT_BRAND_COLOR = '#1976d2';

function hexToRgba(hex, alpha) {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  if (Number.isNaN(bigint)) return hexToRgba(DEFAULT_BRAND_COLOR, alpha);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex, amount = 0.15) {
  const h = (hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const bigint = parseInt(full, 16);
  if (Number.isNaN(bigint)) return darken(DEFAULT_BRAND_COLOR, amount);
  const r = Math.round(((bigint >> 16) & 255) * (1 - amount));
  const g = Math.round(((bigint >> 8) & 255) * (1 - amount));
  const b = Math.round((bigint & 255) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function PublicRegister() {
  const [language, setLanguage] = useState('de'); // Default to German
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [brand, setBrand] = useState({ nom: null, logo_url: null, couleur_principale: null });
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    sexe: '',
  });

  const t = translations[language];
  const brandColor = brand.couleur_principale || DEFAULT_BRAND_COLOR;
  const brandColorDark = darken(brandColor);

  useEffect(() => {
    api.get('/contacts/public/branding')
      .then(r => setBrand(r.data || {}))
      .catch(() => {});
  }, []);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'de' : 'en');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setSuccess(''); 
    setLoading(true);
    
    try {
      await api.post('/contacts/public', {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        sexe: form.sexe,
        actif: true
      });
      setSuccess(t.success);
      // Reset form
      setForm({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        sexe: '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            position: 'relative'
          }}
        >
          {/* Language Selector */}
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <IconButton
              onClick={toggleLanguage}
              sx={{
                color: brandColor,
                '&:hover': { bgcolor: hexToRgba(brandColor, 0.08) }
              }}
              aria-label="Change language"
            >
              <LanguageIcon />
            </IconButton>
          </Box>

          {brand.logo_url && (
            <Box
              component="img"
              src={brand.logo_url}
              alt={brand.nom || ''}
              sx={{ maxHeight: 64, maxWidth: '60%', display: 'block', mb: 2 }}
            />
          )}

          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: brandColor,
              fontWeight: 600,
              mb: 1
            }}
          >
            {t.title}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 3 }}
          >
            {t.subtitle}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField 
              fullWidth 
              label={t.firstName} 
              name="prenom" 
              value={form.prenom} 
              onChange={handleChange} 
              margin="normal" 
              required 
            />
            <TextField 
              fullWidth 
              label={t.lastName} 
              name="nom" 
              value={form.nom} 
              onChange={handleChange} 
              margin="normal" 
              required 
            />
            <TextField 
              fullWidth 
              label={t.email} 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              margin="normal" 
              required 
            />
            <TextField 
              fullWidth 
              label={t.phone} 
              name="telephone" 
              value={form.telephone} 
              onChange={handleChange} 
              margin="normal" 
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>{t.gender}</InputLabel>
              <Select 
                label={t.gender} 
                name="sexe" 
                value={form.sexe} 
                onChange={handleChange}
              >
                <MenuItem value="">{t.genderNotSpecified}</MenuItem>
                <MenuItem value="Homme">{t.male}</MenuItem>
                <MenuItem value="Femme">{t.female}</MenuItem>
                <MenuItem value="Autre">{t.other}</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !form.prenom.trim() || !form.nom.trim() || !form.email.trim()}
              sx={{
                mt: 3,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                bgcolor: brandColor,
                '&:hover': { bgcolor: brandColorDark }
              }}
            >
              {loading ? '...' : t.submit}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
