const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

const log = (msg) => {
    fs.appendFileSync('C:/Users/dudaa/Desktop/dist/hotel-backend/diag.log', msg + '\n');
    console.log(msg);
};

async function main() {
    log('Starting diagnostic...');
    try {
        const settings = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });
        log('Settings found: ' + (settings ? 'yes' : 'no'));
        if (settings) {
            log('Categories value: ' + settings.value);
        }

        const rooms = await prisma.room.findMany();
        log('Rooms count: ' + rooms.length);
        log('Rooms categoryIds: ' + JSON.stringify(rooms.map(r => r.categoryId)));

        const reservations = await prisma.reservation.findMany({
            where: { archived: false, externalId: null }
        });
        log('Internal reservations count: ' + reservations.length);

    } catch (err) {
        log('ERROR: ' + err.message);
        log(err.stack);
    } finally {
        await prisma.$disconnect();
        log('Disconnected.');
    }
}

main();
