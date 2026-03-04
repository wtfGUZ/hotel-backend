const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET all reservations (exclude archived)
router.get('/', async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({
            where: { archived: false },
            orderBy: { id: 'asc' }
        });
        res.json(reservations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

// GET archived reservations (history)
router.get('/archived', async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({
            where: { archived: true },
            orderBy: { checkOut: 'desc' }
        });
        res.json(reservations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch archived reservations' });
    }
});

// POST create reservation
router.post('/', async (req, res) => {
    const { guestId, roomId, checkIn, checkOut, breakfast, status, payment, notes, groupId } = req.body;

    if (!guestId || !roomId || !checkIn || !checkOut) {
        return res.status(400).json({ error: 'Gość, pokój, data zameldowania i wymeldowania są wymagane' });
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
        return res.status(400).json({ error: 'Data wymeldowania musi być późniejsza niż zameldowania' });
    }

    try {
        const overlapping = await prisma.reservation.findFirst({
            where: {
                roomId: parseInt(roomId),
                archived: false,
                AND: [
                    { checkIn: { lt: checkOut } },
                    { checkOut: { gt: checkIn } }
                ]
            }
        });

        if (overlapping) {
            return res.status(409).json({ error: 'Wybrany pokój jest zajęty w tych terminach' });
        }

        const resv = await prisma.reservation.create({
            data: {
                guestId,
                roomId: parseInt(roomId),
                checkIn,
                checkOut,
                breakfast: Boolean(breakfast),
                status: status || 'preliminary',
                payment: payment || 'unpaid',
                notes: notes || '',
                groupId: groupId || null
            }
        });
        res.status(201).json(resv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create reservation' });
    }
});

// PUT update reservation
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { guestId, roomId, checkIn, checkOut, breakfast, status, payment, notes, groupId } = req.body;
    try {
        const overlapping = await prisma.reservation.findFirst({
            where: {
                roomId: parseInt(roomId),
                id: { not: id },
                archived: false,
                AND: [
                    { checkIn: { lt: checkOut } },
                    { checkOut: { gt: checkIn } }
                ]
            }
        });

        if (overlapping) {
            return res.status(409).json({ error: 'Wybrany pokój jest zajęty w tych terminach' });
        }

        const resv = await prisma.reservation.update({
            where: { id },
            data: { guestId, roomId: parseInt(roomId), checkIn, checkOut, breakfast, status, payment, notes, groupId: groupId !== undefined ? groupId : undefined }
        });
        res.json(resv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update reservation' });
    }
});

// DELETE reservation
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.reservation.delete({ where: { id } });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reservation' });
    }
});

// DELETE bulk reservations
router.delete('/bulk/delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided for bulk deletion' });
    }

    try {
        await prisma.reservation.deleteMany({
            where: { id: { in: ids } }
        });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to bulk delete reservations' });
    }
});

module.exports = router;
