const mongoose = require('mongoose');
const License = require('../models/License');

const checkConnection = () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database is offline');
    }
};

const db = {
    /**
     * Finds a license by key.
     * @param {string} key - The license key to search for.
     */
    findLicense: async (key) => {
        const uKey = key.toUpperCase();
        checkConnection();
        return await License.findOne({ key: uKey });
    },

    /**
     * Updates an existing license.
     * @param {string} key - The license key to update.
     * @param {object} updates - The data to update.
     */
    updateLicense: async (key, updates) => {
        const uKey = key.toUpperCase();
        checkConnection();
        
        // Handle Date objects correctly
        const formattedUpdates = { ...updates };
        if (updates.activatedAt !== undefined && updates.activatedAt) {
            formattedUpdates.activatedAt = new Date(updates.activatedAt);
        }
        if (updates.expiryDate !== undefined) {
            formattedUpdates.expiryDate = updates.expiryDate ? new Date(updates.expiryDate) : null;
        }

        const result = await License.findOneAndUpdate({ key: uKey }, formattedUpdates, { new: true });
        return !!result;
    },

    /**
     * Adds a new license key to the database.
     * @param {string} key - The new license key.
     */
    addLicense: async (key, licenseType = 'Lifetime', brandName = 'TAP Sentinel', expiryDate = null) => {
        const uKey = key.toUpperCase();
        checkConnection();

        const existing = await License.findOne({ key: uKey });
        if (existing) return false;

        const newLicense = new License({
            key: uKey,
            status: 'new',
            hwid: 'null',
            name: 'null',
            licenseType,
            brandName,
            expiryDate: expiryDate ? new Date(expiryDate) : null
        });
        await newLicense.save();
        return true;
    },

    /**
     * Returns all licenses.
     */
    readLicenses: async () => {
        checkConnection();
        return await License.find({});
    }
};

module.exports = db;
