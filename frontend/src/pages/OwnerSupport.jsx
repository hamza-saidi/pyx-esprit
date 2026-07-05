import React, { useState } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Avatar, Divider, TextField, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';

const TICKETS = [
  { id: 'T-041', tenant: 'Demo Corp', avatar: 'D', sujet: "Problème d'import CSV — encodage UTF-8", priorite: 'haute', statut: 'ouvert', date: '2026-07-04', categorie: 'Import' },
  { id: 'T-040', tenant: 'Demo Corp', avatar: 'D', sujet: 'Email de campagne non reçu par certains contacts', priorite: 'haute', statut: 'en_cours', date: '2026-07-03', categorie: 'Email' },
  { id: 'T-039', tenant: 'Demo Corp', avatar: 'D', sujet: 'Comment configurer le sender domain ?', priorite: 'normale', statut: 'resolu', date: '2026-07-02', categorie: 'Config' },
  { id: 'T-038', tenant: 'Demo Corp', avatar: 'D', sujet: "Taux d'ouverture ne s'actualise plus", priorite: 'normale', statut: 'resolu', date: '2026-06-29', categorie: 'Stats' },
  { id: 'T-037', tenant: 'Demo Corp', avatar: 'D', sujet: 'Demande ajout utilisateur supplémentaire', priorite: 'basse', statut: 'resolu', date: '2026-06-27', categorie: 'Compte' },
];

const PRIORITE_COLORS = { haute: '#ef4444', normale: '#f59e0b', basse: '#10b981' };
const STATUT_COLORS = { ouvert: '#ef4444', en_cours: '#f59e0b', resolu: '#10b981' };
const STATUT_LABELS = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu' };
const PRIORITE_LABELS = { haute: 'Haute', normale: 'Normale', basse: 'Basse' };

export default function OwnerSupport() {
  const [search, setSearch] = useState('');

  const filtered = TICKETS.filter((t) =>
    !search || t.sujet.toLowerCase().includes(search.toLowerCase()) || t.tenant.toLowerCase().includes(search.toLowerCase())
  );

  const open = TICKETS.filter((t) => t.statut === 'ouvert').length;
  const inProgress = TICKETS.filter((t) => t.statut === 'en_cours').length;

  return (
    <Box>
      {/* Summary chips */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        {[
          { label: `${open} ouvert${open !== 1 ? 's' : ''}`, color: '#ef4444' },
          { label: `${inProgress} en cours`, color: '#f59e0b' },
          { label: `${TICKETS.filter((t) => t.statut === 'resolu').length} résolus`, color: '#10b981' },
        ].map((s) => (
          <Chip key={s.label} label={s.label} size="small"
            sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 700, fontSize: 12, height: 26 }} />
        ))}
      </Box>

      <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography fontWeight={700} sx={{ color: '#0f172a' }}>Tickets support</Typography>
            <Typography variant="caption" color="text.secondary">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>,
              sx: { fontSize: 13, borderRadius: 1.5 },
            }}
            sx={{ minWidth: 220 }}
          />
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                {['#', 'Tenant', 'Sujet', 'Catégorie', 'Priorité', 'Statut', 'Date'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    <HeadsetMicIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.35 }} />
                    Aucun ticket
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{t.id}</Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ bgcolor: '#0ea5e9', width: 26, height: 26, fontSize: 11, fontWeight: 700 }}>{t.avatar}</Avatar>
                      <Typography variant="body2" fontWeight={500}>{t.tenant}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                      {t.sujet}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.categorie} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600, height: 20, fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITE_LABELS[t.priorite]}
                      size="small"
                      sx={{ bgcolor: `${PRIORITE_COLORS[t.priorite]}18`, color: PRIORITE_COLORS[t.priorite], fontWeight: 700, height: 22, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUT_LABELS[t.statut]}
                      size="small"
                      sx={{ bgcolor: `${STATUT_COLORS[t.statut]}18`, color: STATUT_COLORS[t.statut], fontWeight: 700, height: 22, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{t.date}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
