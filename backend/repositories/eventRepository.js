const { Evenement, Rsvp, Contact } = require('../models');
const { Op } = require('sequelize');

function requireClubId(clubId) {
  if (!clubId) throw new Error('eventRepository: clubId is required');
}

const WITH_RSVPS = {
  include: [{ model: Rsvp, as: 'rsvps', include: [{ model: Contact, as: 'contact' }] }],
};

async function findById(id, { clubId }) {
  requireClubId(clubId);
  return Evenement.findOne({ where: { id, club_id: clubId }, ...WITH_RSVPS });
}

async function findConflict({ lieu, date, excludeId }) {
  const where = {
    lieu,
    date: {
      [Op.between]: [
        new Date(new Date(date).getTime() - 2 * 60 * 60 * 1000),
        new Date(new Date(date).getTime() + 4 * 60 * 60 * 1000),
      ],
    },
    actif: true,
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Evenement.findOne({ where });
}

async function create(data, { clubId }) {
  requireClubId(clubId);
  return Evenement.create({ ...data, club_id: clubId });
}

async function update(event, data) {
  return event.update(data);
}

module.exports = { findById, findConflict, create, update };
