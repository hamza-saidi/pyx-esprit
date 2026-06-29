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
      club_id: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
    },
    {
      tableName: 'contact_tag',
      timestamps: false,
    }
  );
  return ContactTag;
};
