require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { CampagneEmail, StatistiqueCampagne } = require('./models');

async function debug() {
  console.log('--- DIAGNOSTIC CAMPAGNE ---');
  console.log('PUBLIC_BASE_URL:', process.env.PUBLIC_BASE_URL);
  
  try {
    const campagne = await CampagneEmail.findOne({ order: [['id', 'DESC']] });
    if (!campagne) {
      console.log('❌ Aucune campagne trouvée.');
      return;
    }

    console.log('Campagne ID:', campagne.id);
    console.log('Titre:', campagne.titre);
    console.log('Statut:', campagne.statut);
    
    const html = campagne.contenu_html || '';
    console.log('HTML Length:', html.length);
    
    const regex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const images = [];
    while ((match = regex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    console.log(`Images trouvées dans le HTML (${images.length}):`);
    const uploadsDir = path.join(__dirname, 'uploads');
    const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

    for (const url of images) {
      console.log(`- URL: ${url}`);
      let safeName = null;
      if (baseUrl && url.startsWith(baseUrl)) {
        const pathPart = url.substring(baseUrl.length);
        const mediaMatch = pathPart.match(/\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/);
        if (mediaMatch) safeName = mediaMatch[2];
      } else if (url.startsWith('/api/')) {
        const mediaMatch = url.match(/\/api\/(templates\/media|campagne\/attachments)\/([^"'\s?#]+)/);
        if (mediaMatch) safeName = mediaMatch[2];
      }

      if (!safeName) {
        console.log(`  ⚠️ Non localisable (externe ou format inconnu)`);
        continue;
      }

      const filePath = path.join(uploadsDir, safeName);
      const exists = fs.existsSync(filePath);
      console.log(`  Nom détecté: ${safeName}`);
      console.log(`  Chemin disque: ${filePath}`);
      console.log(`  Existe sur disque: ${exists ? '✅ OUI' : '❌ NON'}`);
    }

    // Check directory permissions/list
    console.log('\n--- CONTENU DOSSIER UPLOADS (5 derniers fichiers) ---');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir)
        .map(f => ({ name: f, time: fs.statSync(path.join(uploadsDir, f)).mtime }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 5);
      
      files.forEach(f => console.log(`- ${f.name} (${f.time.toISOString()})`));
    } else {
      console.log('❌ Dossier uploads non trouvé!');
    }

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
  }
}

debug();
