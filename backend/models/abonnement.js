// models/abonnement.js
module.exports = (sequelize, DataTypes) => {
  const Abonnement = sequelize.define(
    'Abonnement',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      prix: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
      duree_mois: { type: DataTypes.INTEGER, defaultValue: 12 },
      description: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'abonnement',
      timestamps: false,
      // Uniqueness is per-club (see migration 20260629000009), not global.
      indexes: [{ unique: true, fields: ['club_id', 'nom'], name: 'uniq_abonnement_club_nom' }],
    }
  );

  Abonnement.associate = (models) => {
    Abonnement.hasMany(models.Contact, { foreignKey: 'abonnement_id', as: 'contacts' });
    Abonnement.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Abonnement;
};
