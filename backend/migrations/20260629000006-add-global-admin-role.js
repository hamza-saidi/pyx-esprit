'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('utilisateur');
    if (tableInfo.role && tableInfo.role.type && tableInfo.role.type.includes('global_admin')) {
      console.log('Migration UP: "global_admin" role already present, skipping.');
      return;
    }

    await queryInterface.changeColumn('utilisateur', 'role', {
      type: Sequelize.ENUM('admin', 'employee', 'global_admin'),
      allowNull: false,
      defaultValue: 'employee',
    });

    console.log('Migration UP: Extended utilisateur.role ENUM with "global_admin".');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "UPDATE utilisateur SET role = 'employee' WHERE role = 'global_admin'"
    );
    await queryInterface.changeColumn('utilisateur', 'role', {
      type: Sequelize.ENUM('admin', 'employee'),
      allowNull: false,
      defaultValue: 'employee',
    });
    console.log('Migration DOWN: Reverted utilisateur.role ENUM to ("admin", "employee").');
  },
};
