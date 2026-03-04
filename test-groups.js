(async () => {
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/reservations');
        const data = await res.json();
        const groups = data.filter(r => r.groupId);
        console.log(`Znalazłem ${groups.length} rezerwacji z groupId.`);
        if (groups.length > 0) {
            console.log("Przykładowa:", JSON.stringify(groups[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    }
})();
