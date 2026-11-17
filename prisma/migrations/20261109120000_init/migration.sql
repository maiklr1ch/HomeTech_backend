-- CreateEnum
CREATE TYPE "Role" AS ENUM ('client', 'admin');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('in_stock', 'expected', 'out_of_stock');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('number', 'enum', 'bool', 'text');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('new', 'processing', 'assembled', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('pickup', 'courier', 'nova_poshta');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'cod', 'invoice');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "default_address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "import_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL,
    "unit" TEXT,
    "options" TEXT[],
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "supplier_code" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" INTEGER,
    "manufacturer_id" INTEGER,
    "price" DECIMAL(12,2),
    "supplier_price" DECIMAL(12,2),
    "stock_status" "StockStatus" NOT NULL,
    "warranty_months" INTEGER,
    "supplier_image_url" TEXT,
    "own_image_path" TEXT,
    "description" TEXT,
    "assembly_country" TEXT,
    "assembly_city" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "updated_from_supplier_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "product_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "value_number" DOUBLE PRECISION,
    "value_text" TEXT,
    "value_bool" BOOLEAN,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("product_id","attribute_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "client_order_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'new',
    "delivery_method" "DeliveryMethod" NOT NULL,
    "delivery_address" TEXT,
    "delivery_date" DATE,
    "delivery_slot" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "comment" TEXT,
    "admin_note" TEXT,
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "note" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key_key" ON "categories"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_name_key" ON "category_attributes"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key_key" ON "manufacturers"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "products_supplier_code_key" ON "products"("supplier_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_is_visible_idx" ON "products"("category_id", "is_visible");

-- CreateIndex
CREATE INDEX "products_manufacturer_id_idx" ON "products"("manufacturer_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_attribute_id_value_number_idx" ON "product_attribute_values"("attribute_id", "value_number");

-- CreateIndex
CREATE INDEX "product_attribute_values_attribute_id_value_text_idx" ON "product_attribute_values"("attribute_id", "value_text");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_client_order_id_key" ON "orders"("user_id", "client_order_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_product_id_key" ON "order_items"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_changed_at_idx" ON "order_status_history"("order_id", "changed_at");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
