const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const automationRoutes = require('./routes/automationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const logRoutes = require('./routes/logRoutes');
const contactRoutes = require('./routes/contactRoutes');

const requestLogger = require('./middleware/requestLogger');
const app = express();

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:8080',
    'https://follow-ups-vx12.vercel.app'
]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, ''));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        const normalizedOrigin = origin.replace(/\/$/, '');
        callback(null, allowedOrigins.includes(normalizedOrigin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Root + favicon to avoid noisy 404s on Vercel
app.get('/', (req, res) => {
    res.status(200).send('Backend is running');
});
app.get(['/favicon.ico', '/favicon.png'], (req, res) => {
    res.status(204).end();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/logs', logRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = app;
