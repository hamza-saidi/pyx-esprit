const { sequelize, EnvoiEmail, StatistiqueCampagne, Contact } = require('./models');
const { Op } = require('sequelize');

async function auditCampaign(campaignId) {
  try {
    console.log(`--- AUDIT CAMPAGNE ${campaignId} ---`);
    
    const stats = await StatistiqueCampagne.findOne({ where: { campagne_id: campaignId } });
    if (!stats) {
      console.log('Statistiques non trouvées.');
      return;
    }

    console.log('Statistiques Globales (table StatistiqueCampagne):');
    console.log(`- Envoyés déclarés: ${stats.nb_envoyes}`);
    console.log(`- Ouverts déclarés: ${stats.nb_ouverts}`);
    console.log(`- Clics déclarés: ${stats.nb_clics}`);

    console.log('\nDonnées Réelles (table EnvoiEmail):');
    const totalRows = await EnvoiEmail.count({ where: { campagne_id: campaignId } });
    const totalOpenRows = await EnvoiEmail.count({ where: { campagne_id: campaignId, date_ouverture: { [Op.not]: null } } });
    const totalClickRows = await EnvoiEmail.count({ where: { campagne_id: campaignId, date_clic: { [Op.not]: null } } });
    const rowsWithContact = await EnvoiEmail.count({ 
      where: { campagne_id: campaignId },
      include: [{ model: Contact, as: 'contact', required: true }]
    });

    console.log(`- Lignes totales: ${totalRows}`);
    console.log(`- Lignes avec ouverture: ${totalOpenRows}`);
    console.log(`- Lignes avec clic: ${totalClickRows}`);
    console.log(`- Lignes liées à un contact existant: ${rowsWithContact}`);

    if (totalRows < stats.nb_envoyes) {
      console.log('\n⚠️ ATTENTION: Il manque ' + (stats.nb_envoyes - totalRows) + ' lignes dans EnvoiEmail par rapport au total déclaré.');
    }

    if (rowsWithContact < totalRows) {
        console.log('\n⚠️ ATTENTION: ' + (totalRows - rowsWithContact) + ' lignes n\'ont pas de contact valide (jointure impossible).');
    }

  } catch (error) {
    console.error('Erreur audit:', error);
  } finally {
    process.exit(0);
  }
}

const campaignId = process.argv[2] || 143;
auditCampaign(campaignId);
