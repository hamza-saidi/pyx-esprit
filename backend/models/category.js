// models/Category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true },
    date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'category',
    timestamps: false
  });

  Category.associate = models => {
    Category.hasMany(models.Contact, { foreignKey: 'category_id', as: 'contacts' });
  };

  return Category;
};
