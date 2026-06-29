const express = require('express');
const router = express.Router();
const { Utilisateur } = require('../models');
const { requireAuthAndTenant, authorizeRoles } = require('../middleware/auth');

// Liste tous les utilisateurs (admin)
router.get('/', requireAuthAndTenant, authorizeRoles('admin'), async (req, res) => {
  const users = await Utilisateur.findAll({ attributes: { exclude: ['mot_de_passe'] } });
  res.json(users);
});

// Créer un utilisateur (admin)
router.post('/', requireAuthAndTenant, authorizeRoles('admin'), async (req, res) => {
  try {
    const { nom, email, mot_de_passe, role = 'employee' } = req.body;
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
    }
    // SECURITY: a club admin can only grant 'employee' or 'admin' - never
    // 'global_admin', which is reserved for direct operator/seed action.
    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    if (
      mot_de_passe.length < 8 ||
      !/[A-Z]/.test(mot_de_passe) ||
      !/[a-z]/.test(mot_de_passe) ||
      !/[0-9]/.test(mot_de_passe)
    ) {
      return res.status(400).json({
        message: 'Mot de passe faible (8+ caractères, majuscule, minuscule, chiffre requis)',
      });
    }
    const existing = await Utilisateur.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email déjà utilisé' });
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(mot_de_passe, 12);
    const user = await Utilisateur.create({
      nom,
      email,
      mot_de_passe: hash,
      role,
      club_id: req.user.club_id,
    });
    res.status(201).json({ id: user.id, nom: user.nom, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supprimer un utilisateur (admin)
router.delete('/:id', requireAuthAndTenant, authorizeRoles('admin'), async (req, res) => {
  const user = await Utilisateur.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  await user.destroy();
  res.json({ message: 'Utilisateur supprimé' });
});

module.exports = router;
