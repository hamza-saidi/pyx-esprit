module.exports = (sequelize, DataTypes) => {
  const Segment = sequelize.define(
    'Segment',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      criteres: { type: DataTypes.JSON, allowNull: false },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'segment',
      timestamps: false,
    }
  );

  Segment.associate = (models) => {
    Segment.hasMany(models.CampagneEmail, { foreignKey: 'segment_id', as: 'campagnes' });
    Segment.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Segment;
};
