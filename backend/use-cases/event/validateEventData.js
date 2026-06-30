// Business-rule validation (kept separate from the zod shape schema since
// these rules are conditional/cross-field - e.g. date must be in the
// future, which zod's .strict() shape check doesn't express well).
function validateEventData(data) {
  const errors = [];

  if (!data.titre || data.titre.trim().length < 3) {
    errors.push('Le titre doit contenir au moins 3 caractères');
  }

  if (!data.date || new Date(data.date) <= new Date()) {
    errors.push("La date de l'événement doit être dans le futur");
  }

  if (!data.lieu || data.lieu.trim().length < 2) {
    errors.push('Le lieu doit contenir au moins 2 caractères');
  }

  if (data.index_requis && (data.index_requis < -54 || data.index_requis > 54)) {
    errors.push("L'index requis doit être entre -54 et +54");
  }

  if (data.capacite_max && data.capacite_max < 1) {
    errors.push('La capacité maximale doit être supérieure à 0');
  }

  return errors;
}

module.exports = validateEventData;
