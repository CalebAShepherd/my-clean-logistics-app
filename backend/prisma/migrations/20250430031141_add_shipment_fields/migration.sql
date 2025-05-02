/*
  Warnings:

  - Added the required column `deliveryEmail` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryName` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryPhone` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `insurance` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `length` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `origin` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupEmail` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupName` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupPhone` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipmentDate` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Shipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deliveryEmail" TEXT NOT NULL,
ADD COLUMN     "deliveryName" TEXT NOT NULL,
ADD COLUMN     "deliveryPhone" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "height" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "insurance" BOOLEAN NOT NULL,
ADD COLUMN     "length" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "origin" TEXT NOT NULL,
ADD COLUMN     "pickupEmail" TEXT NOT NULL,
ADD COLUMN     "pickupName" TEXT NOT NULL,
ADD COLUMN     "pickupPhone" TEXT NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "shipmentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL;
