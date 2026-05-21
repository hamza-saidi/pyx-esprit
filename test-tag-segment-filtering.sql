-- ============================================
-- SQL Queries to Test Tag and Segment Filtering
-- Run these in your Plesk MySQL database
-- ============================================

-- 1. Check if tables exist and their structure
SHOW TABLES LIKE 'contact%';
SHOW TABLES LIKE 'tag%';
SHOW TABLES LIKE 'segment%';

-- 2. Check table structure (case sensitivity)
DESCRIBE contact;
DESCRIBE contact_tag;
DESCRIBE tag;
DESCRIBE segment;

-- 3. Test: Get a sample contact with tags
SELECT 
    c.id,
    c.prenom,
    c.nom,
    c.email,
    GROUP_CONCAT(t.id) as tag_ids,
    GROUP_CONCAT(t.nom) as tag_names
FROM contact c
LEFT JOIN contact_tag ct ON ct.contact_id = c.id
LEFT JOIN tag t ON t.id = ct.tag_id
GROUP BY c.id
LIMIT 5;

-- 4. Test: Filter contacts by a specific tag ID (replace 1549 with an actual tag ID)
-- This simulates what the API does
SELECT DISTINCT c.*
FROM contact c
WHERE EXISTS (
    SELECT 1 
    FROM contact_tag ct 
    WHERE ct.contact_id = c.id 
    AND ct.tag_id = 1549
)
LIMIT 10;

-- 5. Test: Check if tag ID 1549 exists
SELECT * FROM tag WHERE id = 1549;

-- 6. Test: Get all contacts with their tag associations
SELECT 
    c.id as contact_id,
    c.email,
    ct.tag_id,
    t.nom as tag_name
FROM contact c
INNER JOIN contact_tag ct ON ct.contact_id = c.id
INNER JOIN tag t ON t.id = ct.tag_id
ORDER BY c.id
LIMIT 20;

-- 7. Test: Count contacts per tag
SELECT 
    t.id as tag_id,
    t.nom as tag_name,
    COUNT(ct.contact_id) as contact_count
FROM tag t
LEFT JOIN contact_tag ct ON ct.tag_id = t.id
GROUP BY t.id, t.nom
ORDER BY contact_count DESC
LIMIT 20;

-- 8. Test: Filter by multiple tag IDs (comma-separated like the API)
-- Replace the tag IDs with actual values
SELECT DISTINCT c.*
FROM contact c
WHERE EXISTS (
    SELECT 1 
    FROM contact_tag ct 
    WHERE ct.contact_id = c.id 
    AND ct.tag_id IN (1549, 1550, 1551)
)
LIMIT 10;

-- 9. Test: Check segment table and structure
SELECT * FROM segment LIMIT 5;

-- 10. Test: Check if segments have criteria with tag_ids
SELECT 
    id,
    nom,
    criteres,
    JSON_EXTRACT(criteres, '$.tag_ids') as tag_ids_from_criteria
FROM segment
WHERE JSON_EXTRACT(criteres, '$.tag_ids') IS NOT NULL
LIMIT 5;

-- 11. Test: The exact query that might be failing (with table alias)
-- This tests if 'contacts' alias works (Sequelize might use this)
SELECT DISTINCT c.*
FROM contact c
WHERE EXISTS (
    SELECT 1 
    FROM contact_tag ct 
    WHERE ct.contact_id = contacts.id 
    AND ct.tag_id IN (1549)
)
LIMIT 10;
-- NOTE: If this fails with "Unknown column 'contacts.id'", 
-- then the issue is the table alias. The fix should use 'contact.id' not 'contacts.id'

-- 12. Test: The corrected query (using actual table name)
SELECT DISTINCT c.*
FROM contact c
WHERE EXISTS (
    SELECT 1 
    FROM contact_tag ct 
    WHERE ct.contact_id = contact.id 
    AND ct.tag_id IN (1549)
)
LIMIT 10;
-- NOTE: This might also fail if MySQL requires the alias 'c.id'

-- 13. Test: The safest query (using table alias)
SELECT DISTINCT c.*
FROM contact c
WHERE EXISTS (
    SELECT 1 
    FROM contact_tag ct 
    WHERE ct.contact_id = c.id 
    AND ct.tag_id IN (1549)
)
LIMIT 10;
-- This should work - it uses the alias 'c' defined in the FROM clause

-- 14. Check MySQL case sensitivity settings
SHOW VARIABLES LIKE 'lower_case_table_names';
-- 0 = case sensitive, 1 = lowercase, 2 = case insensitive but stores as lowercase

-- 15. Test: Check actual table name case in information_schema
SELECT TABLE_NAME, TABLE_TYPE 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('contact', 'Contact', 'CONTACT', 'contacts', 'Contacts', 'CONTACTS');











