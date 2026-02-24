// index.js
const express = require('express');
const morgan = require('morgan');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(morgan('combined'));

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    try {
        const headers = req.headers;
        const payload = req.body;

        console.log('Received Webhook:', JSON.stringify(payload, null, 2));

        // Save raw event
        await db.query(
            'INSERT INTO raw_events (headers, payload) VALUES ($1, $2)',
            [JSON.stringify(headers), JSON.stringify(payload)]
        );

        // Basic parsing for metrics if possible
        // Note: We will refine this as we see the actual payloads
        if (payload.machineId) {
            await db.query(
                `INSERT INTO atm_status (machine_id, cash_balance, status, meta) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (machine_id) DO UPDATE 
                 SET cash_balance = EXCLUDED.cash_balance, status = EXCLUDED.status, last_seen = NOW()`,
                [payload.machineId, payload.cashBalance || 0, payload.status || 'active', JSON.stringify(payload)]
            ).catch(err => console.error('Error updating status:', err));
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', (req, res) => {
    res.status(200).send('Lamassu Webhook Listener is Active');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
