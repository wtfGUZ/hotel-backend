const formatDate = (date) => date.toISOString().split('T')[0];

const reservations = [{
    roomId: 2,
    checkIn: '2026-03-02',
    checkOut: '2026-03-05'
}];

const room = { id: 2, number: '002' };

const date = new Date('2026-03-03T23:00:00.000+01:00'); // Some local time
const dateStr = formatDate(date);
console.log('Testing for date:', date, '->', dateStr);

const allReservations = reservations.filter(r =>
    r.roomId === room.id &&
    dateStr >= r.checkIn &&
    dateStr <= r.checkOut
);

console.log('Matches:', allReservations.length > 0);
