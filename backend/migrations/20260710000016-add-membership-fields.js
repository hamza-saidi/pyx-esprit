'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('contact');

    if (!tableDesc.type_adhesion) {
      await queryInterface.addColumn('contact', 'type_adhesion', {
        type: Sequelize.ENUM(
          'Individuel',
          'Famille',
          'Entreprise',
          'Junior',
          'Senior',
          'Corporate',
          'Invité'
        ),
        allowNull: true,
        after: 'statut_abonnement',
      });
    }

    if (!tableDesc.numero_licence) {
      await queryInterface.addColumn('contact', 'numero_licence', {
        type: Sequelize.STRING(50),
        allowNull: true,
        after: 'type_adhesion',
      });
    }

    // Extend statut_abonnement ENUM with a_renouveler and archive
    await queryInterface.sequelize.query(`
      ALTER TABLE contact
      MODIFY COLUMN statut_abonnement
      ENUM('actif', 'expiré', 'en_attente_paiement', 'aucun', 'a_renouveler', 'archive')
      DEFAULT 'aucun'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contact', 'type_adhesion');
    await queryInterface.removeColumn('contact', 'numero_licence');
    await queryInterface.sequelize.query(`
      ALTER TABLE contact
      MODIFY COLUMN statut_abonnement
      ENUM('actif', 'expiré', 'en_attente_paiement', 'aucun')
      DEFAULT 'aucun'
    `);
  },
};
