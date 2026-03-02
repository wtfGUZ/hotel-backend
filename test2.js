const express = require('express');
const app = express();
app.listen(5001, () => {
    console.log('Test server started on 5001. Waiting...');
});
setInterval(() => console.log('ping'), 1000);
