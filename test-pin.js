fetch('https://hotel-backend-t1xo.onrender.com/api/settings/verify-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '1234' })
}).then(res => { console.log('STATUS:', res.status); return res.text(); })
    .then(console.log)
    .catch(console.error);
