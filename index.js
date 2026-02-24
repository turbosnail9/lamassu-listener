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

        // Parse content if it's a "New transaction"
        if (payload.topic === 'New transaction' && payload.content) {
            const content = payload.content;

            // Extract fields using Regex
            const txIdMatch = content.match(/Transaction ID: ([\w-]+)/);
            const statusMatch = content.match(/Status: (\w+)/);
            const machineMatch = content.match(/Machine name: (.+)/);
            const typeMatch = content.match(/- (Cash In|Cash Out)/);
            const fiatMatch = content.match(/- ([\d.]+) (\w+)/); // Amount and Currency (e.g. 100 TTD)
            const cryptoMatch = content.match(/- ([\d.]+) (\w+)/g); // Might need a more specific regex for the crypto line

            // Refined extraction for multiple lines
            const lines = content.split('\n').map(l => l.trim().replace('- ', ''));

            const txnData = {
                id: txIdMatch ? txIdMatch[1] : null,
                status: statusMatch ? statusMatch[1] : null,
                machine: machineMatch ? machineMatch[1].trim() : 'Unknown',
                type: typeMatch ? typeMatch[1] : null,
            };

            // Parse lines manually for better accuracy
            lines.forEach(line => {
                if (line.includes('TTD')) txnData.amount = parseFloat(line.split(' ')[0]);
                if (line.includes('LN') || line.includes('BTC')) txnData.cryptoAmount = parseFloat(line.split(' ')[0]);
                if (line.includes('TTD')) txnData.currency = 'TTD';
                if (line.includes('LN')) txnData.cryptoCurrency = 'LN';
            });

            console.log('Parsed Transaction:', txnData);

            if (txnData.id) {
                await db.query(
                    `INSERT INTO transactions (machine_id, transaction_id, type, amount, currency, crypto_amount, crypto_currency, confirmed_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     ON CONFLICT (transaction_id) DO UPDATE 
                     SET type = EXCLUDED.type, amount = EXCLUDED.amount, confirmed_at = NOW()`,
                    [txnData.machine, txnData.id, txnData.type, txnData.amount, txnData.currency, txnData.cryptoAmount, txnData.cryptoCurrency]
                ).catch(err => console.error('Error saving transaction:', err));
            }
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
