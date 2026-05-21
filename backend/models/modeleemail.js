module.exports = (sequelize, DataTypes) => {
  const ModeleEmail = sequelize.define('ModeleEmail', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    contenu_html: { type: DataTypes.TEXT('long'), allowNull: false },
    blocks_json: { type: DataTypes.JSON, allowNull: true },
    design_json: { type: DataTypes.JSON, allowNull: true },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'modele_email',
    timestamps: false
  });
  return ModeleEmail;
}; 