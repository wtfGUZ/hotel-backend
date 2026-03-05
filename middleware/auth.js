// Simple Bearer token auth middleware.
// Set API_SECRET in .env — any request must include
// Authorization: Bearer <API_SECRET>
const authMiddleware = (req, res, next) => {
    const secret = process.env.API_SECRET;

    // 1. If no secret is configured, skip auth (dev/public mode)
    if (!secret) return next();

    // 2. EXCEPTION: Allow public GET requests to iCal export links
    // Booking.com needs to access these without a Bearer token.
    if (req.method === 'GET' && req.originalUrl.includes('/export/')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized — missing Bearer token' });
    }

    const token = authHeader.slice(7);
    if (token !== secret) {
        return res.status(403).json({ error: 'Forbidden — invalid token' });
    }

    next();
};

module.exports = authMiddleware;
