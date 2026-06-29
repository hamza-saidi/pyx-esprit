module.exports = (sequelize, DataTypes) => {
  const ModeleEmail = sequelize.define(
    'ModeleEmail',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      contenu_html: { type: DataTypes.TEXT('long'), allowNull: false },
      blocks_json: { type: DataTypes.JSON, allowNull: true },
      design_json: { type: DataTypes.JSON, allowNull: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'modele_email',
      timestamps: false,
    }
  );

  ModeleEmail.associate = (models) => {
    ModeleEmail.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return ModeleEmail;
};
