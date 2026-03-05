const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    try {
        const rooms = await prisma.room.findMany();
        const settings = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });

        const data = {
            categories: settings ? JSON.parse(settings.value) : [],
            rooms: rooms.map(r => ({ id: r.id, number: r.number, categoryId: r.categoryId }))
        };

        fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
        console.log('DONE_FILE_WRITTEN');
    } catch (err) {
        fs.writeFileSync('error.txt', err.stack);
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
