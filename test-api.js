fetch('https://hotel-backend-t1xo.onrender.com/api/rooms')
    .then(res => { console.log("STATUS:", res.status); return res.text(); })
    .then(console.log)
    .catch(console.error);
