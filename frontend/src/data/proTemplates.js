export const PRO_TEMPLATES = [
  {
    id: 'golf-premium-fr',
    nom: 'Golf Club Premium (FR)',
    categorie: 'Newsletter',
    description: 'Modèle officiel élégant pour les clubs de golf, incluant sections événements et galerie.',
    thumbnail: 'https://placehold.co/400x300/204170/ffffff?text=Golf+Premium+FR',
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
    .section-light { padding: 40px 20px; background-color: #fdfaf7; }
    .columns { display: flex; gap: 20px; }
    .col { flex: 1; }
    .col img { width: 100%; border-radius: 2px; }
    .col h3 { font-size: 18px; color: #008c95; margin: 15px 0 10px; }
    .col p { font-size: 14px; color: #555555; line-height: 1.6; }
    .footer { padding: 40px; background-color: #f6f8f9; text-align: center; color: #204170; font-size: 11px; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
             <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775125427987-221369714.png" alt="Citrus Golf" style="max-height: 60px;">
        </div>
        <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775125427987-221369714.png" class="hero-img">
        <div class="content">
            <h2 class="title">Un mot de notre Directeur</h2>
            <p class="text">
                "Depuis sa création, Citrus Golf Club Hammamet offre une expérience unique,
                mêlant nature, excellence et innovation. Votre vote au World Golf Awards nous permettra
                de partager notre passion avec le monde entier."
            </p>
            <a href="#" class="btn">Voter Maintenant →</a>
        </div>
        <div class="section-light">
             <div class="columns">
                 <div class="col">
                     <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775127006341-530542352.jpg">
                     <h3>Parcours d'exception</h3>
                     <p>18 trous entre dunes et pins, un parcours qui séduit tous les golfeurs.</p>
                 </div>
                 <div class="col">
                     <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775127376632-335397054.png">
                     <h3>Académie & Innovations</h3>
                     <p>Perfectionnez votre swing avec nos coachs professionnels.</p>
                 </div>
             </div>
        </div>
        <div class="footer">
            © 2026 Golf Huub. Tous droits réservés.
        </div>
    </div>
</body>
</html>
    `
  },
  {
    id: 'golf-premium-en',
    nom: 'Golf Club Premium (EN)',
    categorie: 'Newsletter',
    description: 'Elegant official template for golf clubs, including event sections and gallery (English version).',
    thumbnail: 'https://placehold.co/400x300/204170/ffffff?text=Golf+Premium+EN',
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
        <img src="https://crm2.citrusgolfclub.com/api/templates/media/1775125427987-221369714.png" class="hero-img">
        <div class="content">
            <h2 class="title">A word from our Director</h2>
            <p class="text">
                "Since its creation, Citrus Golf Club Hammamet has offered a unique experience,
                blending nature, excellence and innovation. Your vote at the World Golf Awards will allow us
                to share our passion with the entire world."
            </p>
            <a href="#" class="btn">Vote Now →</a>
        </div>
        <div class="footer">
            © 2026 Golf Huub. All rights reserved.
        </div>
    </div>
</body>
</html>
    `
  },
  {
    id: 'minimal-invitation',
    nom: 'Invitation Minimaliste',
    categorie: 'Événement',
    description: 'Design épuré et moderne pour vos invitations exclusives.',
    thumbnail: 'https://placehold.co/400x300/008c95/ffffff?text=Invitation+Minimal',
    contenu_html: `
<div style="font-family: Arial; padding: 40px; background: #fafafa;">
    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; border: 1px solid #eee;">
        <h1 style="color: #333; text-align: center;">Invitation</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Bonjour {{prenom}},<br><br>
            Nous avons le plaisir de vous inviter à notre prochain événement exclusif qui se tiendra la semaine prochaine.
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: #008c95; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmer ma présence</a>
        </div>
    </div>
</div>
    `
  },
  {
    id: 'golf-results',
    nom: 'Résultats de Tournoi',
    categorie: 'Golf',
    description: 'Partagez les scores, podiums et photos de votre dernière compétition.',
    thumbnail: 'https://placehold.co/400x300/1b5e20/ffffff?text=Tournoi+Results',
    contenu_html: `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
        <div style="background-color: #1b5e20; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Félicitations aux Vainqueurs !</h1>
        </div>
        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #1b5e20;">Résultats du Weekend</h2>
            <p style="font-size: 16px; color: #555;">Une superbe journée sur le green. Retrouvez le classement complet du tournoi ci-dessous.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr style="background-color: #f9f9f9;">
                    <th style="padding: 10px; border-bottom: 2px solid #1b5e20; text-align: left;">Rang</th>
                    <th style="padding: 10px; border-bottom: 2px solid #1b5e20; text-align: left;">Joueur</th>
                    <th style="padding: 10px; border-bottom: 2px solid #1b5e20; text-align: right;">Score</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">1er</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Jean Dupont</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">-4</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">2ème</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">Marc Lefebvre</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">-2</td>
                </tr>
            </table>
            <div style="margin-top: 30px;">
                <a href="#" style="background-color: #1b5e20; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Voir toutes les photos</a>
            </div>
        </div>
    </div>
</div>
    `
  },
  {
    id: 'golf-membership',
    nom: 'Renouvellement Adhésion',
    categorie: 'Golf',
    description: 'Encouragez vos membres à renouveler leur abonnement annuel.',
    thumbnail: 'https://placehold.co/400x300/2c3e50/ffffff?text=Membership+Renew',
    contenu_html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
    <div style="background: #2c3e50; color: white; padding: 40px; text-align: center;">
        <h1 style="margin: 0;">Saison 2026</h1>
        <p style="font-size: 18px; margin-top: 10px;">Il est temps de renouveler votre passion</p>
    </div>
    <div style="padding: 40px;">
        <p>Cher {{prenom}},</p>
        <p>Nous espérons que vous avez passé une excellente année sur nos parcours. La nouvelle saison approche et nous serions ravis de vous compter à nouveau parmi nos membres privilégiés.</p>
        <div style="background: #fdfaf7; border-left: 4px solid #f2b82e; padding: 20px; margin: 20px 0;">
            <strong>Vos avantages maintenus :</strong>
            <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li>Accès illimité aux 36 trous</li>
                <li>-15% sur tout le Pro-Shop</li>
                <li>Invitation aux tournois exclusifs</li>
            </ul>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: #f2b82e; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 18px;">Renouveler mon Adhésion</a>
        </div>
    </div>
</div>
    `
  },
  {
    id: 'proshop-promo',
    nom: 'Vente Flash Pro-Shop',
    categorie: 'Shop',
    description: 'Promouvez les nouveaux équipements ou des remises saisonnières.',
    thumbnail: 'https://placehold.co/400x300/e74c3c/ffffff?text=ProShop+Sale',
    contenu_html: `
<div style="font-family: 'Impact', sans-serif; text-align: center; max-width: 600px; margin: 0 auto; background: #fff;">
    <div style="background: #e74c3c; color: white; padding: 20px;">
        <h1 style="margin: 0; font-size: 40px;">VENTE FLASH !</h1>
        <p style="font-size: 20px;">-30% SUR TOUT LE SHOP</p>
    </div>
    <div style="padding: 20px;">
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
                <img src="https://placehold.co/200x200?text=Driver+Z" style="width: 100%;">
                <h3 style="margin: 10px 0;">Driver Titanium Z</h3>
                <p style="color: #e74c3c; font-size: 24px; font-weight: bold;">299€ <span style="font-size: 14px; color: #999; text-decoration: line-through;">429€</span></p>
                <a href="#" style="background: #333; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px;">Acheter</a>
            </div>
             <div style="flex: 1; min-width: 250px; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
                <img src="https://placehold.co/200x200?text=Gants+Pro" style="width: 100%;">
                <h3 style="margin: 10px 0;">Pack de 3 Gants Pro</h3>
                <p style="color: #e74c3c; font-size: 24px; font-weight: bold;">45€ <span style="font-size: 14px; color: #999; text-decoration: line-through;">65€</span></p>
                <a href="#" style="background: #333; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px;">Acheter</a>
            </div>
        </div>
        <p style="margin-top: 30px; font-family: sans-serif; color: #666;">Offre valable jusqu'à dimanche minuit, dans la limite des stocks disponibles.</p>
    </div>
</div>
    `
  },
  {
    id: 'course-update',
    nom: 'État du Parcours',
    categorie: 'Info',
    description: 'Une mise à jour propre sur la météo et la jouabilité du terrain.',
    thumbnail: 'https://placehold.co/400x300/3498db/ffffff?text=Course+Update',
    contenu_html: `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; background: #fdfdfd;">
    <div style="padding: 20px; border-bottom: 2px solid #3498db;">
        <h2 style="color: #3498db; margin: 0;">Mise à jour du Parcours</h2>
        <p style="color: #888; margin: 5px 0 0;">Lundi 13 Avril 2026</p>
    </div>
    <div style="padding: 30px;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="font-size: 40px; margin-right: 20px;">☀️</div>
            <div>
                <h3 style="margin: 0;">Grand Soleil</h3>
                <p style="margin: 0; color: #666;">Température : 22°C | Vent : 10km/h</p>
            </div>
        </div>
        <div style="background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
             <table style="width: 100%;">
                 <tr>
                    <td style="padding: 10px 0;"><strong>Vitesse des Greens :</strong></td>
                    <td style="text-align: right; color: #1b5e20;">Rapide (3.2m)</td>
                 </tr>
                  <tr>
                    <td style="padding: 10px 0;"><strong>Chariots :</strong></td>
                    <td style="text-align: right; color: #1b5e20;">Autorisés</td>
                 </tr>
                  <tr>
                    <td style="padding: 10px 0;"><strong>Hivernage :</strong></td>
                    <td style="text-align: right;">Terminé</td>
                 </tr>
             </table>
        </div>
        <p style="margin-top: 25px; font-style: italic; text-align: center;">"Le terrain est dans un état exceptionnel ce matin, profitez-en !"</p>
    </div>
</div>
    `
  },
  {
    id: 'generic-product-launch',
    nom: 'Lancement Produit',
    categorie: 'Business',
    description: 'Structure moderne pour annoncer un nouveau service ou produit.',
    thumbnail: 'https://placehold.co/400x300/9b59b6/ffffff?text=Product+Launch',
    contenu_html: `
<div style="font-family: sans-serif; background: #000; color: #fff; padding: 60px 20px; text-align: center;">
    <h3 style="color: #9b59b6; text-transform: uppercase; letter-spacing: 2px;">Enfin disponible</h3>
    <h1 style="font-size: 48px; margin: 10px 0;">Le Futur est Ici.</h1>
    <p style="max-width: 450px; margin: 20px auto; color: #ccc; font-size: 18px; line-height: 1.6;">Nous avons repensé chaque détail pour vous offrir l'expérience ultime. Plus rapide, plus intelligent, plus intuitif.</p>
    <div style="margin: 40px 0;">
        <img src="https://placehold.co/500x300/333/9b59b6?text=New+Feature+Mockup" style="max-width: 100%; border-radius: 10px;">
    </div>
    <a href="#" style="background: #9b59b6; color: white; padding: 18px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 20px;">Découvrir en avant-première</a>
</div>
    `
  },
  {
    id: 'generic-review-request',
    nom: 'Avis Client',
    categorie: 'Business',
    description: 'Un modèle minimaliste pour solliciter des avis après une visite.',
    thumbnail: 'https://placehold.co/400x300/f1c40f/ffffff?text=Review+Request',
    contenu_html: `
<div style="font-family: Arial, sans-serif; padding: 50px 20px; text-align: center; color: #444;">
    <div style="font-size: 40px; margin-bottom: 20px;">⭐</div>
    <h2>Votre avis compte énormément !</h2>
    <p style="max-width: 400px; margin: 0 auto 30px;">Bonjour {{prenom}}, nous espérons que votre récente expérience chez nous vous a plu. Pourriez-vous prendre 30 secondes pour nous laisser une note ?</p>
    <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 30px;">
        <a href="#" style="text-decoration: none; font-size: 30px; border: 1px solid #ddd; padding: 10px; border-radius: 10px;">😞</a>
        <a href="#" style="text-decoration: none; font-size: 30px; border: 1px solid #ddd; padding: 10px; border-radius: 10px;">😐</a>
        <a href="#" style="text-decoration: none; font-size: 30px; border: 1px solid #ddd; padding: 10px; border-radius: 10px;">🤩</a>
    </div>
    <p style="font-size: 13px; color: #999;">Merci pour votre fidélité !</p>
</div>
    `
  },
  {
    id: 'generic-welcome',
    nom: 'Bienvenue / Onboarding',
    categorie: 'Business',
    description: 'Layout étagé pour accueillir et guider un nouvel utilisateur.',
    thumbnail: 'https://placehold.co/400x300/2ecc71/ffffff?text=Welcome+Email',
    contenu_html: `
<div style="font-family: Segoe UI, sans-serif; color: #2c3e50;">
    <div style="background: #2ecc71; height: 10px;"></div>
    <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
        <h1>Ravi de vous voir ici, {{prenom}} !</h1>
        <p style="font-size: 18px;">Voici comment bien démarrer avec notre plateforme :</p>
        <div style="margin-top: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #2ecc71; color: white; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</div>
                <p style="margin: 0;">Complétez votre profil utilisateur.</p>
            </div>
             <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #2ecc71; color: white; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">2</div>
                <p style="margin: 0;">Connectez vos sources de données.</p>
            </div>
             <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #2ecc71; color: white; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">3</div>
                <p style="margin: 0;">Lancez votre première analyse.</p>
            </div>
        </div>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d;">Besoin d'aide ? Répondez simplement à cet email.</p>
        </div>
    </div>
</div>
    `
  }
];
