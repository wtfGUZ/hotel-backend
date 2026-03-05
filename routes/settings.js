const express = require('express');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const router = express.Router();

const SALT_ROUNDS = 10;

// Helper: get or create PIN (auto-hash if stored as plain text)
const getOrCreatePin = async () => {
    let setting = await prisma.setting.findUnique({ where: { key: 'adminPin' } });

    if (!setting) {
        // First time — create default hashed PIN "1234"
        const hashed = await bcrypt.hash('1234', SALT_ROUNDS);
        setting = await prisma.setting.create({ data: { key: 'adminPin', value: hashed } });
    } else if (!setting.value.startsWith('$2')) {
        // PIN exists but is plain text (legacy) — auto-hash it
        const hashed = await bcrypt.hash(setting.value, SALT_ROUNDS);
        setting = await prisma.setting.update({
            where: { key: 'adminPin' },
            data: { value: hashed }
        });
    }

    return setting;
};

// GET setting by key
router.get('/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const setting = await prisma.setting.findUnique({ where: { key } });
        res.json({ value: setting ? setting.value : null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// POST upsert setting
router.post('/', async (req, res) => {
    const { key, value } = req.body;
    try {
        const setting = await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        res.json(setting);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

// POST verify PIN (bcrypt)
router.post('/verify-pin', async (req, res) => {
    const { pin } = req.body;
    try {
        const setting = await getOrCreatePin();
        const isMatch = await bcrypt.compare(pin, setting.value);

        if (isMatch) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Nieprawidłowy PIN' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

// PUT change PIN (bcrypt)
router.put('/pin', async (req, res) => {
    const { oldPin, newPin } = req.body;
    try {
        const setting = await getOrCreatePin();
        const isMatch = await bcrypt.compare(oldPin, setting.value);

        if (!isMatch) {
            return res.status(403).json({ success: false, message: 'Obecny PIN jest nieprawidłowy' });
        }

        const hashedNew = await bcrypt.hash(newPin, SALT_ROUNDS);
        await prisma.setting.update({
            where: { key: 'adminPin' },
            data: { value: hashedNew }
        });

        res.json({ success: true, message: 'PIN został zmieniony' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change PIN' });
    }
});

module.exports = router;
