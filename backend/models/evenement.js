module.exports = (sequelize, DataTypes) => {
  const Evenement = sequelize.define(
    'Evenement',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      titre: { type: DataTypes.STRING(100), allowNull: false },
      date: { type: DataTypes.DATE, allowNull: false },
      lieu: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT },
      index_requis: { type: DataTypes.DECIMAL(4, 1) },
    },
    {
      tableName: 'evenement',
      timestamps: false,
    }
  );

  Evenement.associate = (models) => {
    Evenement.hasMany(models.Rsvp, { foreignKey: 'evenement_id', as: 'rsvps' });
  };

  return Evenement;
};
