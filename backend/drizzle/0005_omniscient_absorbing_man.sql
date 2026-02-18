CREATE TABLE "powersync"."chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text,
	"role" text,
	"parts" text,
	"chat_thread_id" text,
	"model_id" text,
	"parent_id" text,
	"cache" text,
	"metadata" text,
	"deleted_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "powersync"."chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"is_encrypted" integer DEFAULT 0,
	"triggered_by" text,
	"was_triggered_by_automation" integer DEFAULT 0,
	"context_size" integer,
	"deleted_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "powersync"."devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"last_seen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "powersync"."mcp_servers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"type" text DEFAULT 'http',
	"url" text,
	"command" text,
	"args" text,
	"enabled" integer DEFAULT 1,
	"created_at" integer DEFAULT extract(epoch from now())::integer,
	"updated_at" integer DEFAULT extract(epoch from now())::integer,
	"deleted_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "powersync"."models" (
	"id" text NOT NULL,
	"provider" text,
	"name" text,
	"model" text,
	"url" text,
	"api_key" text,
	"is_system" integer DEFAULT 0,
	"enabled" integer DEFAULT 1,
	"tool_usage" integer DEFAULT 1,
	"is_confidential" integer DEFAULT 0,
	"start_with_reasoning" integer DEFAULT 0,
	"supports_parallel_tool_calls" integer DEFAULT 1,
	"context_window" integer,
	"deleted_at" timestamp,
	"default_hash" text,
	"vendor" text,
	"description" text,
	"user_id" text NOT NULL,
	CONSTRAINT "models_id_user_id_pk" PRIMARY KEY("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "powersync"."modes" (
	"id" text NOT NULL,
	"name" text,
	"label" text,
	"icon" text,
	"system_prompt" text,
	"is_default" integer DEFAULT 0,
	"order" integer DEFAULT 0,
	"default_hash" text,
	"deleted_at" timestamp,
	"user_id" text NOT NULL,
	CONSTRAINT "modes_id_user_id_pk" PRIMARY KEY("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "powersync"."prompts" (
	"id" text NOT NULL,
	"title" text,
	"prompt" text,
	"model_id" text,
	"deleted_at" timestamp,
	"default_hash" text,
	"user_id" text NOT NULL,
	CONSTRAINT "prompts_id_user_id_pk" PRIMARY KEY("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "powersync"."settings" (
	"id" text NOT NULL,
	"value" text,
	"updated_at" integer DEFAULT extract(epoch from now())::integer,
	"default_hash" text,
	"user_id" text NOT NULL,
	CONSTRAINT "settings_id_user_id_pk" PRIMARY KEY("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "powersync"."tasks" (
	"id" text NOT NULL,
	"item" text,
	"order" integer DEFAULT 0,
	"is_complete" integer DEFAULT 0,
	"default_hash" text,
	"deleted_at" timestamp,
	"user_id" text NOT NULL,
	CONSTRAINT "tasks_id_user_id_pk" PRIMARY KEY("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "powersync"."triggers" (
	"id" text PRIMARY KEY NOT NULL,
	"trigger_type" text,
	"trigger_time" text,
	"prompt_id" text,
	"is_enabled" integer DEFAULT 1,
	"deleted_at" timestamp,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "powersync"."chat_messages" ADD CONSTRAINT "chat_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."chat_threads" ADD CONSTRAINT "chat_threads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."devices" ADD CONSTRAINT "devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."mcp_servers" ADD CONSTRAINT "mcp_servers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."models" ADD CONSTRAINT "models_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."modes" ADD CONSTRAINT "modes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."prompts" ADD CONSTRAINT "prompts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."settings" ADD CONSTRAINT "settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powersync"."triggers" ADD CONSTRAINT "triggers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_messages_active" ON "powersync"."chat_messages" USING btree ("chat_thread_id") WHERE "powersync"."chat_messages"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_chat_messages_user_id" ON "powersync"."chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_threads_active" ON "powersync"."chat_threads" USING btree ("id") WHERE "powersync"."chat_threads"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_chat_threads_user_id" ON "powersync"."chat_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_devices_user_id" ON "powersync"."devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_active" ON "powersync"."mcp_servers" USING btree ("id") WHERE "powersync"."mcp_servers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_user_id" ON "powersync"."mcp_servers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_models_active" ON "powersync"."models" USING btree ("id") WHERE "powersync"."models"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_models_user_id" ON "powersync"."models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_modes_active" ON "powersync"."modes" USING btree ("id") WHERE "powersync"."modes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_modes_user_id" ON "powersync"."modes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_prompts_active" ON "powersync"."prompts" USING btree ("id") WHERE "powersync"."prompts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_prompts_user_id" ON "powersync"."prompts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_settings_user_id" ON "powersync"."settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_active" ON "powersync"."tasks" USING btree ("id") WHERE "powersync"."tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id" ON "powersync"."tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_triggers_active" ON "powersync"."triggers" USING btree ("prompt_id") WHERE "powersync"."triggers"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_triggers_user_id" ON "powersync"."triggers" USING btree ("user_id");