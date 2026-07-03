import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import axios from '../api/axios';

const Birthdays = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get('/automations/birthday/today');
      setContacts(res.data.contacts || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sendAll = async () => {
    setSending(true); setError(null); setSendResult(null);
    try {
      const res = await axios.post('/automations/birthday/today/send');
      setSendResult(res.data);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally { setSending(false); }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Anniversaires du jour (Membre VIP)</Typography>
        <Button variant="contained" color="primary" onClick={sendAll} disabled={sending || contacts.length === 0}>
          {sending ? 'Envoi...' : 'Envoyer les emails'}
        </Button>
      </Box>
      {error && <Typography color="error" mb={2}>{error}</Typography>}
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Prénom</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Date de naissance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.prenom}</TableCell>
                  <TableCell>{c.nom}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.date_naissance ? new Date(c.date_naissance).toLocaleDateString() : ''}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Aucun anniversaire aujourd'hui</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {sendResult && (
        <Box mt={2}>
          <Typography>Envoyés: {sendResult.sent} / {sendResult.total} (Erreurs: {sendResult.errors})</Typography>
          {Array.isArray(sendResult.results) && sendResult.results.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sendResult.results.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Birthdays;


