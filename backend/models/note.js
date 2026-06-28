module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define(
    'Note',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      contact_id: { type: DataTypes.INTEGER, allowNull: false },
      contenu: { type: DataTypes.TEXT, allowNull: false },
      auteur: { type: DataTypes.STRING(100) },
      date_creation: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'note',
      timestamps: false,
    }
  );
  Note.associate = (models) => {
    Note.belongsTo(models.Contact, { foreignKey: 'contact_id', as: 'contact' });
  };
  return Note;
};
