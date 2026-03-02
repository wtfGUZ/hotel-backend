const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API: Pokoje
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({ orderBy: { id: 'asc' } });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

app.put('/api/rooms/:id/status', async (req, res) => {
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

app.post('/api/rooms', async (req, res) => {
    const { number, name, maxGuests, pricePerNight, priceWithBreakfast, status } = req.body;
    try {
        const room = await prisma.room.create({
            data: {
                number,
                name,
                maxGuests: parseInt(maxGuests),
                pricePerNight: parseFloat(pricePerNight),
                priceWithBreakfast: parseFloat(priceWithBreakfast),
                status
            }
        });
        res.status(201).json(room);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { number, name, maxGuests, pricePerNight, priceWithBreakfast, status } = req.body;
    try {
        const room = await prisma.room.update({
            where: { id: Number(id) },
            data: {
                number,
                name,
                maxGuests: parseInt(maxGuests),
                pricePerNight: parseFloat(pricePerNight),
                priceWithBreakfast: parseFloat(priceWithBreakfast),
                status
            }
        });
        res.json(room);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.room.delete({ where: { id: Number(id) } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});


// API: Goście
app.get('/api/guests', async (req, res) => {
    try {
        const guests = await prisma.guest.findMany({ orderBy: { id: 'asc' } });
        res.json(guests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch guests' });
    }
});

app.post('/api/guests', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
    try {
        const guest = await prisma.guest.create({
            data: { firstName, lastName, email, phone }
        });
        res.status(201).json(guest);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create guest' });
    }
});

app.put('/api/guests/:id', async (req, res) => {
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

app.delete('/api/guests/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.guest.delete({ where: { id } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete guest' });
    }
});

// API: Rezerwacje
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({ orderBy: { id: 'asc' } });
        res.json(reservations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

app.post('/api/reservations', async (req, res) => {
    const { guestId, roomId, checkIn, checkOut, breakfast, status, payment, notes } = req.body;
    try {
        const resv = await prisma.reservation.create({
            data: { guestId, roomId: parseInt(roomId), checkIn, checkOut, breakfast, status, payment, notes }
        });
        res.status(201).json(resv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create reservation' });
    }
});

app.put('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;
    const { guestId, roomId, checkIn, checkOut, breakfast, status, payment, notes } = req.body;
    try {
        const resv = await prisma.reservation.update({
            where: { id },
            data: { guestId, roomId: parseInt(roomId), checkIn, checkOut, breakfast, status, payment, notes }
        });
        res.json(resv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update reservation' });
    }
});

app.delete('/api/reservations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.reservation.delete({ where: { id } });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reservation' });
    }
});

// API: Settings
app.get('/api/settings/:key', async (req, res) => {
    const { key } = req.params;
    try {
        const setting = await prisma.setting.findUnique({ where: { key } });
        res.json({ value: setting ? setting.value : null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

app.post('/api/settings', async (req, res) => {
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

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
