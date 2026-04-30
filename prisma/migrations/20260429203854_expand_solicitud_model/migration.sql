/*
  Warnings:

  - You are about to drop the column `plazo` on the `Solicitud` table. All the data in the column will be lost.
  - You are about to drop the column `solicitante` on the `Solicitud` table. All the data in the column will be lost.
  - Added the required column `proyecto` to the `Solicitud` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Clasificacion" AS ENUM ('A', 'B', 'C');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Estado" ADD VALUE 'RETRASADO';
ALTER TYPE "Estado" ADD VALUE 'ANULADO';

-- DropForeignKey
ALTER TABLE "Solicitud" DROP CONSTRAINT "Solicitud_responsableId_fkey";

-- AlterTable
ALTER TABLE "Solicitud" DROP COLUMN "plazo",
DROP COLUMN "solicitante",
ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "asignado" TEXT,
ADD COLUMN     "avance" DOUBLE PRECISION,
ADD COLUMN     "clasificacion" "Clasificacion",
ADD COLUMN     "criterio" TEXT,
ADD COLUMN     "defGcia" TEXT,
ADD COLUMN     "definicionIM" TEXT,
ADD COLUMN     "driver" TEXT,
ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "gerencia" BOOLEAN,
ADD COLUMN     "im" BOOLEAN,
ADD COLUMN     "inversionEst" TEXT,
ADD COLUMN     "linea" TEXT,
ADD COLUMN     "nroConsuman" TEXT,
ADD COLUMN     "numero" INTEGER,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "planta" TEXT,
ADD COLUMN     "proyecto" TEXT NOT NULL,
ADD COLUMN     "repasarCon" TEXT,
ALTER COLUMN "tipo" DROP NOT NULL,
ALTER COLUMN "detalle" DROP NOT NULL,
ALTER COLUMN "responsableId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CriterioClasificacion" (
    "id" SERIAL NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "clasificacion" "Clasificacion" NOT NULL,
    "nombre" TEXT NOT NULL,
    "definicion" TEXT NOT NULL,
    "criterio1Label" TEXT NOT NULL,
    "criterio1" TEXT NOT NULL,
    "criterio2Label" TEXT NOT NULL,
    "criterio2" TEXT NOT NULL,
    "criterio3Label" TEXT NOT NULL,
    "criterio3" TEXT NOT NULL,
    "rolPruebas" TEXT NOT NULL,
    "ejemplos" TEXT NOT NULL,
    "clientesDirectos" TEXT NOT NULL,

    CONSTRAINT "CriterioClasificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CriterioClasificacion_tipo_clasificacion_key" ON "CriterioClasificacion"("tipo", "clasificacion");

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
