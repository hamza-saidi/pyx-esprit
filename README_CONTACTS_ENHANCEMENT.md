# Enhanced Contacts Module

This update adds Category and Distribution columns to the Contacts module, along with powerful import/export functionality for Excel and CSV files with automatic duplicate elimination.

## New Features

### 1. Category and Distribution Columns
- **Category**: Organize contacts by business categories (e.g., "Mailing Agences", "Membres VIP")
- **Distribution**: Group contacts by distribution channels (e.g., "Agence Belgique", "Agence France")
- Both columns are displayed as chips in the contacts table
- Categories and distributions are automatically created during import

### 2. Import Functionality
- **Supported Formats**: Excel (.xlsx, .xls) and CSV files
- **Duplicate Elimination**: Automatically removes duplicates based on email addresses
- **Smart Field Mapping**: Handles various column name formats
- **Large File Support**: Optimized for importing 5K+ contacts
- **Progress Feedback**: Real-time import status and results

### 3. Export Functionality
- **CSV Export**: Standard CSV format with all contact data
- **Excel Export**: Professional Excel format with proper formatting
- **Category/Distribution Data**: Exported files include category and distribution information

## Database Setup

### 1. Run the Database Migration
```sql
-- Execute the file: sql/add_categories_distributions.sql
```

This will:
- Create `category` and `distribution` tables
- Add foreign key columns to the `contact` table
- Insert sample categories and distributions

### 2. Install Required Packages
```bash
cd backend
npm install xlsx
```

## File Format Requirements

### Excel/CSV Column Mapping
The system automatically maps these column names:

| System Field | Accepted Column Names |
|--------------|----------------------|
| First Name | `firstname`, `FirstName`, `prenom` |
| Last Name | `lastname`, `LastName`, `nom` |
| Email | `email`, `Email` |
| Phone | `telephone`, `phone`, `mobile`, `Telephone` |
| Sex | `sex`, `Sex`, `gender` |
| City | `ville`, `city`, `Ville` |
| Company | `entreprise`, `company`, `Entreprise` |
| Category | `category`, `Category` |
| Distribution | `distribution`, `Distribution` |

### Example Excel Structure
```
| firstname | lastname | email | telephone | sex | ville | entreprise | category | distribution |
|-----------|----------|-------|-----------|-----|-------|------------|----------|--------------|
| John | Doe | john@example.com | +1234567890 | Male | Paris | ABC Corp | Mailing Agences | Agence France |
| Jane | Smith | jane@example.com | +0987654321 | Female | Brussels | XYZ Ltd | Membres VIP | Agence Belgique |
```

## API Endpoints

### Import
```bash
POST /api/contacts/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Upload Excel or CSV file
```

**Response:**
```json
{
  "message": "150 contacts importés",
  "total_processed": 200,
  "duplicates_skipped": 50,
  "categories_created": 3,
  "distributions_created": 2,
  "file_type": "XLSX"
}
```

### Export
```bash
# Export CSV
GET /api/contacts/export/csv
Authorization: Bearer <token>

# Export Excel
GET /api/contacts/export/excel
Authorization: Bearer <token>
```

## Frontend Features

### Import/Export Buttons
- **Import Button**: Upload Excel/CSV files with drag-and-drop support
- **Export CSV**: Download contacts in CSV format
- **Export Excel**: Download contacts in Excel format
- **Progress Indicators**: Loading states and success/error messages

### Enhanced Table
- **Category Column**: Displays category chips with color coding
- **Distribution Column**: Shows distribution chips with different colors
- **Responsive Design**: Table adapts to screen size
- **Sorting**: Click column headers to sort

### Smart Filtering
- Filter by category and distribution
- Search across all fields
- Status filtering (active/inactive)
- Tag-based filtering

## Duplicate Elimination Logic

### During Import
1. **File-level duplicates**: Removes duplicate emails within the imported file
2. **Database-level duplicates**: Skips contacts that already exist in the database
3. **Email normalization**: Converts emails to lowercase for comparison
4. **Progress tracking**: Shows how many duplicates were skipped

### Example Import Results
```
✅ 150 contacts importés
📊 200 traités, 50 doublons ignorés
🏷️ 3 catégories créées
📦 2 distributions créées
```

## Performance Optimizations

### Large File Handling
- **Streaming processing**: Handles files up to 50MB
- **Batch operations**: Processes contacts in optimized batches
- **Memory efficient**: Minimal memory footprint during import
- **Progress feedback**: Real-time status updates

### Database Optimizations
- **Bulk inserts**: Uses Sequelize bulkCreate for speed
- **Indexed queries**: Optimized for email lookups
- **Transaction safety**: Ensures data integrity

## Error Handling

### Import Errors
- **Invalid file format**: Clear error messages for unsupported files
- **Missing required fields**: Warnings for missing email addresses
- **Database errors**: Graceful handling of constraint violations
- **Network issues**: Retry mechanisms for failed uploads

### Export Errors
- **File size limits**: Handles large export files
- **Permission issues**: Clear error messages for access problems
- **Format errors**: Fallback to CSV if Excel generation fails

## Usage Examples

### Importing 5K Contacts
1. Prepare Excel file with 5K contacts
2. Click "Importer" button
3. Select file and wait for processing
4. Review import results
5. Check for any skipped duplicates

### Managing Categories
- Categories are automatically created during import
- Use existing categories for consistency
- Categories appear as chips in the contacts table

### Exporting Data
1. Click "Export Excel" for professional format
2. Click "Export CSV" for simple format
3. Files include all contact data with categories/distributions

## Troubleshooting

### Common Issues
1. **Import fails**: Check file format and column names
2. **Duplicates not detected**: Ensure email addresses are in correct column
3. **Slow import**: Large files may take several minutes
4. **Export fails**: Check file permissions and disk space

### Best Practices
1. **Backup data** before large imports
2. **Test with small files** first
3. **Use consistent column names** across imports
4. **Review import results** for any issues

## Future Enhancements

- **Bulk category assignment**: Assign categories to multiple contacts
- **Advanced filtering**: Filter by multiple categories/distributions
- **Import templates**: Download sample files with correct format
- **Scheduled imports**: Automated import from external sources
- **Data validation**: Enhanced validation rules for imported data

## One-Time Tag-Based Segments

To bootstrap ready-to-use segments that group contacts by their tags (e.g. Agences, Tour Operators, Journalistes), run the helper script once the tags already exist in your database:

```bash
cd backend
node create-tag-based-segments.js
```

The script will create or refresh the following segments with matching tag IDs:

| Segment | Matching tags (case-insensitive) |
|---------|----------------------------------|
| Agences | `agence`, `agences`, related variations |
| TO (Tour Operators) | Tags starting with `TO `, `tour operator`, `tour opérateur`, etc. |
| Tour Leaders | `tour leader`, `TL`, similar forms |
| Journalistes | `journaliste`, `journalist`, `press` |
| Golfeurs | `golf`, `golfeur`, `golfeuse` |
| Abonnés | `abonné`, `abonne`, `subscriber` |

You can adapt the matching rules inside `backend/create-tag-based-segments.js` and rerun the script whenever you need to refresh those groupings.


