const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();

// GET all rooms
router.get('/', async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({ orderBy: { id: 'asc' } });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// PUT room status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const room = await prisma.room.update({
            where: { id: Number(id) },
            data: { status }
        });
        res.json(room);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update room status' });
    }
});

// POST create room
router.post('/', async (req, res) => {
    const { number, name, maxGuests, pricePerNight, priceWithBreakfast, status, categoryId } = req.body;

    if (!number || !name) {
        return res.status(400).json({ error: 'Numer i nazwa pokoju są wymagane' });
    }
    if (!maxGuests || isNaN(parseInt(maxGuests)) || parseInt(maxGuests) < 1) {
        return res.status(400).json({ error: 'Podaj prawidłową liczbę gości (min. 1)' });
    }

    try {
        const room = await prisma.room.create({
            data: {
                number,
                name,
                maxGuests: parseInt(maxGuests),
                pricePerNight: parseFloat(pricePerNight) || 0,
                priceWithBreakfast: parseFloat(priceWithBreakfast) || 0,
                status: status || 'clean',
                categoryId: categoryId || null
            }
        });
        res.status(201).json(room);
    } catch (err) {
        console.error(err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Pokój o tym numerze już istnieje' });
        }
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// PUT update room
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { number, name, maxGuests, pricePerNight, priceWithBreakfast, status, categoryId } = req.body;

    if (!number || !name) {
        return res.status(400).json({ error: 'Numer i nazwa pokoju są wymagane' });
    }
    if (!maxGuests || isNaN(parseInt(maxGuests)) || parseInt(maxGuests) < 1) {
        return res.status(400).json({ error: 'Podaj prawidłową liczbę gości (min. 1)' });
    }

    try {
        const room = await prisma.room.update({
            where: { id: Number(id) },
            data: {
                number,
                name,
                maxGuests: parseInt(maxGuests),
                pricePerNight: parseFloat(pricePerNight) || 0,
                priceWithBreakfast: parseFloat(priceWithBreakfast) || 0,
                status: status || 'clean',
                categoryId: categoryId !== undefined ? categoryId : undefined
            }
        });
        res.json(room);
    } catch (err) {
        console.error(err);
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Pokój o tym numerze już istnieje' });
        }
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// DELETE room
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.room.delete({ where: { id: Number(id) } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

module.exports = router;
