const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const License = require('../models/License');

// Helper to determine if we should use MongoDB or local file fallback
const useMongo = () => mongoose.connection.readyState === 1;

const localFilePath = path.join(__dirname, '../licenses.json');

// Local DB Helpers
const readLocalDB = () => {
    try {
        if (!fs.existsSync(localFilePath)) {
            // Write default templates if file does not exist
            const defaults = [
                { key: "ABCD-1234-EFGH-5678", status: "new", hwid: "null", activatedAt: null, licenseType: "Lifetime", brandName: "TAP Sentinel", expiryDate: null },
                { key: "PRO-UX-99-BATT", status: "new", hwid: "null", activatedAt: null, licenseType: "Expiry", brandName: "TAP Sentinel", expiryDate: "2026-12-31T23:59:59.000Z" },
                { key: "TEST-1234-KEY", status: "active", hwid: "USER-PC-123", activatedAt: "2026-02-22T11:15:58.111Z", licenseType: "Expiry", brandName: "Automation People", expiryDate: "2028-12-31T23:59:59.000Z" }
            ];
            fs.writeFileSync(localFilePath, JSON.stringify(defaults, null, 4), 'utf8');
            return defaults;
        }
        const data = fs.readFileSync(localFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Local DB read error:', error);
        return [];
    }
};

const writeLocalDB = (data) => {
    try {
        fs.writeFileSync(localFilePath, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error('Local DB write error:', error);
        return false;
    }
};

const db = {
    /**
     * Finds a license by key.
     * @param {string} key - The license key to search for.
     */
    findLicense: async (key) => {
        const uKey = key.toUpperCase();
        if (useMongo()) {
            try {
                return await License.findOne({ key: uKey });
            } catch (error) {
                console.error('MongoDB find error, attempting local fallback:', error);
            }
        }
        
        // Local File Fallback
        const licenses = readLocalDB();
        return licenses.find(l => l.key.toUpperCase() === uKey) || null;
    },

    /**
     * Updates an existing license.
     * @param {string} key - The license key to update.
     * @param {object} updates - The data to update.
     */
    updateLicense: async (key, updates) => {
        const uKey = key.toUpperCase();
        if (useMongo()) {
            try {
                await License.findOneAndUpdate({ key: uKey }, updates);
                return true;
            } catch (error) {
                console.error('MongoDB update error, attempting local fallback:', error);
            }
        }

        // Local File Fallback
        const licenses = readLocalDB();
        const index = licenses.findIndex(l => l.key.toUpperCase() === uKey);
        if (index === -1) return false;

        licenses[index] = {
            ...licenses[index],
            ...updates,
            // Format dates
            activatedAt: updates.activatedAt !== undefined ? (updates.activatedAt ? (updates.activatedAt instanceof Date ? updates.activatedAt.toISOString() : updates.activatedAt) : null) : licenses[index].activatedAt,
            expiryDate: updates.expiryDate !== undefined ? (updates.expiryDate ? (updates.expiryDate instanceof Date ? updates.expiryDate.toISOString() : updates.expiryDate) : null) : licenses[index].expiryDate
        };
        return writeLocalDB(licenses);
    },

    /**
     * Adds a new license key to the database.
     * @param {string} key - The new license key.
     */
    addLicense: async (key, licenseType = 'Lifetime', brandName = 'TAP Sentinel', expiryDate = null) => {
        const uKey = key.toUpperCase();
        if (useMongo()) {
            try {
                const existing = await License.findOne({ key: uKey });
                if (existing) return false;

                const newLicense = new License({
                    key: uKey,
                    status: 'new',
                    hwid: "null",
                    licenseType,
                    brandName,
                    expiryDate: expiryDate ? new Date(expiryDate) : null
                });
                await newLicense.save();
                return true;
            } catch (error) {
                console.error('MongoDB add error, attempting local fallback:', error);
            }
        }

        // Local File Fallback
        const licenses = readLocalDB();
        const existing = licenses.find(l => l.key.toUpperCase() === uKey);
        if (existing) return false;

        licenses.push({
            key: uKey,
            status: 'new',
            hwid: 'null',
            activatedAt: null,
            licenseType,
            brandName,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null
        });
        return writeLocalDB(licenses);
    },

    /**
     * Returns all licenses.
     */
    readLicenses: async () => {
        if (useMongo()) {
            try {
                return await License.find({});
            } catch (error) {
                console.error('MongoDB read error, attempting local fallback:', error);
            }
        }

        // Local File Fallback
        return readLocalDB();
    }
};

module.exports = db;
