module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define(
    'Tag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(50), allowNull: false },
    },
    {
      tableName: 'tag',
      timestamps: false,
    }
  );

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Contact, {
      through: models.ContactTag,
      foreignKey: 'tag_id',
      as: 'contacts',
    });
  };

  return Tag;
};
