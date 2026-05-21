const fs = require('fs');
const path = require('path');

console.log('Testing XLSX package installation...');

try {
  const XLSX = require('xlsx');
  console.log('✅ XLSX package is installed successfully');
  console.log('XLSX version:', XLSX.version);
  
  // Test basic functionality
  const testData = [
    { 'Prénom': 'Test', 'Nom': 'User', 'Email': 'test@example.com' }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  console.log('✅ XLSX can create Excel files successfully');
  console.log('Buffer size:', buffer.length, 'bytes');
  
} catch (error) {
  console.error('❌ XLSX package error:', error.message);
  console.log('\nTo install XLSX package, run:');
  console.log('npm install xlsx');
}

console.log('\nTesting file detection...');

// Test file header detection
function testFileHeader(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const isExcelFile = buffer[0] === 0x50 && buffer[1] === 0x4B; // PK
    console.log(`File: ${path.basename(filePath)}`);
    console.log(`  - Size: ${buffer.length} bytes`);
    console.log(`  - Header: ${buffer.slice(0, 4).toString('hex')}`);
    console.log(`  - Is Excel: ${isExcelFile ? 'Yes' : 'No'}`);
    return isExcelFile;
  } catch (error) {
    console.log(`File: ${path.basename(filePath)} - Error: ${error.message}`);
    return false;
  }
}

// Check if there are any Excel files in the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
      testFileHeader(path.join(uploadsDir, file));
    }
  });
}

console.log('\nTest completed!');


