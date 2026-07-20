module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    'Plan',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      // null = "Sur devis" (Enterprise) rather than a fixed monthly price
      prix_mensuel: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      devise: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'TND' },
      // Stored as display strings (e.g. "5 000") since some limits are
      // "Illimités" (null) rather than a fixed number.
      contacts_limit: { type: DataTypes.STRING(50), allowNull: true },
      emails_limit: { type: DataTypes.STRING(50), allowNull: true },
      users_limit: { type: DataTypes.STRING(50), allowNull: true },
      automations_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      api_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sla_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      support_level: { type: DataTypes.STRING(50), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ordre_affichage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'plan',
      timestamps: false,
    }
  );

  // Global, SaaS-operator-owned: not in TENANT_SCOPED_MODELS, never queried
  // by a tenant user - only backend/routes/superadmin.js reads/writes it.
  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, { foreignKey: 'plan_id', as: 'abonnements' });
  };

  return Plan;
};
