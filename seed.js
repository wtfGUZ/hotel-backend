const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding the database with initial rooms data...');
    const roomsExists = await prisma.room.count();

    if (roomsExists > 0) {
        console.log('Rooms already exist. Skipping seed.');
        return;
    }

    // Create default rooms to match the frontend state
    const rooms = [
        { number: '1', name: 'Pokój nr 1', maxGuests: 3, pricePerNight: 120, priceWithBreakfast: 150 },
        { number: '2', name: 'Pokój nr 2', maxGuests: 2, pricePerNight: 100, priceWithBreakfast: 130 },
        { number: '3', name: 'Pokój nr 3', maxGuests: 2, pricePerNight: 100, priceWithBreakfast: 130 },
        { number: '4', name: 'Pokój nr 4', maxGuests: 4, pricePerNight: 150, priceWithBreakfast: 180 },
        { number: '5', name: 'Pokój nr 5', maxGuests: 2, pricePerNight: 100, priceWithBreakfast: 130 },
        { number: '1+1', name: 'Dodatk. Pokój', maxGuests: 2, pricePerNight: 80, priceWithBreakfast: 110 }
    ];

    for (const room of rooms) {
        await prisma.room.upsert({
            where: { number: room.number },
            update: {},
            create: room,
        });
    }

    console.log('Database seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
