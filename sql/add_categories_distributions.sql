-- Add category and distribution tables
USE golf_marketing;

-- Create category table
CREATE TABLE IF NOT EXISTS category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create distribution table
CREATE TABLE IF NOT EXISTS distribution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id and distribution_id to contact table
ALTER TABLE contact 
ADD COLUMN category_id INT,
ADD COLUMN distribution_id INT,
ADD FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL,
ADD FOREIGN KEY (distribution_id) REFERENCES distribution(id) ON DELETE SET NULL;

-- Add some sample categories and distributions
INSERT IGNORE INTO category (nom, description) VALUES 
('Mailing Agences', 'Catégorie pour les agences de voyage'),
('Membres VIP', 'Catégorie pour les membres VIP'),
('Entreprises', 'Catégorie pour les entreprises'),
('Prospects', 'Catégorie pour les prospects');

INSERT IGNORE INTO distribution (nom, description) VALUES 
('Agence Belgique', 'Distribution pour les agences en Belgique'),
('Agence France', 'Distribution pour les agences en France'),
('Agence Suisse', 'Distribution pour les agences en Suisse'),
('International', 'Distribution internationale');
