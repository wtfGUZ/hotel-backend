const request = require('supertest');
const app = require('../app');

// Te testy weryfikują poprawność odpowiedzi API (statusy HTTP, struktury JSON).
// Korzystają z prawdziwej bazy (Supabase) — dlatego używamy ostrożnych zapytań GET
// i tylko tworzenie/usuwanie testowych danych w sekcjach, które po sobie sprzątają.

describe('API Routes — Smoke Tests', () => {

    // ==================== ROOMS ====================
    describe('GET /api/rooms', () => {
        it('zwraca tablicę pokoi z kodem 200', async () => {
            const res = await request(app).get('/api/rooms');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('każdy pokój ma wymagane pola', async () => {
            const res = await request(app).get('/api/rooms');
            if (res.body.length > 0) {
                const room = res.body[0];
                expect(room).toHaveProperty('id');
                expect(room).toHaveProperty('number');
                expect(room).toHaveProperty('name');
                expect(room).toHaveProperty('maxGuests');
                expect(room).toHaveProperty('pricePerNight');
                expect(room).toHaveProperty('status');
            }
        });
    });

    // ==================== GUESTS ====================
    describe('GET /api/guests', () => {
        it('zwraca tablicę gości z kodem 200', async () => {
            const res = await request(app).get('/api/guests');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('każdy gość ma wymagane pola', async () => {
            const res = await request(app).get('/api/guests');
            if (res.body.length > 0) {
                const guest = res.body[0];
                expect(guest).toHaveProperty('id');
                expect(guest).toHaveProperty('firstName');
                expect(guest).toHaveProperty('lastName');
            }
        });
    });

    // ==================== RESERVATIONS ====================
    describe('GET /api/reservations', () => {
        it('zwraca tablicę rezerwacji z kodem 200', async () => {
            const res = await request(app).get('/api/reservations');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('nie zawiera zarchiwizowanych rezerwacji', async () => {
            const res = await request(app).get('/api/reservations');
            res.body.forEach(r => {
                expect(r.archived).toBeFalsy();
            });
        });
    });

    // ==================== SETTINGS ====================
    describe('GET /api/settings/:key', () => {
        it('zwraca obiekt z polem value', async () => {
            const res = await request(app).get('/api/settings/hotelLogo');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('value');
        });

        it('zwraca null dla nieistniejącego klucza', async () => {
            const res = await request(app).get('/api/settings/nonexistent_key_12345');
            expect(res.status).toBe(200);
            expect(res.body.value).toBeNull();
        });
    });

    // ==================== VALIDATION ====================
    describe('Walidacja wejść', () => {
        it('POST /api/guests bez wymaganych pól zwraca 400', async () => {
            const res = await request(app)
                .post('/api/guests')
                .send({ firstName: '' });
            expect(res.status).toBe(400);
        });

        it('POST /api/rooms bez wymaganych pól zwraca 400', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .send({ number: '' });
            expect(res.status).toBe(400);
        });

        it('POST /api/reservations z datą wymeldowania < zameldowania zwraca 400', async () => {
            const res = await request(app)
                .post('/api/reservations')
                .send({
                    guestId: 'fake-id',
                    roomId: 1,
                    checkIn: '2025-12-31',
                    checkOut: '2025-12-01'
                });
            expect(res.status).toBe(400);
        });

        it('POST /api/reservations bez wymaganych pól zwraca 400', async () => {
            const res = await request(app)
                .post('/api/reservations')
                .send({});
            expect(res.status).toBe(400);
        });
    });

    // ==================== CRUD lifecycle — Guest ====================
    describe('CRUD Gość — cykl życia', () => {
        let testGuestId;

        it('POST tworzy nowego gościa', async () => {
            const res = await request(app)
                .post('/api/guests')
                .send({ firstName: 'Test', lastName: 'JestRunner', email: 'test@jest.dev', phone: '000000000' });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.firstName).toBe('Test');
            expect(res.body.lastName).toBe('JestRunner');
            testGuestId = res.body.id;
        });

        it('PUT aktualizuje gościa', async () => {
            const res = await request(app)
                .put(`/api/guests/${testGuestId}`)
                .send({ firstName: 'Updated', lastName: 'JestRunner', email: 'updated@jest.dev', phone: '111111111' });
            expect(res.status).toBe(200);
            expect(res.body.firstName).toBe('Updated');
        });

        it('DELETE usuwa gościa', async () => {
            const res = await request(app).delete(`/api/guests/${testGuestId}`);
            expect(res.status).toBe(204);
        });
    });

    // ==================== iCal Export ====================
    describe('GET /api/ical/export', () => {
        it('eksport iCal dla nieistniejącej kategorii zwraca pusty kalendarz', async () => {
            const res = await request(app).get('/api/ical/export/fake-cat-id/calendar.ics');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/calendar');
            expect(res.text).toContain('BEGIN:VCALENDAR');
            expect(res.text).toContain('END:VCALENDAR');
        });
    });
});
