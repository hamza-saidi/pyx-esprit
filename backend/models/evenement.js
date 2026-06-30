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
      capacite_max: { type: DataTypes.INTEGER, allowNull: true },
      type_evenement: { type: DataTypes.STRING(50), defaultValue: 'tournoi' },
      prix: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      tags_ids: { type: DataTypes.JSON, allowNull: true },
      parametres: { type: DataTypes.JSON, allowNull: true },
      statut: {
        type: DataTypes.ENUM('planifié', 'en_cours', 'annule', 'termine'),
        defaultValue: 'planifié',
      },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'evenement',
      timestamps: false,
    }
  );

  Evenement.associate = (models) => {
    Evenement.hasMany(models.Rsvp, { foreignKey: 'evenement_id', as: 'rsvps' });
    Evenement.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Evenement;
};
