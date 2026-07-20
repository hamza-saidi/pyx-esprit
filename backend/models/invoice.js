module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      club_id: { type: DataTypes.INTEGER, allowNull: false },
      subscription_id: { type: DataTypes.INTEGER, allowNull: true },
      // Snapshotted from the plan's price at invoice time - see migration
      // comment, never recomputed from Plan.
      montant: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      devise: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'TND' },
      date_emission: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      date_echeance: { type: DataTypes.DATE, allowNull: true },
      statut: {
        type: DataTypes.ENUM('payee', 'en_attente', 'en_retard', 'annulee'),
        allowNull: false,
        defaultValue: 'en_attente',
      },
      date_paiement: { type: DataTypes.DATE, allowNull: true },
      reference: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    },
    {
      tableName: 'invoice',
      timestamps: false,
    }
  );

  // Same category as Plan/Subscription: SaaS-operator-owned, not in
  // TENANT_SCOPED_MODELS - only superadmin.js reads/writes it.
  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
    Invoice.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
  };

  return Invoice;
};
