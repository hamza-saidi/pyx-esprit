#!/usr/bin/env node

/**
 * Deployment Preparation Script for Golf Marketing Application
 * This script helps prepare your files for FileZilla upload
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Golf Marketing App - Deployment Preparation');
console.log('===============================================\n');

// Check if frontend is built
const distPath = path.join(__dirname, 'frontend', 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
    console.error('❌ Frontend not built! Please run:');
    console.error('   cd frontend && npm run build');
    process.exit(1);
}

console.log('✅ Frontend build found');

// Check required files
const requiredFiles = [
    'frontend/dist/index.html',
    'frontend/dist/assets',
    'backend/package.json',
    'backend/server.js',
    'backend/app.js',
    'sql/golf_marketing_schema.sql'
];

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

// Create deployment checklist
console.log('\n📋 FileZilla Upload Checklist:');
console.log('================================');
console.log('1. Connect FileZilla to your hosting');
console.log('2. Navigate to web root (public_html, www, htdocs)');
console.log('3. Upload from frontend/dist/:');
console.log('   ├── index.html → root');
console.log('   ├── assets/ → root');
console.log('   ├── logo.svg → root');
console.log('   └── logo-full.svg → root');
console.log('4. Upload .htaccess → root');
console.log('5. Create api/ folder in root');
console.log('6. Upload backend/ contents → api/');
console.log('7. Upload your .env file → api/');
console.log('8. Set up database using sql/golf_marketing_schema.sql');

console.log('\n🔗 Quick Links:');
console.log('- Deployment Guide: DEPLOYMENT_GUIDE.md');
console.log('- Environment Template: production.env.example');
console.log('- Database Schema: sql/golf_marketing_schema.sql');

console.log('\n✨ Ready for deployment! Good luck! 🏌️‍♂️');









