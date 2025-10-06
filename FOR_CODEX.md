# Database Schema Sync Issue - URGENT FIX NEEDED

## Problem
The application is failing with error:
```
PrismaClientKnownRequestError:
Invalid `prisma.$queryRaw()` invocation:
Raw query failed. Code: `42P01`. Message: `relation "inventory" does not exist`
```

## Root Cause
The `inventory` table (mapped from Prisma model `Inventory`) does not exist in the Production PostgreSQL database on Zeabur, even though:
- The Prisma schema defines the `Inventory` model
- We ran `npx prisma db push --force-reset` (apparently failed or didn't sync properly)
- The application code expects this table to exist

## Required Actions

### 1. Verify Current Database State
Please check if the `inventory` table exists in the PostgreSQL database:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory';
```

### 2. Check Prisma Schema
Verify the `Inventory` model exists in `prisma/schema.prisma`:
```prisma
model Inventory {
  id         String   @id @default(cuid())
  variant_id String
  warehouse  Warehouse
  quantity   Int      @default(0)
  available  Int      @default(0)
  reserved   Int      @default(0)
  cost_price Decimal? @db.Decimal(10, 2)

  variant ProductVariant @relation(fields: [variant_id], references: [id], onDelete: Cascade)

  @@unique([variant_id, warehouse])
  @@map("inventory")
}
```

### 3. Force Database Sync
Run the following commands in the Zeabur environment:

```bash
cd webapp
npx prisma generate
npx prisma db push --force-reset --accept-data-loss
```

**IMPORTANT**: The `--force-reset` flag will:
- Drop ALL tables
- Recreate them from scratch
- **All data will be lost** (acceptable in this case since it's a development/testing environment)

### 4. Verify Table Creation
After running `db push`, verify the table exists:
```sql
\dt inventory
```

Or:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory';
```

Expected columns:
- `id` (text/varchar)
- `variant_id` (text/varchar)
- `warehouse` (text/varchar or enum)
- `quantity` (integer)
- `available` (integer)
- `reserved` (integer)
- `cost_price` (decimal/numeric)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 5. Alternative: Manual Table Creation
If `db push` continues to fail, manually create the table:

```sql
CREATE TABLE IF NOT EXISTS "inventory" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_variant_id_warehouse_key" ON "inventory"("variant_id", "warehouse");

ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 6. Restart the Application
After database sync, restart the Zeabur service to pick up the new schema.

## Expected Outcome
After fixing:
- Dashboard should load without errors
- Inventory queries in `src/app/api/dashboard/route.ts` should work
- All inventory-related APIs should function properly

## Files Affected
- `src/app/api/dashboard/route.ts` (lines 93-101, 118-131, 196-208, 260-273)
- `src/app/api/inventory/adjustments/route.ts`
- `src/app/api/stock-transfers/route.ts`
- `src/app/api/inventory/quick-receive/route.ts`
- `src/app/api/purchases/[id]/receive/route.ts`

## Verification Steps
After the fix, test:
1. Navigate to `/dashboard` - should load without errors
2. Dashboard should show inventory values (currently 0 is expected)
3. Create a purchase order and receive goods - inventory should update
4. Dashboard should reflect the new inventory numbers

## Please Report Back
After executing the fix:
1. Confirm the `inventory` table exists
2. Share the output of `\d inventory` (table structure)
3. Test the dashboard and confirm it loads
4. Let me know if any errors persist

Thank you!
