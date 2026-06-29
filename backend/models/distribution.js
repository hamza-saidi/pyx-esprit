module.exports = (sequelize, DataTypes) => {
  const Distribution = sequelize.define(
    'Distribution',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'distribution',
      timestamps: false,
      // Uniqueness is per-club (see migration 20260629000009), not global.
      indexes: [{ unique: true, fields: ['club_id', 'nom'], name: 'uniq_distribution_club_nom' }],
    }
  );

  Distribution.associate = (models) => {
    Distribution.hasMany(models.Contact, { foreignKey: 'distribution_id', as: 'contacts' });
    Distribution.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Distribution;
};
