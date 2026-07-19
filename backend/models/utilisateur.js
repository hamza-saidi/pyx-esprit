module.exports = (sequelize, DataTypes) => {
  const Utilisateur = sequelize.define(
    'Utilisateur',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      mot_de_passe: { type: DataTypes.STRING(255), allowNull: false },
      role: {
        type: DataTypes.ENUM('admin', 'employee', 'global_admin'),
        allowNull: false,
        defaultValue: 'employee',
      },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
      // App-based TOTP MFA (otplib) — secret is only set once setup is
      // confirmed via a first successful code; mfa_totp_enabled gates whether
      // login requires it in place of the email OTP.
      mfa_totp_secret: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
      mfa_totp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'utilisateur',
      timestamps: false,
    }
  );

  Utilisateur.associate = (models) => {
    Utilisateur.hasMany(models.CampagneEmail, { foreignKey: 'createur_id', as: 'campagnes' });
    Utilisateur.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Utilisateur;
};
