module.exports = (sequelize, DataTypes) => {
  const ContactTag = sequelize.define(
    'ContactTag',
    {
      contact_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      tableName: 'contact_tag',
      timestamps: false,
    }
  );
  return ContactTag;
};
