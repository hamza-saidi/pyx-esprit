const { EnvoiEmail } = require('./models');

async function checkStatuses(campaignId) {
  const stats = await EnvoiEmail.findAll({
    where: { campagne_id: campaignId },
    attributes: [
      'statut',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
    ],
    group: ['statut'],
    raw: true,
  });
  console.log(`Statuses for Campaign ${campaignId}:`, stats);
}

checkStatuses(process.argv[2] || 91)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
