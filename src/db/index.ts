import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema.js';

neonConfig.webSocketConstructor = ws;

const dbUrl = process.env.DATABASE_URL?.trim();

if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });
