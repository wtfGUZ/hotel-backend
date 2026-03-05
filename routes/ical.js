const express = require('express');
const prisma = require('../lib/prisma');
const ical = require('node-ical');
const router = express.Router();

// POST sync iCal
router.post('/sync', async (req, res) => {
    const { url, categoryId, categoryIds } = req.body;
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
            const cleaned = s.replace(/^BOOKING\.COM\s*[-–]\s*/i, '').trim();
            if (cleaned.toUpperCase().includes('CLOSED') || cleaned.toUpperCase().includes('NOT AVAILABLE')) {
                return null;
            }
            return cleaned || null;
        };

        const findOrCreateGuest = async (rawName) => {
            const parts = rawName.trim().split(/\s+/);
            const firstName = parts[0] || 'Gość';
            const lastName = parts.slice(1).join(' ') || 'Booking';
            let guest = await prisma.guest.findFirst({ where: { firstName, lastName } });
            if (!guest) {
                guest = await prisma.guest.create({ data: { firstName, lastName, email: '', phone: '' } });
            }
            return guest;
        };

        let fallbackGuest = null;
        const getFallbackGuest = async () => {
            if (!fallbackGuest) {
                fallbackGuest = await prisma.guest.findFirst({ where: { firstName: 'Gość', lastName: 'Booking' } });
                if (!fallbackGuest) {
                    fallbackGuest = await prisma.guest.create({ data: { firstName: 'Gość', lastName: 'Booking', email: '', phone: '' } });
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

                activeUids.add(uid);

                const bookingGuest = guestName
                    ? await findOrCreateGuest(guestName)
                    : await getFallbackGuest();

                const existing = existingResvs.find(r => r.externalId === uid);

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

                let candidateRooms = allRooms;
                if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
                    candidateRooms = allRooms.filter(r => categoryIds.includes(String(r.categoryId)));
                } else if (categoryId) {
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
                            status: 'paid',
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

        let cancelledCount = 0;
        if (activeUids.size > 0) {
            const cancelledResvs = existingResvs.filter(r =>
                r.externalId !== null &&
                r.externalId !== undefined &&
                !activeUids.has(r.externalId)
            );

            if (cancelledResvs.length > 0) {
                await prisma.reservation.deleteMany({
                    where: { id: { in: cancelledResvs.map(r => r.id) } }
                });
                cancelledCount = cancelledResvs.length;
            }
        }

        res.json({ importedCount, skippedCount, conflictCount, cancelledCount });
    } catch (err) {
        console.error('iCal processing error:', err);
        res.status(500).json({ error: 'Błąd podczas synchronizacji iCal' });
    }
});

// GET /export/:categoryIds/calendar.ics - Export internal reservations to iCal (ICS)
router.get('/export/:categoryIds/calendar.ics', async (req, res) => {
    try {
        const ids = req.params.categoryIds.split(',').map(id => id.trim());

        // Fetch categories to get names for X-WR-CALNAME
        const settings = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });
        const allCats = settings ? JSON.parse(settings.value) : [];
        const requestedCats = allCats.filter(c => ids.includes(c.id));
        const calName = requestedCats.map(c => c.name).join(', ') || 'Hotel Reservations';

        const reservations = await prisma.reservation.findMany({
            where: {
                archived: false,
                room: {
                    categoryId: { in: ids }
                }
            },
            include: {
                guest: true,
                room: true
            }
        });

        // Helper to escape text for iCal (commas, semicolons, backslashes, newlines)
        const escapeICS = (str) => {
            if (!str) return '';
            return str.toString()
                .replace(/\\/g, '\\\\')
                .replace(/,/g, '\\,')
                .replace(/;/g, '\\;')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '');
        };

        let ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//HotelManager//iCal Export//PL',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:${escapeICS(calName)}`,
            'X-WR-TIMEZONE:Europe/Warsaw'
        ];

        const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const exportableReservations = reservations.filter(r =>
            !r.isNewIcal && r.payment !== 'booking'
        );

        exportableReservations.forEach(r => {
            const start = r.checkIn.replace(/-/g, '');
            const end = r.checkOut.replace(/-/g, '');
            const uid = r.externalId || `res-${r.id}@hotelmanager.internal`;
            const summary = `RESERVATION - ${r.guest.firstName} ${r.guest.lastName}`;
            const description = `Pokój: ${r.room.number} ${r.room.name}\nStatus: ${r.status}\nNotatki: ${r.notes || ''}`;

            ics.push('BEGIN:VEVENT');
            ics.push(`UID:${uid}`);
            ics.push(`DTSTAMP:${now}`);
            ics.push(`DTSTART;VALUE=DATE:${start}`);
            ics.push(`DTEND;VALUE=DATE:${end}`);
            ics.push(`SUMMARY:${escapeICS(summary)}`);
            ics.push(`DESCRIPTION:${escapeICS(description)}`);
            ics.push('TRANSP:OPAQUE');
            ics.push('END:VEVENT');
        });

        ics.push('END:VCALENDAR');

        res.set({
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="export.ics"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.send(ics.join('\r\n'));
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// GET /export-test - Test endpoint with dummy data
router.get('/export-test', (req, res) => {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const endStr = tomorrow.toISOString().split('T')[0].replace(/-/g, '');

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//HotelManager//Test//PL',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Testowy Kalendarz',
        'BEGIN:VEVENT',
        `UID:test-123@internal`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${startStr}`,
        `DTEND;VALUE=DATE:${endStr}`,
        'SUMMARY:TESTOWA REZERWACJA',
        'DESCRIPTION:To jest testowy wpis kalendarza.',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    res.set({ 'Content-Type': 'text/calendar', 'Content-Disposition': 'attachment; filename="test.ics"' });
    res.send(ics);
});

module.exports = router;
