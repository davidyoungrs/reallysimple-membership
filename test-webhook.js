import { createServer } from 'http';
import handler from './api/apple-webhook.ts';

// this won't work easily with TS directly, let's use npx tsx instead
