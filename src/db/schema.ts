import { pgTable, serial, text, timestamp, jsonb, boolean, uuid, integer, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    clerkId: text('clerk_id').unique(), // External ID from Clerk
    email: text('email').notNull().unique(),
    tier: text('tier').default('starter').notNull(), // 'starter', 'pro', 'pro_plus', 'business', 'grandfathered'
    stripeCustomerId: text('stripe_customer_id'),
    subscriptionStatus: text('subscription_status'), // 'active', 'trialing', 'past_due', 'canceled'
    currentPeriodEnd: timestamp('current_period_end'),
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

export const securityEvents = pgTable('security_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').notNull(), // 'blocked_ip', 'failed_login', 'sanitization_auto_fix'
    severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
    target: text('target'), // IP address, User ID, or Field Name
    details: jsonb('details'), // store reason, input/output for sanitization, location
    createdAt: timestamp('created_at').defaultNow(),
    resolved: boolean('resolved').default(false),
});

export const apiLogs = pgTable('api_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    endpoint: text('endpoint').notNull(),
    method: text('method').notNull(),
    statusCode: integer('status_code').notNull(),
    duration: integer('duration').notNull(), // in ms
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
    id: uuid('id').defaultRandom().primaryKey(),
    cardId: integer('card_id').references(() => businessCards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    jobTitle: text('job_title'),
    company: text('company'),
    note: text('note'),
    submittedAt: timestamp('submitted_at').defaultNow(),
    isRead: boolean('is_read').default(false),
});

export const walletPushRegistrations = pgTable('wallet_push_registrations', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id'), // Link to auth provider ID
    deviceLibraryIdentifier: text('device_library_identifier').notNull(),
    pushToken: text('push_token').notNull(),
    passTypeIdentifier: text('pass_type_identifier').notNull(),
    serialNumber: text('serial_number').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    uniqueRegistration: unique('unique_registration').on(table.deviceLibraryIdentifier, table.serialNumber)
}));
