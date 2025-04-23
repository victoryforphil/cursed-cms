-- CreateTable
CREATE TABLE "assets" (
    "uuid" TEXT NOT NULL,
    "imported_fullpath" TEXT NOT NULL,
    "imported_filename" TEXT NOT NULL,
    "stored_fullpath" TEXT NOT NULL,
    "stored_url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "stored_filename" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "hash" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "asset_meta_base" (
    "id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_class" TEXT NOT NULL,
    "asset_location_name" TEXT NOT NULL,
    "asset_camera" TEXT NOT NULL,
    "asset_date_label" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "asset_meta_base_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_meta_base_asset_id_key" ON "asset_meta_base"("asset_id");

-- AddForeignKey
ALTER TABLE "asset_meta_base" ADD CONSTRAINT "asset_meta_base_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
