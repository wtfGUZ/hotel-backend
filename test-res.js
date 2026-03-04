(async () => {
    try {
        const res = await fetch('https://hotel-backend-t1xo.onrender.com/api/reservations');
        const data = await res.json();
        const last = data.slice(-5);
        console.log(JSON.stringify(last, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
