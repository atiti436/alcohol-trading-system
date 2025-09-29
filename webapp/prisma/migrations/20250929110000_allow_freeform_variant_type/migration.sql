-- Allow free-form text for product variant types
ALTER TABLE "public"."product_variants"
  ALTER COLUMN "variant_type" TYPE TEXT USING "variant_type"::text;

ALTER TABLE "public"."product_variants"
  ALTER COLUMN "variant_type" TYPE VARCHAR(100);

DROP TYPE IF EXISTS "public"."VariantType";
