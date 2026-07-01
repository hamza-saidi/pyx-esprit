module.exports = (sequelize, DataTypes) => {
  const Club = sequelize.define(
    'Club',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(150), allowNull: false },
      slug: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      email_contact: { type: DataTypes.STRING(150) },
      statut: {
        type: DataTypes.ENUM('actif', 'suspendu', 'archive'),
        allowNull: false,
        defaultValue: 'actif',
      },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      // Microsoft Graph multi-tenant integration
      azure_tenant_id: { type: DataTypes.STRING(36), allowNull: true, defaultValue: null },
      graph_from_email: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
      graph_consent_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    },
    {
      tableName: 'club',
      timestamps: false,
    }
  );

  Club.associate = (models) => {
    Club.hasMany(models.Utilisateur, { foreignKey: 'club_id', as: 'utilisateurs' });
    Club.hasMany(models.Contact, { foreignKey: 'club_id', as: 'contacts' });
    Club.hasMany(models.Tag, { foreignKey: 'club_id', as: 'tags' });
    Club.hasMany(models.Segment, { foreignKey: 'club_id', as: 'segments' });
    Club.hasMany(models.CampagneEmail, { foreignKey: 'club_id', as: 'campagnes' });
    Club.hasMany(models.Evenement, { foreignKey: 'club_id', as: 'evenements' });
    Club.hasMany(models.Abonnement, { foreignKey: 'club_id', as: 'abonnements' });
    Club.hasMany(models.ModeleEmail, { foreignKey: 'club_id', as: 'modeles' });
    Club.hasMany(models.Automation, { foreignKey: 'club_id', as: 'automations' });
    Club.hasMany(models.Category, { foreignKey: 'club_id', as: 'categories' });
    Club.hasMany(models.Distribution, { foreignKey: 'club_id', as: 'distributions' });
  };

  return Club;
};
