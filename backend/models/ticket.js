module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    'Ticket',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nullable: a ticket can concern the platform as a whole rather than
      // one specific tenant.
      club_id: { type: DataTypes.INTEGER, allowNull: true },
      sujet: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      categorie: { type: DataTypes.STRING(50), allowNull: true },
      priorite: {
        type: DataTypes.ENUM('haute', 'normale', 'basse'),
        allowNull: false,
        defaultValue: 'normale',
      },
      statut: {
        type: DataTypes.ENUM('ouvert', 'en_cours', 'resolu'),
        allowNull: false,
        defaultValue: 'ouvert',
      },
      date_creation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      date_maj: { type: DataTypes.DATE, allowNull: true },
      date_resolution: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'ticket',
      timestamps: false,
    }
  );

  // SaaS-operator-owned (like Plan/Subscription/Invoice) - logged by the
  // support team on a tenant's behalf, not tenant-facing self-service in
  // this phase. Not in TENANT_SCOPED_MODELS.
  Ticket.associate = (models) => {
    Ticket.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Ticket;
};
