// Test: czy backend odpowiada bez tokenu JWT (po usunięciu auth)
async function testAll() {
    console.log('=== Testing backend API (no JWT) ===\n');

    // Test 1: rooms
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/rooms');
        console.log(`GET /rooms: ${res.status} ${res.ok ? '✅' : '❌'}`);
    } catch (e) { console.log('GET /rooms: FAIL ❌', e.message); }

    // Test 2: reservations
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/reservations');
        console.log(`GET /reservations: ${res.status} ${res.ok ? '✅' : '❌'}`);
    } catch (e) { console.log('GET /reservations: FAIL ❌', e.message); }

    // Test 3: guests
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/guests');
        console.log(`GET /guests: ${res.status} ${res.ok ? '✅' : '❌'}`);
    } catch (e) { console.log('GET /guests: FAIL ❌', e.message); }

    // Test 4: verify-pin
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/settings/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: '1234' })
        });
        const data = await res.json();
        console.log(`POST /verify-pin: ${res.status} ${data.success ? '✅' : '❌'} (token present: ${!!data.token})`);
    } catch (e) { console.log('POST /verify-pin: FAIL ❌', e.message); }
}

testAll();
