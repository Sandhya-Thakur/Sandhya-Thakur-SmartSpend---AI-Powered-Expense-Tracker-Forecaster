// lib/db/schema.ts
import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  uuid,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for users
export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  expenses: many(expenses),
  recurringExpenses: many(recurringExpenses),
  budgets: many(budgets),
}));

// CATEGORIES TABLE
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  icon: varchar('icon', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for categories
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
  recurringExpenses: many(recurringExpenses),
  budgets: many(budgets),
}));

// EXPENSES TABLE
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: real('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').default(false),
  paymentMethod: varchar('payment_method', { length: 100 }),
  location: varchar('location', { length: 255 }),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for expenses
export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
}));

// RECURRING EXPENSES TABLE
export const recurringExpenses = pgTable('recurring_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: real('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(), // weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for recurring expenses
export const recurringExpensesRelations = relations(recurringExpenses, ({ one }) => ({
  user: one(users, {
    fields: [recurringExpenses.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [recurringExpenses.categoryId],
    references: [categories.id],
  }),
}));

// BUDGETS TABLE
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: real('amount').notNull(),
  period: varchar('period', { length: 50 }).notNull(), // weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for budgets
export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

// For Next-Auth compatibility
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
}, (vt) => ({
  compoundKey: { 
    columns: [vt.identifier, vt.token],
    name: 'verification_token_identifier_token_pk'
  }
}));