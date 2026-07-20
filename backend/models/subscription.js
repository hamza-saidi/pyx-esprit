module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    'Subscription',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      club_id: { type: DataTypes.INTEGER, allowNull: false },
      plan_id: { type: DataTypes.INTEGER, allowNull: false },
      licence_key: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      date_debut: { type: DataTypes.DATE, allowNull: false },
      date_fin: { type: DataTypes.DATE, allowNull: false },
      statut: {
        type: DataTypes.ENUM('active', 'expiree', 'annulee'),
        allowNull: false,
        defaultValue: 'active',
      },
      date_creation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'subscription',
      timestamps: false,
    }
  );

  // Club-scoped in the sense that each row belongs to one club, but NOT in
  // TENANT_SCOPED_MODELS: only the SaaS admin (superadmin.js) ever reads or
  // writes this table, never a tenant's own users - so it's queried with an
  // explicit club_id filter instead, same as the Contact/Utilisateur counts
  // already in GET /superadmin/clubs.
  Subscription.associate = (models) => {
    Subscription.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
    Subscription.belongsTo(models.Plan, { foreignKey: 'plan_id', as: 'plan' });
  };

  return Subscription;
};
