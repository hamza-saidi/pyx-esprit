module.exports = (sequelize, DataTypes) => {
  const Rsvp = sequelize.define(
    'Rsvp',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      contact_id: { type: DataTypes.INTEGER },
      evenement_id: { type: DataTypes.INTEGER },
      statut: {
        type: DataTypes.ENUM('invité', 'confirmé', 'absent', 'annule'),
        defaultValue: 'invité',
      },
      message_personnalise: { type: DataTypes.TEXT, allowNull: true },
      date_invitation: { type: DataTypes.DATE, allowNull: true },
      commentaire: { type: DataTypes.TEXT, allowNull: true },
      date_confirmation: { type: DataTypes.DATE, allowNull: true },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'rsvp',
      timestamps: false,
    }
  );

  Rsvp.associate = (models) => {
    Rsvp.belongsTo(models.Contact, { foreignKey: 'contact_id', as: 'contact' });
    Rsvp.belongsTo(models.Evenement, { foreignKey: 'evenement_id', as: 'evenement' });
    Rsvp.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Rsvp;
};
