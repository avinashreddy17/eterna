import 'dotenv/config';
import { Client } from 'pg';

async function setup() {
  const dbConfig = {
    user: 'postgres',
    password: 'postgres',
    host: '127.0.0.1',
    port: 5432,
  };

  // Step 1: Create database if not exists
  const client = new Client({
    ...dbConfig,
    database: 'postgres', 
  });

  try {
    await client.connect();
    
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = 'mock_dex'`);
    if (res.rowCount === 0) {
      console.log('Creating database mock_dex...');
      await client.query(`CREATE DATABASE mock_dex`);
    } else {
      console.log('Database mock_dex already exists.');
    }
  } catch (err) {
    console.error('Error checking/creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Step 2: Create tables
  const pool = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/mock_dex',
  });

  try {
    await pool.connect();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in NUMERIC NOT NULL,
        slippage_pct NUMERIC NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_events (
        id SERIAL PRIMARY KEY,
        order_id UUID REFERENCES orders(id),
        status TEXT NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_attempts (
        id SERIAL PRIMARY KEY,
        order_id UUID REFERENCES orders(id),
        attempt_no INT NOT NULL,
        result TEXT NOT NULL,
        tx_hash TEXT,
        error TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing schema:', err);
  } finally {
    await pool.end();
  }
}

setup();