// models/abonnement.js
module.exports = (sequelize, DataTypes) => {
  const Abonnement = sequelize.define(
    'Abonnement',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      prix: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
      duree_mois: { type: DataTypes.INTEGER, defaultValue: 12 },
      description: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'abonnement',
      timestamps: false,
    }
  );

  Abonnement.associate = (models) => {
    Abonnement.hasMany(models.Contact, { foreignKey: 'abonnement_id', as: 'contacts' });
  };

  return Abonnement;
};
