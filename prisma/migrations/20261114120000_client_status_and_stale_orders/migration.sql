-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" SET "is_blocked" = true WHERE "is_active" = false;

ALTER TABLE "users" DROP COLUMN "is_active";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "orders" AS o
SET "status_changed_at" = h."last_change"
FROM (
    SELECT "order_id", MAX("changed_at") AS "last_change"
    FROM "order_status_history"
    GROUP BY "order_id"
) AS h
WHERE h."order_id" = o."id";

-- CreateIndex
CREATE INDEX "orders_status_status_changed_at_idx" ON "orders"("status", "status_changed_at");
