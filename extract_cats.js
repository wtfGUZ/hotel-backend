const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    try {
        const settings = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });
        const rooms = await prisma.room.findMany();

        const info = {
            categories: settings ? JSON.parse(settings.value) : [],
            roomCategoryIds: [...new Set(rooms.map(r => r.categoryId))]
        };

        fs.writeFileSync('C:/Users/dudaa/Desktop/dist/hotel-backend/cat_ids.json', JSON.stringify(info, null, 2));
        console.log('Category IDs extracted successfully');
    } catch (err) {
        console.error('Error extracting categories:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
