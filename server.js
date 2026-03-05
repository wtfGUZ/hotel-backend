const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Automatyczne archiwizowanie starych rezerwacji (starszych niż 14 dni od wymeldowania)
const archiveOldReservations = async () => {
    try {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const dateLimitString = twoWeeksAgo.toISOString().split('T')[0];

        const archived = await prisma.reservation.updateMany({
            where: {
                checkOut: { lt: dateLimitString },
                archived: false
            },
            data: { archived: true }
        });

        if (archived.count > 0) {
            console.log(`[Auto-Archive] Zarchiwizowano ${archived.count} starych rezerwacji (starszych niż 14 dni).`);
        }
    } catch (err) {
        console.error('[Auto-Archive] Błąd:', err);
    }
};

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    archiveOldReservations();
    setInterval(archiveOldReservations, 24 * 60 * 60 * 1000);
});

server.on('error', (err) => {
    console.error('Server error:', err);
});
