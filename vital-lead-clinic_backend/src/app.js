const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const automationRoutes = require('./routes/automationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
const allowedOrigins = [
    'http://localhost:8080',
    'https://clinic-mwhu.vercel.app', // ✅ ADD THIS
    'https://clinic-mwhu-git-master-alpinists-projects-69c3f06f.vercel.app',
    'https://clinic-delta-blond.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/analytics', analyticsRoutes);

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