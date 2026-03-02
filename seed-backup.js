const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BACKUP_FILE = 'c:/Users/dudaa/Desktop/dist/backup-łan.json';

async function seed() {
    try {
        console.log('Odczytywanie pliku backupu...');
        const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));

        console.log('Usuwanie obecnych rezerwacji, gości i pokoi...');
        // Order matters due to foreign key constraints:
        await prisma.reservation.deleteMany({});
        await prisma.guest.deleteMany({});
        await prisma.room.deleteMany({});
        console.log('Baza wyczyszczona.');

        console.log('Przywracanie pokoi...');
        for (const r of data.rooms) {
            await prisma.room.create({
                data: {
                    id: r.id, // We force the explicit ID to match the JSON
                    number: r.number,
                    name: r.name,
                    maxGuests: r.maxGuests,
                    pricePerNight: r.pricePerNight,
                    priceWithBreakfast: r.priceWithBreakfast,
                    status: 'clean'
                }
            });
            console.log(`Dodano pokój: ${r.number}`);
        }

        // PostgreSQL auto-increment sequence needs to be synced if we force IDs
        await prisma.$executeRaw`SELECT setval('"Room_id_seq"', (SELECT MAX(id) FROM "Room"));`;

        console.log('Przywracanie gości...');
        for (const g of data.guests) {
            await prisma.guest.create({
                data: {
                    id: String(g.id),
                    firstName: g.firstName,
                    lastName: g.lastName,
                    email: g.email || '',
                    phone: g.phone || ''
                }
            });
            console.log(`Dodano gościa: ${g.firstName} ${g.lastName}`);
        }

        console.log('Przywracanie rezerwacji...');
        for (const res of data.reservations) {
            await prisma.reservation.create({
                data: {
                    id: String(res.id),
                    guestId: String(res.guestId),
                    roomId: parseInt(res.roomId),
                    checkIn: res.checkIn,
                    checkOut: res.checkOut,
                    breakfast: res.breakfast || false,
                    status: res.status || 'preliminary',
                    payment: res.payment || 'unpaid',
                    notes: res.notes || ''
                }
            });
            console.log(`Dodano rezerwację dla gościa ID: ${res.guestId}`);
        }

        console.log('--- SUKCES --- Wszystkie dane z kopii bezpieczeństwa zostały przywrócone!');
    } catch (err) {
        console.error('Wystąpił błąd podczas przywracania danych:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
