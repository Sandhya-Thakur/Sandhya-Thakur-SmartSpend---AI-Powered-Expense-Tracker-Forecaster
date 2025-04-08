// lib/db/schema.ts
// lib/db/schema.ts
import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  varchar,
} from 'drizzle-orm/pg-core';

// CATEGORIES TABLE
export const categories = pgTable('categories', {
  id: text('id').primaryKey().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  icon: varchar('icon', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  userId: text('user_id').notNull(), // Clerk user ID as string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for categories
export const categoriesRelations = relations(categories, ({ many }) => ({
  expenses: many(expenses),
  recurringExpenses: many(recurringExpenses),
  budgets: many(budgets),
}));

// EXPENSES TABLE
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().notNull(),
  amount: real('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  isRecurring: boolean('is_recurring').default(false),
  paymentMethod: varchar('payment_method', { length: 100 }),
  location: varchar('location', { length: 255 }),
  categoryId: text('category_id').notNull().references(() => categories.id),
  userId: text('user_id').notNull(), // Clerk user ID as string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for expenses
export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(categories, {
    fields: [expenses.categoryId],
    references: [categories.id],
  }),
}));

// RECURRING EXPENSES TABLE
export const recurringExpenses = pgTable('recurring_expenses', {
  id: text('id').primaryKey().notNull(),
  amount: real('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(), // weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  categoryId: text('category_id').notNull().references(() => categories.id),
  userId: text('user_id').notNull(), // Clerk user ID as string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for recurring expenses
export const recurringExpensesRelations = relations(recurringExpenses, ({ one }) => ({
  category: one(categories, {
    fields: [recurringExpenses.categoryId],
    references: [categories.id],
  }),
}));

// BUDGETS TABLE
export const budgets = pgTable('budgets', {
  id: text('id').primaryKey().notNull(),
  amount: real('amount').notNull(),
  period: varchar('period', { length: 50 }).notNull(), // weekly, monthly, yearly
  startDate: timestamp('start_date').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  userId: text('user_id').notNull(), // Clerk user ID as string
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations for budgets
export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

// User profiles table (optional - for storing additional user data not in Clerk)
export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey().notNull(), // Clerk user ID as string
  currency: varchar('currency', { length: 10 }).default('USD'),
  monthlyIncome: real('monthly_income'),
  timezone: varchar('timezone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});