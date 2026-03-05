const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const setting = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });
    if (setting) {
        console.log(JSON.stringify(JSON.parse(setting.value), null, 2));
    } else {
        console.log('No categories found');
    }
    await prisma.$disconnect();
}

main();
