'use strict';

// Seed values copied from frontend/src/pages/OwnerPlans.jsx's previously
// hardcoded PLANS array, so the page renders identically once switched to
// this real data.
const SEED_PLANS = [
  {
    nom: 'Starter',
    slug: 'starter',
    prix_mensuel: 49,
    devise: 'TND',
    contacts_limit: '5 000',
    emails_limit: '50 000',
    users_limit: '3',
    automations_enabled: false,
    api_enabled: false,
    sla_enabled: false,
    support_level: 'Email',
    description: 'Pour démarrer avec les bases du marketing email',
    actif: true,
    ordre_affichage: 1,
  },
  {
    nom: 'Professional',
    slug: 'pro',
    prix_mensuel: 149,
    devise: 'TND',
    contacts_limit: '50 000',
    emails_limit: '500 000',
    users_limit: '10',
    automations_enabled: true,
    api_enabled: false,
    sla_enabled: false,
    support_level: 'Email + Chat',
    description: 'Pour les équipes marketing actives',
    actif: true,
    ordre_affichage: 2,
  },
  {
    nom: 'Enterprise',
    slug: 'enterprise',
    prix_mensuel: null, // "Sur devis" - no fixed monthly price
    devise: 'TND',
    contacts_limit: null, // "Illimités"
    emails_limit: null,
    users_limit: null,
    automations_enabled: true,
    api_enabled: true,
    sla_enabled: true,
    support_level: 'Dédié 24/7',
    description: 'Pour les grandes organisations',
    actif: true,
    ordre_affichage: 3,
  },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('plan')) {
      await queryInterface.createTable('plan', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        nom: { type: Sequelize.STRING(100), allowNull: false },
        slug: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        prix_mensuel: { type: Sequelize.DECIMAL(10, 2), allowNull: true }, // null = sur devis
        devise: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'TND' },
        contacts_limit: { type: Sequelize.STRING(50), allowNull: true }, // null = illimité
        emails_limit: { type: Sequelize.STRING(50), allowNull: true },
        users_limit: { type: Sequelize.STRING(50), allowNull: true },
        automations_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        api_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        sla_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        support_level: { type: Sequelize.STRING(50), allowNull: true },
        description: { type: Sequelize.STRING(255), allowNull: true },
        actif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ordre_affichage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      });
      console.log('Migration UP: Created "plan" table.');
    }

    const [existing] = await queryInterface.sequelize.query('SELECT id FROM plan LIMIT 1');
    if (existing.length === 0) {
      await queryInterface.bulkInsert('plan', SEED_PLANS);
      console.log('Migration UP: Seeded 3 default plans (Starter/Professional/Enterprise).');
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('plan')) {
      await queryInterface.dropTable('plan');
      console.log('Migration DOWN: Dropped "plan" table.');
    }
  },
};
