-- CreateTable
CREATE TABLE "Lesion" (
    "idLesao" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localLesao" TEXT,
    "estadiamento" TEXT,
    "acompanhamento" TEXT,
    "statusLesao" TEXT NOT NULL DEFAULT 'Ativa',
    "dataExclusao" TIMESTAMP(3),

    CONSTRAINT "Lesion_pkey" PRIMARY KEY ("idLesao")
);

-- AddForeignKey
ALTER TABLE "Lesion" ADD CONSTRAINT "Lesion_idPaciente_fkey" FOREIGN KEY ("idPaciente") REFERENCES "Patient"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesion" ADD CONSTRAINT "Lesion_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;
