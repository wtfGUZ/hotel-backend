const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const rooms = await prisma.room.findMany();
        const settings = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });

        console.log('=== CATEGORIES ===');
        if (settings) {
            console.log(settings.value);
        } else {
            console.log('No categories found');
        }

        console.log('=== ROOMS ===');
        console.log(JSON.stringify(rooms.map(r => ({
            id: r.id,
            number: r.number,
            categoryId: r.categoryId
        })), null, 2));

        const reservations = await prisma.reservation.findMany({
            where: { archived: false },
            include: { room: true }
        });
        console.log('=== RESERVATIONS COUNT ===');
        console.log(reservations.length);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
