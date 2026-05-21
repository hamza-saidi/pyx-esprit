module.exports = (sequelize, DataTypes) => {
  const CampagneEmail = sequelize.define('CampagneEmail', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    titre: { type: DataTypes.STRING(100), allowNull: false },
    sujet: { type: DataTypes.STRING(200), allowNull: false },
    contenu_html: { type: DataTypes.TEXT('long'), allowNull: false },
    contenu_texte: { type: DataTypes.TEXT },
    type_campagne: { 
      type: DataTypes.ENUM('newsletter', 'promotion', 'invitation', 'notification', 'autre'), 
      defaultValue: 'newsletter' 
    },
    statut: { 
      type: DataTypes.ENUM('brouillon', 'programmée', 'en_cours', 'envoyée', 'annulée', 'erreur'), 
      defaultValue: 'brouillon' 
    },
    priorite: { 
      type: DataTypes.ENUM('basse', 'normale', 'haute', 'urgente'), 
      defaultValue: 'normale' 
    },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    date_programmation: { type: DataTypes.DATE },
    date_envoi: { type: DataTypes.DATE },
    date_fin: { type: DataTypes.DATE },
    createur_id: { type: DataTypes.INTEGER, allowNull: false },
    segment_id: { type: DataTypes.INTEGER },
    tags_ids: { type: DataTypes.JSON, defaultValue: [] },
    contacts_ids: { type: DataTypes.JSON, defaultValue: [] },
    parametres: { type: DataTypes.JSON, defaultValue: {} },
    limite_envois: { type: DataTypes.INTEGER },
    nb_envoyes: { type: DataTypes.INTEGER, defaultValue: 0 },
    nb_erreurs: { type: DataTypes.INTEGER, defaultValue: 0 },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'campagne_email',
    timestamps: false,
    indexes: [
      { fields: ['statut'] },
      { fields: ['date_programmation'] },
      { fields: ['createur_id'] },
      { fields: ['segment_id'] }
    ]
  });

  CampagneEmail.associate = models => {
    CampagneEmail.belongsTo(models.Utilisateur, { foreignKey: 'createur_id', as: 'createur' });
    CampagneEmail.belongsTo(models.Segment, { foreignKey: 'segment_id', as: 'segment' });
    CampagneEmail.hasOne(models.StatistiqueCampagne, { foreignKey: 'campagne_id', as: 'statistiques' });
    CampagneEmail.hasMany(models.EnvoiEmail, { foreignKey: 'campagne_id', as: 'envois' });
  };

  return CampagneEmail;
}; 