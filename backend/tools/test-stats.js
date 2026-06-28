const { Contact, Tag } = require('./models');
const { Op } = require('sequelize');
const sequelize = require('./models').sequelize;

async function test() {
  try {
    const audience_total = await Contact.count();
    const audience_actif = await Contact.count({ where: { actif: true } });

    console.log({ audience_total, audience_actif });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const growthDataRaw = await Contact.findAll({
      where: { date_creation: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('date_creation')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('date_creation'))],
      order: [[sequelize.fn('DATE', sequelize.col('date_creation')), 'ASC']],
      raw: true,
    });

    console.log('Growth:', growthDataRaw);

    const topTagsRaw = await Tag.findAll({
      include: [
        {
          model: Contact,
          as: 'contacts',
          attributes: [],
          through: { attributes: [] },
        },
      ],
      attributes: ['nom', [sequelize.fn('COUNT', sequelize.col('contacts.id')), 'contactCount']],
      group: ['Tag.id', 'Tag.nom'],
      order: [[sequelize.fn('COUNT', sequelize.col('contacts.id')), 'DESC']],
      limit: 10,
      subQuery: false,
      raw: true,
    });

    console.log('Top tags:', topTagsRaw);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
