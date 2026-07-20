/**
 * utils/clubStatusEmailTemplates.js
 *
 * Subject/HTML pairs for the email sent to a club's `email_contact` when a
 * SaaS admin changes its status (see routes/superadmin.js PATCH /clubs/:id).
 * Kept out of the route file since there are 4 variants.
 */

const WRAP = (title, bodyHtml) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;line-height:1.6;">
    <h2 style="color:#0f172a;">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:24px;color:#64748b;font-size:13px;">
      L'équipe Pylon Pyx
    </p>
  </div>
`;

const TEMPLATES = {
  suspendu: (club) => ({
    subject: `Votre espace Pylon Pyx a été suspendu`,
    html: WRAP(
      'Espace suspendu',
      `<p>Bonjour,</p>
       <p>L'accès de <strong>${club.nom}</strong> à Pylon Pyx a été suspendu par l'équipe support. Vos utilisateurs ne peuvent plus se connecter tant que la suspension est en vigueur.</p>
       <p>Si vous pensez qu'il s'agit d'une erreur, contactez le support Pylon Pyx.</p>`
    ),
  }),
  actif: (club) => ({
    subject: `Votre espace Pylon Pyx a été réactivé`,
    html: WRAP(
      'Espace réactivé',
      `<p>Bonjour,</p>
       <p>Bonne nouvelle : l'accès de <strong>${club.nom}</strong> à Pylon Pyx a été réactivé. Vos utilisateurs peuvent de nouveau se connecter normalement.</p>`
    ),
  }),
  archive: (club) => ({
    subject: `Votre espace Pylon Pyx a été archivé`,
    html: WRAP(
      'Espace archivé',
      `<p>Bonjour,</p>
       <p>L'espace <strong>${club.nom}</strong> a été archivé. Vos données sont conservées mais l'accès n'est plus disponible.</p>
       <p>Contactez le support Pylon Pyx si vous souhaitez le restaurer.</p>`
    ),
  }),
};

/**
 * @param {string} newStatut - 'actif' | 'suspendu' | 'archive'
 * @param {{nom: string}} club
 * @returns {{subject: string, html: string} | null} null if no template exists for this status
 */
function getClubStatusEmail(newStatut, club) {
  const builder = TEMPLATES[newStatut];
  return builder ? builder(club) : null;
}

module.exports = { getClubStatusEmail };
