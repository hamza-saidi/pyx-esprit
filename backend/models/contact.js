module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define(
    'Contact',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      prenom: { type: DataTypes.STRING(100), allowNull: false },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false },
      telephone: { type: DataTypes.STRING(20) },
      sexe: { type: DataTypes.ENUM('Homme', 'Femme', 'Autre') },
      handicap: { type: DataTypes.DECIMAL(4, 1) },
      home_club: { type: DataTypes.STRING(100) },
      date_naissance: { type: DataTypes.DATE },
      nationalite: { type: DataTypes.STRING(50) },
      type_client: { type: DataTypes.ENUM('membre', 'entreprise') },
      ville: { type: DataTypes.STRING(100) },
      entreprise: { type: DataTypes.STRING(100) },
      remarques: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      adresse: { type: DataTypes.STRING(255) },
      code_postal: { type: DataTypes.STRING(20) },
      pays: { type: DataTypes.STRING(100) },
      statut: { type: DataTypes.ENUM('prospect', 'client', 'archivé'), defaultValue: 'prospect' },
      source: { type: DataTypes.STRING(100) },
      metadata: { type: DataTypes.JSON },
      historique: { type: DataTypes.JSON },
      date_inscription: { type: DataTypes.DATE },
      consentement_rgpd: { type: DataTypes.BOOLEAN, defaultValue: false },
      // Membership / Abonnement fields
      abonnement_id: { type: DataTypes.INTEGER },
      date_debut_abonnement: { type: DataTypes.DATE },
      date_expiration_abonnement: { type: DataTypes.DATE },
      statut_abonnement: {
        type: DataTypes.ENUM(
          'actif',
          'expiré',
          'en_attente_paiement',
          'aucun',
          'a_renouveler',
          'archive'
        ),
        defaultValue: 'aucun',
      },
      type_adhesion: {
        type: DataTypes.ENUM(
          'Individuel',
          'Famille',
          'Entreprise',
          'Junior',
          'Senior',
          'Corporate',
          'Invité'
        ),
        allowNull: true,
      },
      numero_licence: { type: DataTypes.STRING(50), allowNull: true },
      dernier_paiement_info: { type: DataTypes.STRING(255) },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'contact',
      timestamps: false,
    }
  );

  Contact.associate = (models) => {
    Contact.belongsToMany(models.Tag, {
      through: models.ContactTag,
      foreignKey: 'contact_id',
      as: 'tags',
    });
    Contact.hasMany(models.Rsvp, { foreignKey: 'contact_id', as: 'rsvps' });
    Contact.hasMany(models.Note, { foreignKey: 'contact_id', as: 'notes' });
    Contact.belongsTo(models.Abonnement, { foreignKey: 'abonnement_id', as: 'abonnement' });
    Contact.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Contact;
};
