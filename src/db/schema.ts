import { pgTable, serial, text, timestamp, jsonb, boolean, uuid, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const businessCards = pgTable('business_cards', {
    id: serial('id').primaryKey(),
    uid: uuid('uid').defaultRandom().notNull().unique(), // Public facing ID
    userId: text('user_id'), // Link to auth provider ID (e.g. Clerk)
    data: jsonb('data').notNull(), // Stores the entire JSON state of the card
    slug: text('slug').unique(), // For custom URLs like /card/david
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const cardViews = pgTable('card_views', {
    id: uuid('id').defaultRandom().primaryKey(),
    cardId: integer('card_id').references(() => businessCards.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at').defaultNow(),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    city: text('city'),
    region: text('region'),
    country: text('country'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    ipAddress: text('ip_address'),
    deviceType: text('device_type'), // 'mobile', 'tablet', 'desktop'
    source: text('source'), // e.g. 'qr', 'direct', 'signature'
});

export const cardClicks = pgTable('card_clicks', {
    id: uuid('id').defaultRandom().primaryKey(),
    cardId: integer('card_id').references(() => businessCards.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'social', 'contact', 'link'
    targetInfo: text('target_info'), // e.g. 'instagram', 'phone_primary', or full URL
    clickedAt: timestamp('clicked_at').defaultNow(),
    userAgent: text('user_agent'),
});

export const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(), // e.g., 'maintenance_mode', 'disable_registrations'
    value: text('value').notNull(), // stored as string, parsed manually (e.g., 'true', 'false', JSON)
    description: text('description'),
    updatedAt: timestamp('updated_at').defaultNow(),
});
