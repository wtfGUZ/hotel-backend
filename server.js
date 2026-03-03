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

app.post('/api/ical/sync', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    try {
        const events = await ical.async.fromURL(url);

        let importedCount = 0;
        let skippedCount = 0;
        let conflictCount = 0;

        const allRooms = await prisma.room.findMany();
        const existingResvs = await prisma.reservation.findMany();

        // Helper: parse guest name from Booking.com SUMMARY
        // Booking sends e.g. "Jan Kowalski", "BOOKING.COM - Jan K.", "Closed - not available"
        const parseGuestName = (summary) => {
            if (!summary) return null;
            const s = summary.trim();

            // Skip blocked/closed entries
            const blockedKeywords = ['closed', 'not available', 'blocked', 'unavailable', 'maintenance'];
            if (blockedKeywords.some(kw => s.toLowerCase().includes(kw))) return null;

            // Remove "BOOKING.COM - " prefix if present
            const cleaned = s.replace(/^BOOKING\.COM\s*[-–]\s*/i, '').trim();
            return cleaned || null;
        };

        // Helper: find or create a guest by name
        const findOrCreateGuest = async (rawName) => {
            const parts = rawName.trim().split(/\s+/);
            const firstName = parts[0] || 'Gość';
            const lastName = parts.slice(1).join(' ') || 'Booking.com';

            // Try to find existing guest with this name
            let guest = await prisma.guest.findFirst({
                where: { firstName, lastName }
            });

            if (!guest) {
                guest = await prisma.guest.create({
                    data: { firstName, lastName, email: '', phone: '' }
                });
            }

            return guest;
        };

        // Fallback guest for events with no name
        let fallbackGuest = null;
        const getFallbackGuest = async () => {
            if (!fallbackGuest) {
                fallbackGuest = await prisma.guest.findFirst({
                    where: { firstName: 'Gość', lastName: 'Booking.com' }
                });
                if (!fallbackGuest) {
                    fallbackGuest = await prisma.guest.create({
                        data: { firstName: 'Gość', lastName: 'Booking.com', email: '', phone: '' }
                    });
                }
            }
            return fallbackGuest;
        };

        const toDateString = (date) => {
            const local = new Date(date);
            local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return local.toISOString().split('T')[0];
        };

        // Collect all UIDs present in the current iCal feed (excluding blocked/invalid)
        const activeUids = new Set();

        for (const key in events) {
            if (events[key].type === 'VEVENT') {
                const event = events[key];
                const uid = event.uid;
                if (!uid) continue;

                const start = new Date(event.start);
                const end = new Date(event.end);
                const checkInString = toDateString(start);
                const checkOutString = toDateString(end);
                const guestName = parseGuestName(event.summary);

                // Skip blocked/closed entries
                if (guestName === null && event.summary &&
                    ['closed', 'not available', 'blocked', 'unavailable'].some(kw =>
                        event.summary.toLowerCase().includes(kw))) {
                    continue;
                }

                activeUids.add(uid);

                const bookingGuest = guestName
                    ? await findOrCreateGuest(guestName)
                    : await getFallbackGuest();

                // Check if we already have this reservation by UID
                const existing = existingResvs.find(r => r.externalId === uid);

                if (existing) {
                    // Already exists — check if dates or guest changed (booking modified)
                    if (existing.checkIn !== checkInString ||
                        existing.checkOut !== checkOutString ||
                        existing.guestId !== bookingGuest.id) {
                        await prisma.reservation.update({
                            where: { id: existing.id },
                            data: {
                                checkIn: checkInString,
                                checkOut: checkOutString,
                                guestId: bookingGuest.id
                            }
                        });
                        importedCount++; // count as updated
                    } else {
                        skippedCount++;
                    }
                    continue;
                }

                // New reservation — find first available room
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
                            externalId: uid,
                            guestId: bookingGuest.id,
                            roomId: assignedRoomId,
                            checkIn: checkInString,
                            checkOut: checkOutString,
                            status: 'confirmed',
                            payment: 'booking',
                            breakfast: false,
                            notes: `Import z Booking.com iCal`
                        }
                    });
                    existingResvs.push(newRes);
                    importedCount++;
                } else {
                    conflictCount++;
                }
            }
        }

        // Auto-delete reservations that were in Booking.com iCal before but are now gone (cancelled)
        const cancelledResvs = existingResvs.filter(r =>
            r.externalId !== null &&
            r.externalId !== undefined &&
            !activeUids.has(r.externalId)
        );

        let cancelledCount = 0;
        if (cancelledResvs.length > 0) {
            await prisma.reservation.deleteMany({
                where: { id: { in: cancelledResvs.map(r => r.id) } }
            });
            cancelledCount = cancelledResvs.length;
        }

        res.json({ importedCount, skippedCount, conflictCount, cancelledCount });
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

// Security API: PIN verification
app.post('/api/settings/verify-pin', async (req, res) => {
    const { pin } = req.body;
    try {
        let setting = await prisma.setting.findUnique({ where: { key: 'adminPin' } });

        // If pin doesn't exist in DB, create default "1234"
        if (!setting) {
            setting = await prisma.setting.create({ data: { key: 'adminPin', value: '1234' } });
        }

        if (setting.value === pin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Nieprawidłowy PIN' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

app.put('/api/settings/pin', async (req, res) => {
    const { oldPin, newPin } = req.body;
    try {
        let setting = await prisma.setting.findUnique({ where: { key: 'adminPin' } });
        if (!setting) {
            setting = await prisma.setting.create({ data: { key: 'adminPin', value: '1234' } });
        }

        if (setting.value !== oldPin) {
            return res.status(401).json({ success: false, error: 'Stary PIN jest nieprawidłowy' });
        }

        if (newPin.length < 4) {
            return res.status(400).json({ success: false, error: 'Nowy PIN musi mieć co najmniej 4 cyfry' });
        }

        await prisma.setting.update({
            where: { key: 'adminPin' },
            data: { value: newPin }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update PIN' });
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
