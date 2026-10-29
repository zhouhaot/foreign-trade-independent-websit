CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login_key" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"password_hash" varchar(512) NOT NULL,
	"role_code" varchar(5) NOT NULL,
	"enabled" boolean NOT NULL,
	"auth_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "app_user_login_key_unique" UNIQUE("login_key"),
	CONSTRAINT "app_user_role_code_check" CHECK ("app_user"."role_code" in ('admin', 'sales', 'doc', 'fin', 'boss')),
	CONSTRAINT "app_user_auth_version_check" CHECK ("app_user"."auth_version" > 0),
	CONSTRAINT "app_user_row_version_check" CHECK ("app_user"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_id" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"before_version" integer,
	"after_version" integer NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" varchar(2000),
	CONSTRAINT "audit_event_after_version_check" CHECK ("audit_event"."after_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "company_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_cn" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"address" varchar(1000) NOT NULL,
	"contact" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"profile_key" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "company_profile_profile_key_unique" UNIQUE("profile_key"),
	CONSTRAINT "company_profile_profile_key_check" CHECK ("company_profile"."profile_key" = 'PRIMARY_COMPANY'),
	CONSTRAINT "company_profile_row_version_check" CHECK ("company_profile"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "currency_catalog" (
	"code" varchar(3) PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"amount_scale" integer NOT NULL,
	"enabled" boolean NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "currency_catalog_code_check" CHECK ("currency_catalog"."code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "currency_catalog_amount_scale_check" CHECK ("currency_catalog"."amount_scale" >= 0),
	CONSTRAINT "currency_catalog_row_version_check" CHECK ("currency_catalog"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name_cn" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"country" varchar(100) NOT NULL,
	"address" varchar(1000) NOT NULL,
	"contact" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"remark" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "customer_id_owner_user_id_unique" UNIQUE("id","owner_user_id"),
	CONSTRAINT "customer_row_version_check" CHECK ("customer"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "idempotency_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"operation_id" varchar(100) NOT NULL,
	"request_hash" varchar(128) NOT NULL,
	"resource_id" uuid NOT NULL,
	"response_status" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_record_actor_key_unique" UNIQUE("actor_user_id","idempotency_key"),
	CONSTRAINT "idempotency_record_response_status_check" CHECK ("idempotency_record"."response_status" in (200, 201))
);
--> statement-breakpoint
CREATE TABLE "inquiry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"inquiry_date" date NOT NULL,
	"status" varchar(9) DEFAULT 'FOLLOWING' NOT NULL,
	"source" varchar(100) NOT NULL,
	"message" varchar(5000) NOT NULL,
	"customer_version_at_creation" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "inquiry_id_owner_user_id_unique" UNIQUE("id","owner_user_id"),
	CONSTRAINT "inquiry_id_owner_customer_unique" UNIQUE("id","owner_user_id","customer_id"),
	CONSTRAINT "inquiry_status_check" CHECK ("inquiry"."status" in ('FOLLOWING', 'QUOTED')),
	CONSTRAINT "inquiry_customer_version_check" CHECK ("inquiry"."customer_version_at_creation" > 0),
	CONSTRAINT "inquiry_row_version_check" CHECK ("inquiry"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "inquiry_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"product_version" integer NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"quantity" numeric(20, 2) NOT NULL,
	CONSTRAINT "inquiry_line_inquiry_line_no_unique" UNIQUE("inquiry_id","line_no"),
	CONSTRAINT "inquiry_line_inquiry_id_id_unique" UNIQUE("inquiry_id","id"),
	CONSTRAINT "inquiry_line_line_no_check" CHECK ("inquiry_line"."line_no" between 1 and 100),
	CONSTRAINT "inquiry_line_product_version_check" CHECK ("inquiry_line"."product_version" > 0),
	CONSTRAINT "inquiry_line_quantity_check" CHECK ("inquiry_line"."quantity" > 0),
	CONSTRAINT "inquiry_line_product_snapshot_check" CHECK (jsonb_typeof("inquiry_line"."product_snapshot") = 'object' and "inquiry_line"."product_snapshot" ?& array['productId', 'productVersion', 'sku', 'nameCn', 'nameEn', 'spec', 'unit', 'hsCode', 'schemaVersion'])
);
--> statement-breakpoint
CREATE TABLE "order_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_version_id" uuid NOT NULL,
	"source_quote_id" uuid NOT NULL,
	"source_quote_line_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"quantity" numeric(20, 2) NOT NULL,
	"unit_price" numeric(20, 2) NOT NULL,
	"line_amount" numeric(20, 2) NOT NULL,
	CONSTRAINT "order_line_version_line_no_unique" UNIQUE("order_version_id","line_no"),
	CONSTRAINT "order_line_version_quote_line_unique" UNIQUE("order_version_id","source_quote_line_id"),
	CONSTRAINT "order_line_line_no_check" CHECK ("order_line"."line_no" between 1 and 100),
	CONSTRAINT "order_line_quantity_check" CHECK ("order_line"."quantity" > 0),
	CONSTRAINT "order_line_unit_price_check" CHECK ("order_line"."unit_price" > 0),
	CONSTRAINT "order_line_exact_amount_check" CHECK ("order_line"."line_amount" = "order_line"."quantity" * "order_line"."unit_price"),
	CONSTRAINT "order_line_product_snapshot_check" CHECK (jsonb_typeof("order_line"."product_snapshot") = 'object' and "order_line"."product_snapshot" ?& array['productId', 'productVersion', 'sku', 'nameCn', 'nameEn', 'spec', 'unit', 'hsCode', 'schemaVersion'])
);
--> statement-breakpoint
CREATE TABLE "order_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"source_quote_id" uuid NOT NULL,
	"version_no" integer DEFAULT 1 NOT NULL,
	"delivery_date" date NOT NULL,
	"currency" varchar(3) NOT NULL,
	"total_amount" numeric(20, 2) NOT NULL,
	"confirmed_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "order_version_order_version_no_unique" UNIQUE("order_id","version_no"),
	CONSTRAINT "order_version_id_source_quote_id_unique" UNIQUE("id","source_quote_id"),
	CONSTRAINT "order_version_version_no_check" CHECK ("order_version"."version_no" = 1),
	CONSTRAINT "order_version_total_amount_check" CHECK ("order_version"."total_amount" > 0),
	CONSTRAINT "order_version_snapshot_check" CHECK (jsonb_typeof("order_version"."confirmed_snapshot") = 'object' and "order_version"."confirmed_snapshot" ?& array['snapshotVersion', 'submittedQuoteVersion', 'seller', 'customer', 'quoteDate', 'validUntil', 'currency', 'tradeTerm', 'paymentTerm', 'remark', 'items', 'totalAmount', 'frozenAt', 'schemaVersion'])
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name_cn" varchar(200) NOT NULL,
	"name_en" varchar(200) NOT NULL,
	"spec" varchar(1000) NOT NULL,
	"unit" varchar(30) NOT NULL,
	"ref_price" numeric(20, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"hs_code" varchar(30) NOT NULL,
	"remark" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_ref_price_check" CHECK ("product"."ref_price" >= 0),
	CONSTRAINT "product_row_version_check" CHECK ("product"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"state" varchar(18) DEFAULT 'DRAFT' NOT NULL,
	"quote_date" date NOT NULL,
	"valid_until" date,
	"currency" varchar(3) NOT NULL,
	"trade_term" varchar(200) NOT NULL,
	"payment_term" varchar(500) NOT NULL,
	"remark" varchar(2000) NOT NULL,
	"total_amount" numeric(20, 2),
	"issued_snapshot" jsonb,
	"issued_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "quote_inquiry_id_unique" UNIQUE("inquiry_id"),
	CONSTRAINT "quote_id_owner_user_id_unique" UNIQUE("id","owner_user_id"),
	CONSTRAINT "quote_id_inquiry_id_unique" UNIQUE("id","inquiry_id"),
	CONSTRAINT "quote_state_check" CHECK ("quote"."state" in ('DRAFT', 'AWAITING_CUSTOMER', 'CONFIRMED')),
	CONSTRAINT "quote_valid_until_check" CHECK ("quote"."valid_until" is null or "quote"."valid_until" >= "quote"."quote_date"),
	CONSTRAINT "quote_total_amount_check" CHECK ("quote"."total_amount" is null or "quote"."total_amount" > 0),
	CONSTRAINT "quote_state_snapshot_check" CHECK (("quote"."state" = 'DRAFT' and "quote"."issued_snapshot" is null and "quote"."issued_at" is null) or ("quote"."state" in ('AWAITING_CUSTOMER', 'CONFIRMED') and "quote"."issued_snapshot" is not null and "quote"."issued_at" is not null and "quote"."valid_until" is not null and "quote"."total_amount" is not null)),
	CONSTRAINT "quote_issued_snapshot_check" CHECK ("quote"."issued_snapshot" is null or (jsonb_typeof("quote"."issued_snapshot") = 'object' and "quote"."issued_snapshot" ?& array['snapshotVersion', 'submittedQuoteVersion', 'seller', 'customer', 'quoteDate', 'validUntil', 'currency', 'tradeTerm', 'paymentTerm', 'remark', 'items', 'totalAmount', 'frozenAt', 'schemaVersion'])),
	CONSTRAINT "quote_converted_state_check" CHECK ("quote"."converted_at" is null or "quote"."state" = 'CONFIRMED'),
	CONSTRAINT "quote_row_version_check" CHECK ("quote"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "quote_confirmation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"method" varchar(100) NOT NULL,
	"confirmed_on" date NOT NULL,
	"note" varchar(2000) NOT NULL,
	"confirmed_snapshot" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL,
	CONSTRAINT "quote_confirmation_quote_id_unique" UNIQUE("quote_id"),
	CONSTRAINT "quote_confirmation_method_check" CHECK (char_length(btrim("quote_confirmation"."method")) > 0),
	CONSTRAINT "quote_confirmation_note_check" CHECK (char_length(btrim("quote_confirmation"."note")) > 0),
	CONSTRAINT "quote_confirmation_snapshot_check" CHECK (jsonb_typeof("quote_confirmation"."confirmed_snapshot") = 'object' and "quote_confirmation"."confirmed_snapshot" ?& array['snapshotVersion', 'submittedQuoteVersion', 'seller', 'customer', 'quoteDate', 'validUntil', 'currency', 'tradeTerm', 'paymentTerm', 'remark', 'items', 'totalAmount', 'frozenAt', 'schemaVersion'])
);
--> statement-breakpoint
CREATE TABLE "quote_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"inquiry_line_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_snapshot" jsonb NOT NULL,
	"quantity" numeric(20, 2) NOT NULL,
	"unit_price" numeric(20, 2),
	"line_amount" numeric(20, 2),
	CONSTRAINT "quote_line_quote_line_no_unique" UNIQUE("quote_id","line_no"),
	CONSTRAINT "quote_line_quote_inquiry_line_unique" UNIQUE("quote_id","inquiry_line_id"),
	CONSTRAINT "quote_line_quote_id_id_unique" UNIQUE("quote_id","id"),
	CONSTRAINT "quote_line_line_no_check" CHECK ("quote_line"."line_no" between 1 and 100),
	CONSTRAINT "quote_line_quantity_check" CHECK ("quote_line"."quantity" > 0),
	CONSTRAINT "quote_line_product_snapshot_check" CHECK (jsonb_typeof("quote_line"."product_snapshot") = 'object' and "quote_line"."product_snapshot" ?& array['productId', 'productVersion', 'sku', 'nameCn', 'nameEn', 'spec', 'unit', 'hsCode', 'schemaVersion']),
	CONSTRAINT "quote_line_exact_amount_check" CHECK (("quote_line"."unit_price" is null and "quote_line"."line_amount" is null) or ("quote_line"."unit_price" is not null and "quote_line"."line_amount" is not null and "quote_line"."unit_price" > 0 and "quote_line"."line_amount" = "quote_line"."quantity" * "quote_line"."unit_price"))
);
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_quote_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"order_progress" varchar(17) DEFAULT 'PENDING_EXECUTION' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "sales_order_source_quote_id_unique" UNIQUE("source_quote_id"),
	CONSTRAINT "sales_order_id_source_quote_id_unique" UNIQUE("id","source_quote_id"),
	CONSTRAINT "sales_order_order_progress_check" CHECK ("sales_order"."order_progress" = 'PENDING_EXECUTION'),
	CONSTRAINT "sales_order_row_version_check" CHECK ("sales_order"."row_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_key_hash" varchar(128) NOT NULL,
	"user_id" uuid,
	"auth_version" integer,
	"csrf_token_hash" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "user_session_session_key_hash_unique" UNIQUE("session_key_hash"),
	CONSTRAINT "user_session_expiry_check" CHECK ("user_session"."expires_at" > "user_session"."created_at"),
	CONSTRAINT "user_session_auth_pair_check" CHECK (("user_session"."user_id" is null and "user_session"."auth_version" is null) or ("user_session"."user_id" is not null and "user_session"."auth_version" is not null and "user_session"."auth_version" > 0))
);
--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profile" ADD CONSTRAINT "company_profile_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_owner_user_id_app_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_record" ADD CONSTRAINT "idempotency_record_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_customer_owner_fk" FOREIGN KEY ("customer_id","owner_user_id") REFERENCES "public"."customer"("id","owner_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_line" ADD CONSTRAINT "inquiry_line_inquiry_id_inquiry_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_line" ADD CONSTRAINT "inquiry_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_version_quote_fk" FOREIGN KEY ("order_version_id","source_quote_id") REFERENCES "public"."order_version"("id","source_quote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_source_quote_line_fk" FOREIGN KEY ("source_quote_id","source_quote_line_id") REFERENCES "public"."quote_line"("quote_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_version" ADD CONSTRAINT "order_version_currency_currency_catalog_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency_catalog"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_version" ADD CONSTRAINT "order_version_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_version" ADD CONSTRAINT "order_version_order_quote_fk" FOREIGN KEY ("order_id","source_quote_id") REFERENCES "public"."sales_order"("id","source_quote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_currency_currency_catalog_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency_catalog"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_currency_currency_catalog_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currency_catalog"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_inquiry_owner_customer_fk" FOREIGN KEY ("inquiry_id","owner_user_id","customer_id") REFERENCES "public"."inquiry"("id","owner_user_id","customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_confirmation" ADD CONSTRAINT "quote_confirmation_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_confirmation" ADD CONSTRAINT "quote_confirmation_recorded_by_app_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_quote_inquiry_fk" FOREIGN KEY ("quote_id","inquiry_id") REFERENCES "public"."quote"("id","inquiry_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_inquiry_line_fk" FOREIGN KEY ("inquiry_id","inquiry_line_id") REFERENCES "public"."inquiry_line"("inquiry_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_quote_owner_fk" FOREIGN KEY ("source_quote_id","owner_user_id") REFERENCES "public"."quote"("id","owner_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_quote_confirmation_fk" FOREIGN KEY ("source_quote_id") REFERENCES "public"."quote_confirmation"("quote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_resource_occurred_id_idx" ON "audit_event" USING btree ("resource_type","resource_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "customer_owner_created_id_idx" ON "customer" USING btree ("owner_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inquiry_owner_created_id_idx" ON "inquiry" USING btree ("owner_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "product_sku_idx" ON "product" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_name_en_id_idx" ON "product" USING btree ("name_en","id");--> statement-breakpoint
CREATE INDEX "quote_owner_state_created_id_idx" ON "quote" USING btree ("owner_user_id","state","created_at","id");--> statement-breakpoint
CREATE INDEX "sales_order_owner_created_id_idx" ON "sales_order" USING btree ("owner_user_id","created_at","id");