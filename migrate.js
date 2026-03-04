const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
    { id: "cat_1", name: "1", icalUrl: "" },
    { id: "cat_2", name: "2", icalUrl: "" },
    { id: "cat_twin", name: "1+1", icalUrl: "" }
];

async function main() {
    // 1. Save Categories to settings
    const existingCat = await prisma.setting.findUnique({ where: { key: 'room_categories' } });
    if (!existingCat) {
        await prisma.setting.create({
            data: { key: 'room_categories', value: JSON.stringify(categories) }
        });
        console.log("Created categories successfully.");
    } else {
        await prisma.setting.update({
            where: { key: 'room_categories' },
            data: { value: JSON.stringify(categories) }
        });
        console.log("Updated categories successfully.");
    }

    // 2. Map rooms
    let count = 0;
    const rooms = await prisma.room.findMany();
    for (const r of rooms) {
        let catId = null;
        if (r.name === '1') catId = 'cat_1';
        else if (r.name === '2') catId = 'cat_2';
        else if (r.name === '1+1') catId = 'cat_twin';

        if (catId) {
            await prisma.room.update({
                where: { id: r.id },
                data: { categoryId: catId }
            });
            count++;
        }
    }
    console.log(`Updated ${count} rooms with category IDs!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
