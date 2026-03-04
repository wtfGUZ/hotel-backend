const express = require('express');
const { PrismaClient } = require('@prisma/client');
const ical = require('node-ical');
const router = express.Router();
const prisma = new PrismaClient();

// POST sync iCal
router.post('/sync', async (req, res) => {
    const { url, categoryId } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    try {
        const events = await ical.async.fromURL(url);

        let importedCount = 0;
        let skippedCount = 0;
        let conflictCount = 0;

        const allRooms = await prisma.room.findMany();
        const existingResvs = await prisma.reservation.findMany({ where: { archived: false } });

        const parseGuestName = (summary) => {
            if (!summary) return null;
            const s = summary.trim();
            // Removed blocked keywords check so we don't return null for legitimate Booking.com blocks
            const cleaned = s.replace(/^BOOKING\.COM\s*[-–]\s*/i, '').trim();
            return cleaned || null;
        };

        const findOrCreateGuest = async (rawName) => {
            const parts = rawName.trim().split(/\s+/);
            const firstName = parts[0] || 'Gość';
            const lastName = parts.slice(1).join(' ') || 'Booking.com';
            let guest = await prisma.guest.findFirst({ where: { firstName, lastName } });
            if (!guest) {
                guest = await prisma.guest.create({ data: { firstName, lastName, email: '', phone: '' } });
            }
            return guest;
        };

        let fallbackGuest = null;
        const getFallbackGuest = async () => {
            if (!fallbackGuest) {
                fallbackGuest = await prisma.guest.findFirst({ where: { firstName: 'Gość', lastName: 'Booking.com' } });
                if (!fallbackGuest) {
                    fallbackGuest = await prisma.guest.create({ data: { firstName: 'Gość', lastName: 'Booking.com', email: '', phone: '' } });
                }
            }
            return fallbackGuest;
        };

        const toDateString = (date) => {
            const local = new Date(date);
            local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return local.toISOString().split('T')[0];
        };

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

                // We no longer skip events with 'closed' keywords. We want them in the calendar!

                activeUids.add(uid);

                const bookingGuest = guestName
                    ? await findOrCreateGuest(guestName)
                    : await getFallbackGuest();

                const existing = existingResvs.find(r => r.externalId === uid);

                // If it already exists, just update checkIn/checkOut/guestId
                // We keep the room it was already assigned to to avoid unnecessary shuffling.
                if (existing) {
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
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                    continue;
                }

                let assignedRoomId = null;

                // Find a free room. If categoryId is specified, only look in that category.
                // If a category was requested but it has no assigned rooms, we will not assign the booking
                // (it will fall into conflictCount to alert the user).
                let candidateRooms = allRooms;
                if (categoryId) {
                    candidateRooms = allRooms.filter(r => r.categoryId === String(categoryId));
                }

                for (const room of candidateRooms) {
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
                            notes: 'Import z Booking.com iCal',
                            isNewIcal: true
                        }
                    });
                    existingResvs.push(newRes);
                    importedCount++;
                } else {
                    conflictCount++;
                }
            }
        }

        // Auto-delete cancelled Booking.com reservations
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

module.exports = router;
