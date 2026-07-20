'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('subscription')) {
      await queryInterface.createTable('subscription', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'club', key: 'id' },
          onDelete: 'CASCADE',
        },
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'plan', key: 'id' },
          onDelete: 'RESTRICT',
        },
        licence_key: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        date_debut: { type: Sequelize.DATE, allowNull: false },
        date_fin: { type: Sequelize.DATE, allowNull: false },
        statut: {
          type: Sequelize.ENUM('active', 'expiree', 'annulee'),
          allowNull: false,
          defaultValue: 'active',
        },
        date_creation: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      console.log('Migration UP: Created "subscription" table.');
    }

    // Backfill: one active Subscription per existing club (Professional
    // plan, 1-year term from club creation) so OwnerLicences.jsx isn't
    // empty on first deploy.
    const [existingSubs] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM subscription'
    );
    if (existingSubs[0].count === 0) {
      const [clubs] = await queryInterface.sequelize.query('SELECT id, date_creation FROM club');
      const [proPlan] = await queryInterface.sequelize.query(
        "SELECT id FROM plan WHERE slug = 'pro' LIMIT 1"
      );
      if (clubs.length > 0 && proPlan.length > 0) {
        const planId = proPlan[0].id;
        const genKey = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let s = 'PLX-';
          for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
          return s;
        };
        const rows = clubs.map((club) => {
          const debut = club.date_creation ? new Date(club.date_creation) : new Date();
          const fin = new Date(debut);
          fin.setFullYear(fin.getFullYear() + 1);
          return {
            club_id: club.id,
            plan_id: planId,
            licence_key: genKey(),
            date_debut: debut,
            date_fin: fin,
            statut: 'active',
            date_creation: new Date(),
          };
        });
        await queryInterface.bulkInsert('subscription', rows);
        console.log(`Migration UP: Backfilled ${rows.length} subscription(s) for existing clubs.`);
      }
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('subscription')) {
      await queryInterface.dropTable('subscription');
      console.log('Migration DOWN: Dropped "subscription" table.');
    }
  },
};
