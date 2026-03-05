const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.room.findMany().then(r => console.log(JSON.stringify(r))).finally(() => prisma.$disconnect());
