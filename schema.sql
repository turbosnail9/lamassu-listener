-- schema.sql

-- Store all incoming raw webhook payloads for debugging
CREATE TABLE IF NOT EXISTS raw_events (
    id SERIAL PRIMARY KEY,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    headers JSONB,
    payload JSONB
);

-- Extract and store key metrics
CREATE TABLE IF NOT EXISTS atm_status (
    id SERIAL PRIMARY KEY,
    machine_id TEXT NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cash_balance DECIMAL(12, 2),
    status TEXT,
    meta JSONB
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    machine_id TEXT NOT NULL,
    transaction_id TEXT UNIQUE,
    type TEXT, -- 'cashIn' or 'cashOut'
    amount DECIMAL(12, 2),
    currency TEXT,
    crypto_amount DECIMAL(18, 8),
    crypto_currency TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE
);
