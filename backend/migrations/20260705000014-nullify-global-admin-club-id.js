'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE utilisateur SET club_id = NULL WHERE role = 'global_admin'"
    );
    console.log('Migration UP: club_id set to NULL for all global_admin users.');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "UPDATE utilisateur SET club_id = 1 WHERE role = 'global_admin' AND club_id IS NULL"
    );
    console.log('Migration DOWN: club_id restored to 1 for global_admin users.');
  },
};
