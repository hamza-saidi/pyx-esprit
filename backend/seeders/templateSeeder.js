const { ModeleEmail } = require('../models');

const templates = [
  {
    nom: 'Golf Club Premium - Newsletter',
    contenu_html: `
      <!DOCTYPE html>
      <html>
      <head>
      <style>
          body { font-family: "Times New Roman", Times, serif; background-color: #f1f7f6; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; }
          .header { background-color: #204170; padding: 30px; text-align: center; }
          .hero-img { width: 100%; display: block; }
          .content { padding: 50px 40px; text-align: center; border-bottom: 8px solid #f2b82e; }
          .title { font-size: 28px; color: #204170; margin-bottom: 20px; font-weight: normal; }
          .text { font-size: 16px; line-height: 1.8; color: #444444; margin-bottom: 30px; }
          .btn { display: inline-block; background-color: #f2b82e; color: #204170; padding: 14px 30px; font-weight: bold; border-radius: 25px; text-decoration: none; font-size: 16px; }
          .footer { padding: 40px; background-color: #f6f8f9; text-align: center; color: #204170; font-size: 11px; }
      </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                   <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775125427987-221369714.png" alt="Citrus Golf" style="max-height: 60px;">
              </div>
              <img src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=1000" class="hero-img">
              <div class="content">
                  <h2 class="title">Actualités de votre Club</h2>
                  <p class="text">
                      "Découvrez les dernières compétitions, les améliorations apportées au parcours et les événements exclusifs à venir cette saison."
                  </p>
                  <a href="#" class="btn">En savoir plus →</a>
              </div>
              <div class="footer">
                  © 2026 Golf Huub. Tous droits réservés. <br> {{unsubscribe_link}}
              </div>
          </div>
      </body>
      </html>
    `.trim()
  },
  {
    nom: 'Offre Green Fee - Spéciale',
    contenu_html: `
      <div style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <div style="padding: 16px; background-color: #0d47a1; color: #fff; font-size: 20px; font-weight: bold; text-align: center;">Offre Limitée</div>
          <div style="padding: 40px; text-align: center;">
            <h1 style="color: #0d47a1; margin: 0 0 16px;">-20% ce Week-end</h1>
            <p style="font-size: 18px; color: #555; margin-bottom: 30px;">Profitez d'un tarif préférentiel sur toutes les réservations effectuées avant vendredi soir.</p>
            <a href="#" style="display: inline-block; background-color: #0d47a1; color: #fff; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Réserver mon Green Fee</a>
            <p style="margin-top: 30px; font-size: 12px; color: #888;">Code promo: GOLF20. Offre soumise à conditions.</p>
          </div>
        </div>
      </div>
    `.trim()
  },
  {
    nom: 'Accueil Nouveaux Membres',
    contenu_html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f7f6;padding:40px">
        <tr><td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial, sans-serif;box-shadow: 0 10px 30px rgba(0,0,0,0.05)">
            <tr><td style="padding:30px;background:#1b5e20;color:#fff;text-align:center">
              <h1 style="margin:0;font-size:28px">Bienvenue {{prenom}} !</h1>
            </td></tr>
            <tr><td style="padding:40px;color:#333;line-height:1.6">
              <p>Bonjour {{prenom}},</p>
              <p>C'est un honneur de vous accueillir au sein de notre communauté de passionnés. Voici quelques ressources pour bien démarrer votre saison :</p>
              <ul style="margin:20px 0;padding-left:20px">
                <li style="margin-bottom:10px">Réservation en ligne simplifiée</li>
                <li style="margin-bottom:10px">Accès prioritaire aux compétitions</li>
                <li style="margin-bottom:10px">Tarifs membres au Pro-Shop (-15%)</li>
              </ul>
              <div style="text-align:center;margin-top:40px">
                <a href="#" style="background:#1b5e20;color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:bold">Découvrir mes Avantages</a>
              </div>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `.trim()
  }
];

const seedTemplates = async () => {
  console.log('🌱 Seeding Templates...');
  try {
    for (const t of templates) {
      await ModeleEmail.findOrCreate({
        where: { nom: t.nom },
        defaults: t
      });
    }
    console.log('✅ Templates seeded successfully.');
  } catch (err) {
    console.error('❌ Error seeding templates:', err);
  }
};

module.exports = seedTemplates;
