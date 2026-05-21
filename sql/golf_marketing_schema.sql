CREATE DATABASE IF NOT EXISTS golf_marketing;
USE golf_marketing;

CREATE TABLE utilisateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    sexe ENUM('Homme', 'Femme', 'Autre'),
    handicap DECIMAL(4,1),
    home_club VARCHAR(100),
    date_naissance DATE,
    nationalite VARCHAR(50),
    type_client ENUM('membre', 'entreprise'),
    ville VARCHAR(100),
    entreprise VARCHAR(100),
    notes TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL
);

CREATE TABLE contact_tag (
    contact_id INT,
    tag_id INT,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
);

CREATE TABLE segment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    criteres JSON NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campagne_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(100) NOT NULL,
    contenu_html TEXT NOT NULL,
    date_envoi DATETIME,
    statut ENUM('en_attente', 'envoyé') DEFAULT 'en_attente',
    createur_id INT,
    segment_id INT,
    FOREIGN KEY (createur_id) REFERENCES utilisateur(id),
    FOREIGN KEY (segment_id) REFERENCES segment(id)
);

CREATE TABLE statistique_campagne (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campagne_id INT,
    nb_envoyes INT DEFAULT 0,
    nb_ouverts INT DEFAULT 0,
    nb_clics INT DEFAULT 0,
    nb_desabonnements INT DEFAULT 0,
    FOREIGN KEY (campagne_id) REFERENCES campagne_email(id) ON DELETE CASCADE
);

CREATE TABLE evenement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(100) NOT NULL,
    date DATETIME NOT NULL,
    lieu VARCHAR(100) NOT NULL,
    description TEXT,
    index_requis DECIMAL(4,1)
);

CREATE TABLE rsvp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT,
    evenement_id INT,
    statut ENUM('invité', 'confirmé', 'absent') DEFAULT 'invité',
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE CASCADE,
    FOREIGN KEY (evenement_id) REFERENCES evenement(id) ON DELETE CASCADE
);

CREATE TABLE modele_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    contenu_html TEXT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);
