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
    welcomeEmailSent: boolean('welcome_email_sent').default(false),
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
    country: text('country'),
    website: text('website'),
    numCards: integer('num_cards'),
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

export const clubs = pgTable('clubs', {
    id: serial('id').primaryKey(),
    uid: uuid('uid').defaultRandom().notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    brandingConfig: jsonb('branding_config').notNull(), // ClubBrandingConfig
    membershipNumberFormat: text('membership_number_format').default('{NUMBER}').notNull(), // e.g. "CLUB-{NUMBER}"
    isSuspended: boolean('is_suspended').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdBy: text('created_by'), // Clerk ID
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const membershipTemplates = pgTable('membership_templates', {
    id: serial('id').primaryKey(),
    uid: uuid('uid').defaultRandom().notNull().unique(),
    clubId: integer('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(), // e.g. "Gold Member 2025"
    membershipType: text('membership_type').notNull(), // e.g. "Gold"
    cardConfig: jsonb('card_config').notNull(), // MembershipCardConfig
    durationMonths: integer('duration_months').default(12).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdBy: text('created_by'), // Clerk ID
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
    id: serial('id').primaryKey(),
    uid: uuid('uid').defaultRandom().notNull().unique(),
    templateId: integer('template_id').references(() => membershipTemplates.id, { onDelete: 'cascade' }).notNull(),
    clubId: integer('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),
    memberName: text('member_name').notNull(),
    memberEmail: text('member_email').notNull(),
    memberPhoto: text('member_photo'), // S3/R2 URL
    membershipNumber: text('membership_number').notNull(),
    membershipType: text('membership_type').notNull(),
    stripImageUrl: text('strip_image_url'), // generated strip image URL (or R2 upload)
    cardConfig: jsonb('card_config').notNull(), // Snapshot of card config at creation
    memberSince: integer('member_since'),
    slug: text('slug').notNull().unique(), // e.g. "club-slug-001"
    status: text('status').default('active').notNull(), // 'active', 'expired', 'revoked'
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    issuedBy: text('issued_by'), // Clerk ID of admin
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const clubAdmins = pgTable('club_admins', {
    id: serial('id').primaryKey(),
    clubId: integer('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),
    clerkId: text('clerk_id').notNull(), // Clerk user ID
    role: text('role').default('admin').notNull(), // 'admin' or 'super_admin'
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

