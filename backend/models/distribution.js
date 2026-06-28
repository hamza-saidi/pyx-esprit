module.exports = (sequelize, DataTypes) => {
  const Distribution = sequelize.define(
    'Distribution',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'distribution',
      timestamps: false,
    }
  );

  Distribution.associate = (models) => {
    Distribution.hasMany(models.Contact, { foreignKey: 'distribution_id', as: 'contacts' });
  };

  return Distribution;
};
