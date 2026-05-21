# Import Column Structure Guide

## ✅ Your Platform Column Structure

The import system is now configured to work with your exact platform column structure. Only the columns listed below will be imported, all others will be ignored.

## Supported Columns (Will be imported)

The system supports both French and English column names:

### French Column Names (Preferred)
| Column Name | Description | Example |
|-------------|-------------|---------|
| `Prénom` | First name | Jean |
| `Nom` | Last name | Dupont |
| `Email` | Email address (required) | jean.dupont@example.com |
| `Téléphone` | Phone number | +33123456789 |
| `Sexe` | Gender | Homme, Femme, Autre |
| `Statut` | Status | prospect, client, archivé |
| `Ville` | City | Paris |
| `Entreprise` | Company | ABC Corp |
| `Catégorie` | Category name | Membres VIP |
| `Distribution` | Distribution name | Agence France |
| `Tags` | Tags (comma-separated) | VIP, Golf, Paris |

### English Column Names (Also Supported)
| Column Name | Description | Example |
|-------------|-------------|---------|
| `firstname` | First name | Jean |
| `lastname` | Last name | Dupont |
| `email` | Email address (required) | jean.dupont@example.com |
| `telephone` / `phone` / `mobile` | Phone number | +33123456789 |
| `sex` / `gender` | Gender | Homme, Femme, Autre |
| `status` | Status | prospect, client, archivé |
| `city` | City | Paris |
| `company` | Company | ABC Corp |
| `category` | Category name | Membres VIP |
| `distribution` | Distribution name | Agence France |
| `tags` | Tags (comma-separated) | VIP, Golf, Paris |

## Required Columns (Must be present)

| Column Name | Description | Example |
|-------------|-------------|---------|
| `Email` | Email address | jean.dupont@example.com |

## Optional Columns (Will be imported if present)

| Column Name | Description | Example | Notes |
|-------------|-------------|---------|-------|
| `Prénom` | First name | Jean | |
| `Nom` | Last name | Dupont | |
| `Téléphone` | Phone number | +33123456789 | |
| `Sexe` | Gender | Homme, Femme, Autre | |
| `Statut` | Status | prospect, client, archivé | |
| `Ville` | City | Paris | |
| `Entreprise` | Company | ABC Corp | |
| `Catégorie` | Category name | Membres VIP | Will create category if new |
| `Distribution` | Distribution name | Agence France | Will create distribution if new |
| `Tags` | Tags (comma-separated) | VIP, Golf, Paris | Will create tags if new |
| `Segments` | Segments (comma-separated) | Membres actifs | Will create segments if new |

## Example Excel Structure

### French Column Structure (Preferred)
```
| Prénom | Nom | Email | Téléphone | Sexe | Statut | Ville | Entreprise | Catégorie | Distribution | Tags |
|--------|-----|-------|-----------|------|--------|-------|------------|-----------|--------------|------|
| Jean | Dupont | jean.dupont@example.com | +33123456789 | Homme | client | Paris | ABC Corp | Membres VIP | Agence France | VIP, Golf |
| Marie | Martin | marie.martin@example.com | +32456789012 | Femme | prospect | Bruxelles | XYZ Ltd | Mailing Agences | Agence Belgique | Nouveau |
```

### English Column Structure (Also Supported)
```
| firstname | lastname | email | telephone | sex | status | city | company | category | distribution | tags |
|-----------|----------|-------|-----------|-----|--------|------|---------|----------|--------------|------|
| Jean | Dupont | jean.dupont@example.com | +33123456789 | Homme | client | Paris | ABC Corp | Membres VIP | Agence France | VIP, Golf |
| Marie | Martin | marie.martin@example.com | +32456789012 | Femme | prospect | Bruxelles | XYZ Ltd | Mailing Agences | Agence Belgique | Nouveau |
```

## Download Template

Click the **"Template"** button in the Contacts page to download a sample Excel file with the correct column structure and example data.

## Common Import Errors

### ❌ Wrong Column Names
```
Error: Invalid file format. Required column 'Email' missing. 
Found: email, firstname, lastname
```

**Solution**: Rename your columns to match exactly:
- `email` → `Email`
- `firstname` → `Prénom`
- `lastname` → `Nom`
- `phone` → `Téléphone`
- `city` → `Ville`
- `company` → `Entreprise`

### ❌ Missing Required Columns
```
Error: Invalid file format. Required columns missing.
```

**Solution**: Ensure your file has at least this required column:
- `Email`

### ❌ Unexpected Columns
```
Warning: Columns that will be ignored: customer_id, mobile, fax, kitchen
```

**Solution**: These columns will be automatically ignored. Only the supported columns listed above will be imported.

## Step-by-Step Import Process

1. **Download Template**: Click "Template" button to get the correct format
2. **Prepare Your Data**: 
   - Use the template as a guide
   - Ensure column names match exactly
   - Fill in at least the Email column (required)
3. **Import File**: Click "Importer" and select your file
4. **Review Results**: Check the import summary for any issues

## Data Validation Rules

- **Email**: Must be unique and valid format
- **Sexe**: Must be "Homme", "Femme", or "Autre"
- **Type Client**: Must be "membre" or "entreprise"
- **Statut**: Must be "prospect", "client", or "archivé"
- **Dates**: Must be in YYYY-MM-DD format
- **Handicap**: Must be a decimal number
- **Consentement RGPD**: Must be "true" or "false"

## Tips for Successful Import

1. **Use the Template**: Always start with the provided template
2. **Check Column Names**: Ensure exact spelling and case
3. **Validate Data**: Check for required fields and valid formats
4. **Test with Small Files**: Import a few records first
5. **Backup Data**: Always backup before large imports

## Support

If you encounter import issues:
1. Check the error message for specific column problems
2. Download and use the template as a reference
3. Ensure your data matches the expected format
4. Contact support if problems persist
