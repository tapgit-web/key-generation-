const mongoose = require('mongoose');

const LicenseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    status: {
        type: String,
        default: 'new',
        enum: ['new', 'active', 'expired', 'suspended']
    },
    hwid: {
        type: String,
        default: 'null'
    },
    name: {
        type: String,
        default: 'null'
    },
    activatedAt: {
        type: Date,
        default: null
    },
    licenseType: {
        type: String,
        default: 'Lifetime'
    },
    brandName: {
        type: String,
        default: 'TAP Sentinel'
    },
    expiryDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('License', LicenseSchema);
