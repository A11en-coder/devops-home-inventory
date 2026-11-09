-- Enable case-insensitive text for item names.
CREATE EXTENSION IF NOT EXISTS citext;
-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");
-- Enforce item rules even when data is written outside the application.
ALTER TABLE "Item"
    ADD CONSTRAINT "Item_quantity_nonnegative" CHECK ("quantity" >= 0),
    ADD CONSTRAINT "Item_low_stock_threshold_nonnegative" CHECK ("lowStockThreshold" >= 0),
    ADD CONSTRAINT "Item_name_nonblank" CHECK (btrim("name"::text) <> '');
