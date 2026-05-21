module.exports = (sequelize, DataTypes) => {
  const EnvoiEmail = sequelize.define('EnvoiEmail', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    campagne_id: { type: DataTypes.INTEGER, allowNull: true },
    contact_id: { type: DataTypes.INTEGER, allowNull: false },
    email_destinataire: { type: DataTypes.STRING(255), allowNull: false },
    statut: { 
      type: DataTypes.ENUM('en_attente', 'en_cours', 'envoyé', 'livré', 'ouvert', 'cliqué', 'bounce', 'spam', 'erreur'), 
      defaultValue: 'en_attente' 
    },
    date_envoi: { type: DataTypes.DATE },
    date_livraison: { type: DataTypes.DATE },
    date_ouverture: { type: DataTypes.DATE },
    date_clic: { type: DataTypes.DATE },
    nombre_ouvertures: { type: DataTypes.INTEGER, defaultValue: 0 },
    nombre_clics: { type: DataTypes.INTEGER, defaultValue: 0 },
    liens_cliques: { type: DataTypes.JSON }, // Array des liens cliqués
    message_erreur: { type: DataTypes.TEXT },
    token_tracking: { type: DataTypes.STRING(255), unique: true }, // Pour le tracking des ouvertures/clics
    actif: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'envoi_email',
    timestamps: false
  });

  EnvoiEmail.associate = models => {
    EnvoiEmail.belongsTo(models.CampagneEmail, { foreignKey: 'campagne_id', as: 'campagne' });
    EnvoiEmail.belongsTo(models.Contact, { foreignKey: 'contact_id', as: 'contact' });
  };

  return EnvoiEmail;
};
