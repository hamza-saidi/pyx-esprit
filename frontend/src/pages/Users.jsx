import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, addUser, deleteUser } from '../features/users/usersSlice';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const Users = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.users);
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', mot_de_passe: '', role: 'user' });
  const [formError, setFormError] = useState('');

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  const handleOpen = () => {
    setForm({ nom: '', email: '', mot_de_passe: '', role: 'user' });
    setFormError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormError('');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.email || !form.mot_de_passe) {
      setFormError('Tous les champs sont requis');
      return;
    }
    if (form.mot_de_passe.length < 8 || !/[A-Z]/.test(form.mot_de_passe) || !/[a-z]/.test(form.mot_de_passe) || !/[0-9]/.test(form.mot_de_passe)) {
      setFormError('Mot de passe faible (8+ caractères, majuscule, minuscule, chiffre requis)');
      return;
    }
    try {
      await dispatch(addUser(form)).unwrap();
      handleClose();
      dispatch(fetchUsers());
    } catch (err) {
      setFormError(err || 'Erreur lors de l\'ajout de l\'utilisateur');
    }
  };

  const handleDelete = (id) => dispatch(deleteUser(id));

  const isAdmin = user?.role === 'admin';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Utilisateurs</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            Ajouter un utilisateur
          </Button>
        )}
      </Box>
      {loading ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Date de création</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.nom}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.date_creation ? new Date(u.date_creation).toLocaleString() : ''}</TableCell>
                  <TableCell>
                    <Tooltip title="Supprimer"><IconButton onClick={() => handleDelete(u.id)}><DeleteIcon /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un utilisateur</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
            )}
            <TextField
              label="Nom"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Mot de passe"
              name="mot_de_passe"
              type="password"
              value={form.mot_de_passe}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              helperText="8+ caractères, majuscule, minuscule, chiffre requis"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Rôle</InputLabel>
              <Select
                name="role"
                value={form.role}
                onChange={handleChange}
                label="Rôle"
              >
                <MenuItem value="user">Utilisateur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained">Ajouter</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Users; 