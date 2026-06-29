module.exports = (sequelize, DataTypes) => {
  const StatistiqueCampagne = sequelize.define(
    'StatistiqueCampagne',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      campagne_id: { type: DataTypes.INTEGER },
      nb_envoyes: { type: DataTypes.INTEGER, defaultValue: 0 },
      nb_ouverts: { type: DataTypes.INTEGER, defaultValue: 0 },
      nb_clics: { type: DataTypes.INTEGER, defaultValue: 0 },
      nb_desabonnements: { type: DataTypes.INTEGER, defaultValue: 0 },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'statistique_campagne',
      timestamps: false,
    }
  );

  StatistiqueCampagne.associate = (models) => {
    StatistiqueCampagne.belongsTo(models.CampagneEmail, {
      foreignKey: 'campagne_id',
      as: 'campagne',
    });
    StatistiqueCampagne.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return StatistiqueCampagne;
};
