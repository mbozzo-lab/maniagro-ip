-- CreateTable
CREATE TABLE "Actividad" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER,
    "detalle" TEXT NOT NULL,
    "linea" TEXT,
    "responsable" TEXT NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'NO_INICIADO',
    "plazo" TEXT,
    "prioridad" INTEGER,
    "comentario" TEXT,
    "revisar" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3),
    "sheetRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "Solicitud"("id") ON DELETE SET NULL ON UPDATE CASCADE;
