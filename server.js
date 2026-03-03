const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const ical = require('node-ical');
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

app.delete('/api/reservations/bulk/delete', async (req, res) => {
    const { ids } = req.body; // array of string IDs
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided for bulk deletion' });
    }

    try {
        await prisma.reservation.deleteMany({
            where: {
                id: { in: ids }
            }
        });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to bulk delete reservations' });
    }
});

// API: iCal Sync
app.post('/api/ical/sync', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    try {
        const events = await ical.async.fromURL(url);

        let bookingGuest = await prisma.guest.findFirst({
            where: { firstName: 'Gość', lastName: 'Booking.com' }
        });
        if (!bookingGuest) {
            bookingGuest = await prisma.guest.create({
                data: { firstName: 'Gość', lastName: 'Booking.com', email: '', phone: '' }
            });
        }

        let importedCount = 0;
        let skippedCount = 0;
        let conflictCount = 0;

        const allRooms = await prisma.room.findMany();
        const existingResvs = await prisma.reservation.findMany();

        for (const key in events) {
            if (events[key].type === 'VEVENT') {
                const event = events[key];
                const start = new Date(event.start);
                const end = new Date(event.end);

                const toDateString = (date) => {
                    const local = new Date(date);
                    local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                    return local.toISOString().split('T')[0];
                };

                const checkInString = toDateString(start);
                const checkOutString = toDateString(end);

                const isDuplicate = existingResvs.some(r =>
                    r.guestId === bookingGuest.id &&
                    r.checkIn === checkInString &&
                    r.checkOut === checkOutString
                );

                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }

                let assignedRoomId = null;
                for (const room of allRooms) {
                    const hasConflict = existingResvs.some(r => {
                        if (r.roomId !== room.id) return false;

                        const rIn = new Date(r.checkIn);
                        const rOut = new Date(r.checkOut);
                        rIn.setHours(0, 0, 0, 0);
                        rOut.setHours(0, 0, 0, 0);

                        const newStart = new Date(start);
                        const newEnd = new Date(end);
                        newStart.setHours(0, 0, 0, 0);
                        newEnd.setHours(0, 0, 0, 0);

                        if (newStart.getTime() >= rOut.getTime()) return false;
                        if (newEnd.getTime() <= rIn.getTime()) return false;

                        return true;
                    });

                    if (!hasConflict) {
                        assignedRoomId = room.id;
                        break;
                    }
                }

                if (assignedRoomId) {
                    const newRes = await prisma.reservation.create({
                        data: {
                            guestId: bookingGuest.id,
                            roomId: assignedRoomId,
                            checkIn: checkInString,
                            checkOut: checkOutString,
                            status: 'confirmed',
                            payment: 'booking',
                            breakfast: false,
                            notes: `Auto import z iCal. Tytuł: ${event.summary || 'Booking'}`
                        }
                    });
                    existingResvs.push(newRes);
                    importedCount++;
                } else {
                    conflictCount++;
                }
            }
        }

        res.json({ importedCount, skippedCount, conflictCount });
    } catch (err) {
        console.error('iCal processing error:', err);
        res.status(500).json({ error: 'Błąd podczas synchronizacji iCal' });
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

// Automatyczne usuwanie starych rezerwacji (starszych niż 14 dni od wymeldowania)
const cleanupOldReservations = async () => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Format ISO string limitu, obcięty do samej daty (bez godzin dla pewności formatu z frontendem yyyy-mm-dd)
        const dateLimitString = twoWeeksAgo.toISOString().split('T')[0];

        const deleted = await prisma.reservation.deleteMany({
            where: {
                checkOut: {
                    lt: dateLimitString // data wymeldowania mniejsza niż "14 dni temu"
                }
            }
        });

        if (deleted.count > 0) {
            console.log(`[Auto-Cleanup] Usunięto ${deleted.count} starych rezerwacji (starszych niż 14 dni).`);
        }
    } catch (err) {
        console.error('[Auto-Cleanup] Wystąpił błąd podczas usuwania starych rezerwacji:', err);
    }
};

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Uruchom czyszczenie przy starcie serwera
    cleanupOldReservations();

    // Ustaw interwał czyszczenia na każde 24 godziny (86400000 ms)
    setInterval(cleanupOldReservations, 24 * 60 * 60 * 1000);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
