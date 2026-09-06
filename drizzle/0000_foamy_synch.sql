CREATE TABLE "auctions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"budget" integer DEFAULT 500 NOT NULL,
	"slots" jsonb NOT NULL,
	"timer_sec" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'setup' NOT NULL,
	"reveal" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auctions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"player_key" text NOT NULL,
	"player_name" text NOT NULL,
	"player_team" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"qa" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"leader_team_id" integer,
	"ends_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"winner_team_id" integer,
	"price" integer,
	"manual" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"name" text NOT NULL,
	"pin" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_leader_team_id_teams_id_fk" FOREIGN KEY ("leader_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;