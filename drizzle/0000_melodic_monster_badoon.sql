CREATE TABLE `accounts` (
	`platform` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`display_name` text,
	`auth_json` text,
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`api_name` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`icon_locked_url` text,
	`hidden` integer DEFAULT false NOT NULL,
	`unlocked` integer DEFAULT false NOT NULL,
	`unlocked_at` integer,
	`global_percent` real,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_game_api_idx` ON `achievements` (`game_id`,`api_name`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`platform_game_id` text NOT NULL,
	`title` text NOT NULL,
	`cover_url` text,
	`icon_url` text,
	`playtime_minutes` integer DEFAULT 0 NOT NULL,
	`last_played_at` integer,
	`achievements_total` integer DEFAULT 0 NOT NULL,
	`achievements_unlocked` integer DEFAULT 0 NOT NULL,
	`achievements_synced_at` integer,
	`achievements_synced_playtime` integer,
	`raw_json` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_platform_game_idx` ON `games` (`platform`,`platform_game_id`);--> statement-breakpoint
CREATE INDEX `games_title_idx` ON `games` (`title`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`status` text NOT NULL,
	`phase` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `sync_runs_platform_idx` ON `sync_runs` (`platform`,`started_at`);