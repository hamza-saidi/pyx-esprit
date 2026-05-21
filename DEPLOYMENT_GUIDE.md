# 🚀 FileZilla Deployment Guide - Golf Marketing Application

## 📋 Prerequisites

Before deploying with FileZilla, ensure you have:
- ✅ FileZilla Client installed
- ✅ Web hosting account with FTP/SFTP access
- ✅ Domain name or subdomain configured
- ✅ MySQL database on your hosting provider
- ✅ Node.js support on your hosting (if available)

## 🏗️ Deployment Architecture

Your application has two parts:
1. **Frontend** (React SPA) - Static files in `frontend/dist/`
2. **Backend** (Node.js API) - Server files in `backend/`

## 📁 Files to Upload

### Option 1: Static Frontend Only (Recommended for shared hosting)

If your hosting doesn't support Node.js, you can deploy just the frontend and use an external API service:

**Upload these files to your web root (public_html, www, or htdocs):**
```
frontend/dist/
├── index.html
├── logo.svg
├── logo-full.svg
└── assets/
    ├── *.js files
    └── *.css files
```

### Option 2: Full Stack Deployment (VPS/Dedicated hosting)

If you have Node.js support, upload both frontend and backend:

**Upload structure:**
```
your-domain.com/
├── public/ (frontend files)
│   ├── index.html
│   ├── logo.svg
│   ├── logo-full.svg
│   └── assets/
└── api/ (backend files)
    ├── package.json
    ├── server.js
    ├── app.js
    ├── models/
    ├── routes/
    ├── controllers/
    ├── middleware/
    ├── services/
    └── config/
```

## 🔧 Step-by-Step FileZilla Deployment

### Step 1: Prepare Your Files
1. Your frontend is already built in `frontend/dist/`
2. Backend files are in `backend/` folder

### Step 2: Connect with FileZilla
1. Open FileZilla
2. Enter your hosting credentials:
   - **Host:** ftp.yourdomain.com (or IP address)
   - **Username:** Your FTP username
   - **Password:** Your FTP password
   - **Port:** 21 (FTP) or 22 (SFTP)

### Step 3: Upload Frontend Files
1. Navigate to your web root directory (usually `public_html/` or `www/`)
2. Upload all contents from `frontend/dist/` to the root:
   - Drag `index.html` to root
   - Drag `assets/` folder to root
   - Drag `logo.svg` and `logo-full.svg` to root

### Step 4: Upload Backend Files (if supported)
1. Create an `api/` folder in your web root
2. Upload all `backend/` contents to the `api/` folder
3. Upload `package.json` and install dependencies on server

## ⚙️ Configuration Files

### .htaccess for Frontend (Apache servers)
I've created an `.htaccess` file for you. Upload this to your web root directory.

## 🗄️ Database Setup

### Step 1: Create MySQL Database
1. Log into your hosting control panel (cPanel, Plesk, etc.)
2. Create a new MySQL database named `golf_marketing_db`
3. Create a database user with full permissions
4. Note down the database credentials

### Step 2: Import Database Schema
1. Upload `sql/golf_marketing_schema.sql` via phpMyAdmin or similar
2. Run the SQL file to create all necessary tables

## 🔐 Environment Configuration

### Backend Environment Variables
1. Copy `production.env.example` to `.env` in your backend folder
2. Fill in your production values:
   - Database credentials
   - Email SMTP settings
   - JWT secret key
   - Your domain URL

## 📱 Frontend API Configuration

Update your frontend API configuration to point to your production backend:

### Option 1: Same Domain Setup
If backend is at `yourdomain.com/api/`, update `frontend/src/api/axios.js`:
```javascript
const API_BASE_URL = '/api';
```

### Option 2: Separate API Domain
If using external API service, update to:
```javascript
const API_BASE_URL = 'https://api.yourdomain.com';
```

## 🚀 Deployment Steps with FileZilla

### Quick Deployment (Static Frontend Only)

1. **Connect to your hosting via FileZilla**
2. **Navigate to web root** (public_html, www, htdocs)
3. **Upload these files from `frontend/dist/`:**
   - `index.html` → root directory
   - `assets/` folder → root directory
   - `logo.svg` → root directory
   - `logo-full.svg` → root directory
   - `.htaccess` → root directory

### Full Stack Deployment

1. **Upload Frontend** (as above)
2. **Create `api` folder** in web root
3. **Upload Backend files to `api/` folder:**
   - All files from `backend/` directory
   - Your configured `.env` file
4. **Install dependencies** (via SSH or hosting panel):
   ```bash
   cd api
   npm install --production
   ```
5. **Start the Node.js application** (method varies by hosting)

## 🔧 Post-Deployment Configuration

### 1. Test Your Deployment
- Visit your domain to see the frontend
- Test API endpoints: `yourdomain.com/api/auth/test`

### 2. SSL Certificate
- Enable SSL/HTTPS in your hosting control panel
- Update all URLs to use HTTPS

### 3. Domain Configuration
- Point your domain to your hosting server
- Configure any subdomains (e.g., api.yourdomain.com)

## 🛠️ Hosting Provider Specific Notes

### Shared Hosting (GoDaddy, Bluehost, etc.)
- Usually only supports static files
- Deploy frontend only
- Use external API service or upgrade to VPS

### VPS/Cloud Hosting (DigitalOcean, AWS, etc.)
- Full Node.js support
- Can deploy complete application
- May need to configure reverse proxy (Nginx)

### cPanel Hosting
- Often supports Node.js apps
- Use "Node.js App" feature in cPanel
- Upload files via File Manager or FileZilla

## 📋 Deployment Checklist

- [ ] Frontend built (`npm run build` completed)
- [ ] FileZilla connected to hosting
- [ ] Database created and schema imported
- [ ] Environment variables configured
- [ ] Frontend files uploaded to web root
- [ ] Backend files uploaded (if supported)
- [ ] .htaccess file uploaded
- [ ] Dependencies installed on server
- [ ] SSL certificate enabled
- [ ] Domain DNS configured
- [ ] Application tested and working

## 🆘 Troubleshooting

### Common Issues:

**1. "Cannot GET /" Error**
- Ensure `index.html` is in the web root
- Check `.htaccess` file is uploaded

**2. API Calls Failing**
- Verify backend URL in frontend configuration
- Check CORS settings in backend
- Ensure database connection is working

**3. Assets Not Loading**
- Check file paths in `index.html`
- Ensure all files from `assets/` folder are uploaded
- Verify file permissions (755 for directories, 644 for files)

**4. Database Connection Error**
- Double-check database credentials in `.env`
- Ensure database user has proper permissions
- Verify database host and port

## 📞 Need Help?

If you encounter issues:
1. Check your hosting provider's documentation
2. Contact their support for Node.js setup help
3. Consider using a service like Netlify (frontend) + Heroku (backend) for easier deployment

---

Your golf marketing application is now ready for production! 🏌️‍♂️⛳
