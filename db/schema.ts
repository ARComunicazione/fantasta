import { pgTable, text, integer, boolean, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

export type Role = 'P' | 'D' | 'C' | 'A';
export type Slots = Record<Role, number>;
export type Reveal = { P: boolean; D: boolean; C: boolean; A: boolean; credits: boolean };

export const auctions = pgTable('auctions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  budget: integer('budget').notNull().default(500),
  slots: jsonb('slots').$type<Slots>().notNull(),
  timerSec: integer('timer_sec').notNull().default(5),
  status: text('status').$type<'setup' | 'live' | 'done'>().notNull().default('setup'),
  reveal: jsonb('reveal').$type<Reveal>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pin: text('pin').notNull(),
  position: integer('position').notNull().default(0),
});

// Una chiamata: aperta (in asta), chiusa (assegnata) o annullata.
export const calls = pgTable('calls', {
  id: serial('id').primaryKey(),
  auctionId: integer('auction_id').notNull().references(() => auctions.id, { onDelete: 'cascade' }),
  playerKey: text('player_key').notNull(),
  playerName: text('player_name').notNull(),
  playerTeam: text('player_team').notNull().default(''),
  role: text('role').$type<Role>().notNull(),
  qa: integer('qa').notNull().default(0),
  status: text('status').$type<'open' | 'closed' | 'void'>().notNull().default('open'),
  amount: integer('amount').notNull().default(0),
  leaderTeamId: integer('leader_team_id').references(() => teams.id),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  winnerTeamId: integer('winner_team_id').references(() => teams.id),
  price: integer('price'),
  manual: boolean('manual').notNull().default(false),
});

export const bids = pgTable('bids', {
  id: serial('id').primaryKey(),
  callId: integer('call_id').notNull().references(() => calls.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Auction = typeof auctions.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Bid = typeof bids.$inferSelect;
