CREATE TABLE "startup_template"."operators" (
	"addedBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"userId" varchar(128) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "startup_template"."operators" ADD CONSTRAINT "operators_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "startup_template"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The schema has declared this constraint since the first migration, which left it out. A database made with `db:push` already has it.
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_provider_user_unique') THEN
		ALTER TABLE "startup_template"."account" ADD CONSTRAINT "account_provider_user_unique" UNIQUE("accountId","providerId","userId");
	END IF;
END $$;