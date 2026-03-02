const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.room.findMany().then(r => console.log(r)).catch(e => console.error(e)).finally(() => prisma.$disconnect());
