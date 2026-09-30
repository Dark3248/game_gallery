CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_idx` ON `categories` (lower("name"));--> statement-breakpoint
CREATE TABLE `game_categories` (
	`game_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`game_id`, `category_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_categories_category_idx` ON `game_categories` (`category_id`);--> statement-breakpoint
INSERT INTO `categories` (`name`, `created_at`) VALUES
	('3A', CAST(strftime('%s', 'now') AS integer)),
	('Roguelike', CAST(strftime('%s', 'now') AS integer)),
	('独立游戏', CAST(strftime('%s', 'now') AS integer));