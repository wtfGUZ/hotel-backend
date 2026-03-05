// app.js — Express app bez .listen(), do użycia przez supertest i server.js
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'https://hotel-frontend-dun.vercel.app')
    .split(',').map(s => s.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(authMiddleware);

const pinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/guests', require('./routes/guests'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/ical', require('./routes/ical'));
app.use('/api/settings/verify-pin', pinLimiter);
app.use('/api/settings/pin', pinLimiter);
app.use('/api/settings', require('./routes/settings'));

module.exports = app;
