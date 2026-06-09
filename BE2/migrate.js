require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const License = require('./models/License');

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes('your_mongodb_atlas_connection_string_here')) {
        console.error('❌ ERROR: Please set a valid MONGODB_URI in your .env file before running migration.');
        process.exit(1);
    }

    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ Connected.');

        const filePath = path.join(__dirname, 'licenses.json');
        if (!fs.existsSync(filePath)) {
            console.error('❌ ERROR: licenses.json not found.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📂 Found ${data.length} licenses in licenses.json. Starting migration...`);

        let count = 0;
        for (const item of data) {
            // Use findOneAndUpdate with upsert to avoid duplicates
            await License.findOneAndUpdate(
                { key: item.key.toUpperCase() },
                {
                    key: item.key.toUpperCase(),
                    status: item.status || 'new',
                    hwid: item.hwid || 'null',
                    activatedAt: item.activatedAt ? new Date(item.activatedAt) : null,
                    licenseType: item.licenseType || 'Lifetime',
                    brandName: item.brandName || 'TAP Sentinel',
                    expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
                },
                { upsert: true, new: true }
            );
            count++;
            console.log(`   [${count}/${data.length}] Migrated: ${item.key}`);
        }

        console.log('\n✨ Migration complete! All licenses are now in MongoDB Atlas.');
    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

migrate();
