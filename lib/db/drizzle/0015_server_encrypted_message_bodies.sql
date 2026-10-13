ALTER TABLE "messages"
  ADD COLUMN "server_body" text,
  ADD COLUMN "server_body_hash" varchar(64);
