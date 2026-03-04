const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const rooms = await prisma.room.findMany();
    console.log("Current rooms:", JSON.stringify(rooms, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
