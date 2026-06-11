require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config/settings');
const activateRoute = require('./routes/activate');
const dbUtility = require('./utils/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const path = require('path');
// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
if (config.MONGODB_URI) {
    console.log('⏳ Connecting to MongoDB...');
    mongoose.connect(config.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    })
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => {
            console.error('❌ MongoDB Connection Error!');
            console.error('Possible Reason: Your IP might not be whitelisted in MongoDB Atlas.');
            console.error('Error Details:', err.message);
        });
} else {
    console.warn('⚠️ WARNING: MONGODB_URI not found in environment variables.');
}

// Routes
app.use('/', activateRoute);



// Better health check to help debugging connection issues
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        dbConnectivity: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        dbState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        timestamp: new Date().toISOString()
    });
});

// Admin Login Route
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        const token = process.env.ADMIN_TOKEN || 'admin-secret-token-12345';
        return res.json({ success: true, token });
    } else {
        return res.status(401).json({ success: false, msg: "Invalid administrative credentials." });
    }
});

// Simple Admin Token-Based Security Middleware
const authenticateAdmin = (req, res, next) => {
    const expectedToken = process.env.ADMIN_TOKEN || 'admin-secret-token-12345';
    const clientToken = req.headers['x-admin-token'];

    if (!clientToken || clientToken !== expectedToken) {
        return res.status(401).json({ 
            success: false, 
            msg: "Unauthorized: Invalid or missing administrative token." 
        });
    }
    next();
};

// Secret Admin Route to view licenses (Secured with token auth)
app.get('/admin/licenses', authenticateAdmin, async (req, res) => {
    try {
        const licenses = await dbUtility.readLicenses();
        const now = new Date();
        const expired = licenses.filter(l => l.licenseType === 'Expiry' && l.expiryDate && new Date(l.expiryDate) < now);
        const expiredKeys = new Set(expired.map(l => l.key));

        const total = licenses.length;
        const activatedCount = licenses.filter(l => l.status === 'active' && !expiredKeys.has(l.key)).length;
        const availableCount = licenses.filter(l => l.status === 'new' && !expiredKeys.has(l.key)).length;
        const expiredCount = expired.length;

        res.json({
            total: total,
            available: availableCount,
            activated: activatedCount,
            expired: expiredCount,
            data: licenses
        });
    } catch (error) {
        res.status(500).json({ success: false, msg: "Failed to fetch licenses" });
    }
});

// Route to add a new license key (Secured with token auth)
app.post('/admin/add', authenticateAdmin, async (req, res) => {
    const { key, licenseType, brandName, expiryDate } = req.body;

    if (!key) {
        return res.status(400).json({ success: false, msg: "Key is required" });
    }

    try {
        const added = await dbUtility.addLicense(
            key.toUpperCase(),
            licenseType,
            brandName,
            expiryDate
        );
        if (added) {
            res.json({ success: true, msg: `License ${key} added successfully` });
        } else {
            res.status(400).json({ success: false, msg: "License key already exists" });
        }
    } catch (error) {
        res.status(500).json({ success: false, msg: "Failed to add license" });
    }
});

// Route to update an existing license key (Secured with token auth)
app.post('/admin/update', authenticateAdmin, async (req, res) => {
    const { key, licenseType, brandName, expiryDate } = req.body;

    if (!key) {
        return res.status(400).json({ success: false, msg: "Key is required" });
    }

    try {
        const license = await dbUtility.findLicense(key);
        if (!license) {
            return res.status(404).json({ success: false, msg: "License not found" });
        }

        const updates = {};
        if (licenseType !== undefined) updates.licenseType = licenseType;
        if (brandName !== undefined) updates.brandName = brandName;
        
        // If licenseType is Lifetime, force expiryDate to null
        if (licenseType === 'Lifetime') {
            updates.expiryDate = null;
        } else if (expiryDate !== undefined) {
            updates.expiryDate = expiryDate ? new Date(expiryDate) : null;
        }

        const updated = await dbUtility.updateLicense(key, updates);
        if (updated) {
            res.json({ success: true, msg: `License ${key} updated successfully` });
        } else {
            res.status(400).json({ success: false, msg: "Failed to update license" });
        }
    } catch (error) {
        res.status(500).json({ success: false, msg: "Failed to update license" });
    }
});

// Default Landing Root Route to prevent "Cannot GET /"
// Catch-all route to serve the React Dashboard for any unhandled paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.PORT, () => {
    console.log(`License Activation Server running on port ${config.PORT}`);
    console.log(`Endpoint ready: POST /activate`);
});
