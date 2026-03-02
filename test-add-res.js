const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const guest = await prisma.guest.create({
            data: { firstName: 'Test', lastName: 'Guest', email: 'a@a.com', phone: '123' }
        });
        const room = await prisma.room.findFirst();
        console.log("Room ID:", room.id, typeof room.id);

        const r = await prisma.reservation.create({
            data: {
                guestId: guest.id,
                roomId: room.id,
                checkIn: '2026-03-02',
                checkOut: '2026-03-05',
                status: 'confirmed',
                payment: 'cash',
                breakfast: false,
                notes: 'Test'
            }
        });
        console.log("Reservation Room ID:", r.roomId, typeof r.roomId);
        console.log("Created:", r);
    } catch (e) { console.error(e); }
    finally { prisma.$disconnect(); }
}
run();
