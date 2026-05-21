module.exports = (sequelize, DataTypes) => {
  const Automation = sequelize.define('Automation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      // unique constraint removed to allow multiple custom automations
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true
    },
    derniere_execution: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'automations',
    timestamps: true,
    createdAt: 'date_creation',
    updatedAt: 'date_modification'
  });

  return Automation;
};
