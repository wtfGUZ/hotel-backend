const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET all guests
router.get('/', async (req, res) => {
    try {
        const guests = await prisma.guest.findMany({ orderBy: { id: 'asc' } });
        res.json(guests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch guests' });
    }
});

// POST create guest
router.post('/', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Imię i nazwisko są wymagane' });
    }

    try {
        const guest = await prisma.guest.create({
            data: { firstName: firstName.trim(), lastName: lastName.trim(), email: email || '', phone: phone || '' }
        });
        res.status(201).json(guest);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create guest' });
    }
});

// PUT update guest
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, phone } = req.body;
    try {
        const guest = await prisma.guest.update({
            where: { id },
            data: { firstName, lastName, email, phone }
        });
        res.json(guest);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update guest' });
    }
});

// DELETE guest
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.guest.delete({ where: { id } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete guest' });
    }
});

module.exports = router;
