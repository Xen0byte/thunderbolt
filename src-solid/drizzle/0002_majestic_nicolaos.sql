CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (CURRENT_DATE)
);
--> statement-breakpoint
DROP TABLE `setting`;