const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const s = await prisma.setting.findUnique({ where: { key: 'roomCategories' } });
    if (s) console.log('DATA:' + s.value);
    const rooms = await prisma.room.findMany();
    console.log('ROOMS:' + JSON.stringify(rooms));
}
run().finally(() => prisma.$disconnect());
