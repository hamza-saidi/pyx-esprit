module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define(
    'Tag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nom: { type: DataTypes.STRING(50), allowNull: false },
      club_id: { type: DataTypes.INTEGER, defaultValue: 1 },
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
    Tag.belongsTo(models.Club, { foreignKey: 'club_id', as: 'club' });
  };

  return Tag;
};
