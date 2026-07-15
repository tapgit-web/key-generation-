const express = require('express');
const router = express.Router();
const db = require('../utils/db');

/**
 * POST /activate
 * @body {string} key - The license key.
 * @body {string} hwid - The hardware ID of the machine.
 */
router.post('/activate', async (req, res) => {
    const { key, hwid, name } = req.body;

    if (!key || !hwid || !name || name.trim() === '') {
        return res.json({
            valid: false,
            msg: "License key, HWID, and Username are required"
        });
    }

    try {
        const license = await db.findLicense(key);

        if (!license) {
            return res.json({
                valid: false,
                msg: "Invalid license key"
            });
        }

        // Check expiry date
        if (license.expiryDate && new Date(license.expiryDate) < new Date()) {
            if (license.status !== 'expired') {
                await db.updateLicense(key, { status: 'expired' });
            }
            return res.json({
                valid: false,
                msg: "License has expired"
            });
        }

        // Handing first activation (status: new)
        if (license.status === 'new') {
            // If license already has a name set (e.g. pre-configured by admin), verify it matches
            if (license.name && license.name !== 'null' && license.name.trim() !== '') {
                if (license.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
                    return res.json({
                        valid: false,
                        msg: "Username does not match the registered user for this license key"
                    });
                }
            }

            await db.updateLicense(key, {
                hwid: hwid,
                name: name,
                status: 'active',
                activatedAt: new Date()
            });

            return res.json({
                valid: true,
                licenseType: license.licenseType || 'Standard',
                brandName: license.brandName || 'TAP Sentinel',
                expiryDate: license.expiryDate || null
            });
        }

        // Handling already active license
        if (license.status === 'active') {
            // Verify that the username matches
            if (!license.name || license.name === 'null' || license.name.trim() === '') {
                await db.updateLicense(key, { name: name });
            } else if (license.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
                return res.json({
                    valid: false,
                    msg: "Username does not match the registered user for this license key"
                });
            }

            if (license.hwid === hwid) {
                return res.json({
                    valid: true,
                    licenseType: license.licenseType || 'Standard',
                    brandName: license.brandName || 'TAP Sentinel',
                    expiryDate: license.expiryDate || null
                });
            } else {
                return res.json({
                    valid: false,
                    msg: "License already activated on another PC"
                });
            }
        }

        // Handling other statuses (e.g., expired, suspended)
        return res.json({
            valid: false,
            msg: `License is ${license.status}`
        });
    } catch (error) {
        console.error('Activation error:', error);
        return res.status(500).json({ valid: false, msg: "Server error" });
    }
});

module.exports = router;
