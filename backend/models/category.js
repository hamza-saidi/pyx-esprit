// models/Category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT },
      actif: { type: DataTypes.BOOLEAN, defaultValue: true },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    },
    {
      tableName: 'category',
      timestamps: false,
      // Uniqueness is per-club (see migration 20260629000009), not global.
      indexes: [{ unique: true, fields: ['club_id', 'nom'], name: 'uniq_category_club_nom' }],
    }
  );

  Category.associate = (models) => {
    Category.hasMany(models.Contact, { foreignKey: 'category_id', as: 'contacts' });
    Category.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Category;
};
