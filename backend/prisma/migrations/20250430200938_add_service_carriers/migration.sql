-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "serviceCarrierId" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "apiKey" TEXT,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_code_key" ON "Carrier"("code");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_serviceCarrierId_fkey" FOREIGN KEY ("serviceCarrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
