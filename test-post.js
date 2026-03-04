(async () => {
    try {
        const payload = {
            guestId: "2ca3b914-93a0-41b4-b4fa-6d9e4d1d05d1", // test guest
            roomId: 3, // change room
            checkIn: "2026-05-20", // far in future
            checkOut: "2026-05-22",
            breakfast: false,
            status: "preliminary",
            payment: "unpaid",
            notes: "Test API Check",
            groupId: "grp-test-123"
        };
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("POST Result:", JSON.stringify(data, null, 2));

        // Let's delete it right after if it succeeds
        if (data.id) {
            await fetch(`https://hotel-backend-t1xo.onrender.com/api/reservations/${data.id}`, { method: 'DELETE' });
        }
    } catch (e) {
        console.error(e);
    }
})();
