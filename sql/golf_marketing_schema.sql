-- MySQL Schema for Golf Huub Marketing Platform
-- Fully synchronized with Sequelize models, multi-tenant (club_id) and
-- production-ready with optimal indexes.
-- Used to bootstrap the CI test database (see .github/workflows/ci.yml) -
-- in normal dev/prod use, backend/utils/migrationRunner.js applies
-- backend/migrations/*.js automatically on server boot instead.

CREATE DATABASE IF NOT EXISTS golf_marketing CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE golf_marketing;

-- Critical: must be set BEFORE any table definitions that contain accented
-- characters in ENUM values ('programmée', 'envoyée', etc.) otherwise the
-- MySQL Docker init process will double-encode UTF-8 multibyte chars,
-- causing "Data truncated" errors when Node.js mysql2 later tries to
-- insert the correctly-encoded values.
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 0. Club (tenant root - never itself tenant-scoped)
CREATE TABLE IF NOT EXISTS club (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    email_contact VARCHAR(150),
    statut ENUM('actif', 'suspendu', 'archive') NOT NULL DEFAULT 'actif',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO club (id, nom, slug, statut) VALUES (1, 'Club par défaut', 'default', 'actif')
    ON DUPLICATE KEY UPDATE id = id;

-- 1. Utilisateurs (Platform users/employees)
CREATE TABLE IF NOT EXISTS utilisateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee', 'global_admin') NOT NULL DEFAULT 'employee',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_utilisateur_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Abonnements (Membership plans) - unique per club, not globally
CREATE TABLE IF NOT EXISTS abonnement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prix DECIMAL(10, 2) DEFAULT 0.00,
    duree_mois INT DEFAULT 12,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    UNIQUE KEY uniq_abonnement_club_nom (club_id, nom),
    INDEX idx_abonnement_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Categories (Contact category tags/segments) - unique per club
CREATE TABLE IF NOT EXISTS category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    UNIQUE KEY uniq_category_club_nom (club_id, nom),
    INDEX idx_category_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Distributions (Distribution lists) - unique per club
CREATE TABLE IF NOT EXISTS distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    UNIQUE KEY uniq_distribution_club_nom (club_id, nom),
    INDEX idx_distribution_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Contacts (Audience/Players)
CREATE TABLE IF NOT EXISTS contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    sexe ENUM('Homme', 'Femme', 'Autre'),
    handicap DECIMAL(4,1),
    home_club VARCHAR(100),
    date_naissance DATETIME,
    nationalite VARCHAR(50),
    type_client ENUM('membre', 'entreprise'),
    ville VARCHAR(100),
    entreprise VARCHAR(100),
    remarques TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    adresse VARCHAR(255),
    code_postal VARCHAR(20),
    pays VARCHAR(100),
    statut ENUM('prospect', 'client', 'archivé') DEFAULT 'prospect',
    source VARCHAR(100),
    metadata JSON,
    historique JSON,
    date_inscription DATETIME,
    consentement_rgpd BOOLEAN DEFAULT FALSE,

    -- Foreign Keys
    abonnement_id INT,
    category_id INT,
    distribution_id INT,
    date_debut_abonnement DATETIME,
    date_expiration_abonnement DATETIME,
    statut_abonnement ENUM('actif', 'expiré', 'en_attente_paiement', 'aucun') DEFAULT 'aucun',
    dernier_paiement_info VARCHAR(255),
    club_id INT DEFAULT 1,

    FOREIGN KEY (abonnement_id) REFERENCES abonnement(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL,
    FOREIGN KEY (distribution_id) REFERENCES distribution(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,

    -- Performance Indexes
    INDEX idx_contact_email (email),
    INDEX idx_contact_sexe (sexe),
    INDEX idx_contact_handicap (handicap),
    INDEX idx_contact_ville (ville),
    INDEX idx_contact_type_client (type_client),
    INDEX idx_contact_statut (statut),
    INDEX idx_contact_actif (actif),
    INDEX idx_contact_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Tags
CREATE TABLE IF NOT EXISTS tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_tag_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. Contact-Tag Junction Table (Many-to-Many) - club_id denormalized from contact
CREATE TABLE IF NOT EXISTS contact_tag (
    contact_id INT,
    tag_id INT,
    club_id INT DEFAULT 1,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    -- Index for looking up contacts by tag
    INDEX idx_contact_tag_tag (tag_id),
    INDEX idx_contact_tag_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 8. Segments (Dynamic audience logic filters)
CREATE TABLE IF NOT EXISTS segment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    criteres JSON NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_segment_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 9. Campagnes Email
CREATE TABLE IF NOT EXISTS campagne_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(100) NOT NULL,
    sujet VARCHAR(200) NOT NULL,
    contenu_html LONGTEXT NOT NULL,
    contenu_texte TEXT,
    type_campagne ENUM('newsletter', 'promotion', 'invitation', 'notification', 'autre') DEFAULT 'newsletter',
    statut ENUM('brouillon', 'programmée', 'en_cours', 'envoyée', 'annulée', 'erreur') DEFAULT 'brouillon',
    priorite ENUM('basse', 'normale', 'haute', 'urgente') DEFAULT 'normale',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_programmation DATETIME,
    date_envoi DATETIME,
    date_fin DATETIME,
    createur_id INT NOT NULL,
    segment_id INT,
    tags_ids JSON,
    contacts_ids JSON,
    parametres JSON,
    limite_envois INT,
    nb_envoyes INT DEFAULT 0,
    nb_erreurs INT DEFAULT 0,
    actif BOOLEAN DEFAULT TRUE,
    club_id INT DEFAULT 1,

    FOREIGN KEY (createur_id) REFERENCES utilisateur(id),
    FOREIGN KEY (segment_id) REFERENCES segment(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,

    -- Performance Indexes
    INDEX idx_campagne_statut (statut),
    INDEX idx_campagne_date_prog (date_programmation),
    INDEX idx_campagne_actif (actif),
    INDEX idx_campagne_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 10. Statistiques de Campagne - club_id denormalized from campagne_email
CREATE TABLE IF NOT EXISTS statistique_campagne (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campagne_id INT UNIQUE,
    nb_envoyes INT DEFAULT 0,
    nb_ouverts INT DEFAULT 0,
    nb_clics INT DEFAULT 0,
    nb_desabonnements INT DEFAULT 0,
    club_id INT DEFAULT 1,
    FOREIGN KEY (campagne_id) REFERENCES campagne_email(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_statistique_campagne_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 11. Envois Emails (individual email queue & tracking stats) - club_id denormalized from contact
CREATE TABLE IF NOT EXISTS envoi_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campagne_id INT,
    contact_id INT NOT NULL,
    email_destinataire VARCHAR(255) NOT NULL,
    statut ENUM('en_attente', 'en_cours', 'envoyé', 'livré', 'ouvert', 'cliqué', 'bounce', 'spam', 'erreur') DEFAULT 'en_attente',
    date_envoi DATETIME,
    date_livraison DATETIME,
    date_ouverture DATETIME,
    date_clic DATETIME,
    nombre_ouvertures INT DEFAULT 0,
    nombre_clics INT DEFAULT 0,
    liens_cliques JSON,
    message_erreur TEXT,
    token_tracking VARCHAR(255) UNIQUE,
    actif BOOLEAN DEFAULT TRUE,
    club_id INT DEFAULT 1,

    FOREIGN KEY (campagne_id) REFERENCES campagne_email(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,

    -- Performance Indexes
    INDEX idx_envoi_campagne (campagne_id),
    INDEX idx_envoi_contact (contact_id),
    INDEX idx_envoi_statut (statut),
    INDEX idx_envoi_date_envoi (date_envoi),
    INDEX idx_envoi_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 12. Evenements
CREATE TABLE IF NOT EXISTS evenement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(100) NOT NULL,
    date DATETIME NOT NULL,
    lieu VARCHAR(100) NOT NULL,
    description TEXT,
    index_requis DECIMAL(4,1),
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_evenement_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 13. RSVP (Event bookings) - club_id denormalized from contact/evenement
CREATE TABLE IF NOT EXISTS rsvp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    evenement_id INT,
    statut ENUM('invité', 'confirmé', 'absent') DEFAULT 'invité',
    club_id INT DEFAULT 1,
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (evenement_id) REFERENCES evenement(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_rsvp_contact_event (contact_id, evenement_id),
    INDEX idx_rsvp_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 14. Modeles d'Email
CREATE TABLE IF NOT EXISTS modele_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    contenu_html LONGTEXT NOT NULL,
    blocks_json JSON,
    design_json JSON,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_modele_email_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 15. Notes - club_id denormalized from contact
CREATE TABLE IF NOT EXISTS note (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    contenu TEXT NOT NULL,
    auteur VARCHAR(100),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_note_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 16. Automations (Automated workflows)
CREATE TABLE IF NOT EXISTS automations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    actif BOOLEAN DEFAULT FALSE,
    config JSON,
    derniere_execution DATETIME,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    club_id INT DEFAULT 1,
    FOREIGN KEY (club_id) REFERENCES club(id) ON DELETE RESTRICT,
    INDEX idx_automations_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
