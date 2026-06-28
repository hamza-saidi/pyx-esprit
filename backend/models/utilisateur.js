module.exports = (sequelize, DataTypes) => {
  const Utilisateur = sequelize.define(
    'Utilisateur',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      mot_de_passe: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM('admin', 'employee'),
        allowNull: false,
        defaultValue: 'employee',
      },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'utilisateur',
      timestamps: false,
    }
  );

  Utilisateur.associate = (models) => {
    Utilisateur.hasMany(models.CampagneEmail, { foreignKey: 'createur_id', as: 'campagnes' });
  };

  return Utilisateur;
};
