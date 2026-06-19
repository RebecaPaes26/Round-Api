-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('Ativo', 'Arquivado');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('EmAndamento', 'Finalizado');

-- CreateTable
CREATE TABLE "Patient" (
    "idPaciente" TEXT NOT NULL,
    "prontuario" TEXT,
    "nomePaciente" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "idade" INTEGER,
    "leito" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UTI Adulto',
    "motivoInternacao" TEXT,
    "diagnosticoAtual" TEXT,
    "dataAdmissaoHospitalar" TIMESTAMP(3),
    "dataAdmissaoUnidade" TIMESTAMP(3),
    "diasInternacao" INTEGER,
    "SAPS" INTEGER,
    "dataInicioVM" TIMESTAMP(3),
    "dataFimVM" TIMESTAMP(3),
    "tempoVMDias" INTEGER,
    "previsaoAlta" TIMESTAMP(3),
    "statusPaciente" "PatientStatus" NOT NULL DEFAULT 'Ativo',
    "desfecho" TEXT,
    "dataDesfecho" TIMESTAMP(3),
    "dataAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("idPaciente")
);

-- CreateTable
CREATE TABLE "Round" (
    "idRound" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "dataRound" TEXT NOT NULL,
    "equipesPresentes" TEXT,
    "horarioInicioRound" TIMESTAMP(3),
    "horarioTerminoRound" TIMESTAMP(3),
    "tempoRoundMinutos" INTEGER,
    "statusRound" "RoundStatus" NOT NULL DEFAULT 'EmAndamento',
    "problemaAtivoPrincipal" TEXT,
    "barreirasAlta" TEXT,
    "condutaDefinida" TEXT,
    "evolucaoPaciente" TEXT,
    "pendencias" TEXT,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("idRound")
);

-- CreateTable
CREATE TABLE "Goal" (
    "idMeta" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" TEXT NOT NULL,
    "prazo" TEXT,
    "responsavel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "conduta" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("idMeta")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "idBundle" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analgesiaAdequada" TEXT,
    "podeReduzirSedacao" TEXT,
    "despertarDiario" TEXT,
    "alvoRASS" TEXT,
    "justificativaNaoReducaoSedacao" TEXT,
    "outroJustificativaSedacao" TEXT,
    "pacienteDelirium" TEXT,
    "podeIniciarDesmame" TEXT,
    "indicacaoTRE" TEXT,
    "realizarExtubacao" TEXT,
    "podeMobilizarHoje" TEXT,
    "nivelMobilidade" TEXT,
    "progredirMobilidade" TEXT,
    "justificativaNaoMobilizar" TEXT,
    "familiaInformadaPlano" TEXT,
    "presencaLesao" TEXT,
    "localLesao" TEXT,
    "grauLesao" TEXT,
    "barreiraPsicossocial" TEXT,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("idBundle")
);

-- CreateTable
CREATE TABLE "Infection" (
    "idInfeccao" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspeitaInfeccaoAtiva" TEXT,
    "provavelFoco" TEXT,
    "nomeAntibiotico" TEXT,
    "dataInicioAntibiotico" TIMESTAMP(3),
    "tempoTratamentoPrevistoDias" INTEGER,
    "dataProvavelTerminoAntibiotico" TIMESTAMP(3),
    "tempoAntibioticoDias" INTEGER,
    "melhoraParametrosInfeccao" TEXT,
    "condutaSemMelhora" TEXT,

    CONSTRAINT "Infection_pkey" PRIMARY KEY ("idInfeccao")
);

-- CreateTable
CREATE TABLE "Assistance" (
    "idAssistencia" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viasAlimentacao" TEXT,
    "tneDataInicio" TIMESTAMP(3),
    "tneVetPleno" TEXT,
    "tneAdequacaoPercentual" INTEGER,
    "tnpDataInicio" TIMESTAMP(3),
    "tnpVetPleno" TEXT,
    "tnpAdequacaoPercentual" INTEGER,
    "npoDataInicio" TIMESTAMP(3),
    "npoDias" INTEGER,
    "instabilidadeHemodinamica" TEXT,
    "instabilidadeUltimasHoras" TEXT,
    "usoDrogaVasoativa" TEXT,
    "aumentoDoseDrogaVasoativa" TEXT,
    "lactatoAlterado" TEXT,
    "suporteRespiratorio" TEXT,
    "modoVentilatorioAtual" TEXT,
    "dataInicioModoVentilatorio" TIMESTAMP(3),
    "diasModoVentilatorio" INTEGER,
    "viaAerea" TEXT,
    "statusSuporteVentilatorio" TEXT,
    "aumentoSuporteVentilatorio" TEXT,
    "pacienteEmHD" TEXT,
    "tipoHD" TEXT,
    "antibioticoEmUso" TEXT,
    "ajusteAntibioticoDialise" TEXT,
    "pausaDialitica" TEXT,
    "dataInicioPausaDialitica" TIMESTAMP(3),
    "tempoPausaDialiticaDias" INTEGER,
    "dataProvavelTerminoPausaDialitica" TIMESTAMP(3),

    CONSTRAINT "Assistance_pkey" PRIMARY KEY ("idAssistencia")
);

-- CreateTable
CREATE TABLE "Risk" (
    "idRisco" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riscoTEV" TEXT,
    "riscoInfeccao" TEXT,
    "riscoSangramento" TEXT,
    "riscoLPP" TEXT,
    "riscoNutricional" TEXT,
    "riscoDelirium" TEXT,
    "riscoBroncoaspiracao" TEXT,
    "riscoQueda" TEXT,
    "profilaxiaTEV" TEXT,
    "profilaxiaLAMG" TEXT,
    "outrosRiscos" TEXT,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("idRisco")
);

-- CreateTable
CREATE TABLE "Device" (
    "idDispositivo" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoDispositivo" TEXT NOT NULL,
    "sitio" TEXT,
    "dataInsercao" TIMESTAMP(3),
    "podeRetirarHoje" TEXT,
    "dataRetirada" TIMESTAMP(3),
    "tempoDispositivoDias" INTEGER,
    "justificativaPermanencia" TEXT,
    "statusDispositivo" TEXT NOT NULL DEFAULT 'Ativo',

    CONSTRAINT "Device_pkey" PRIMARY KEY ("idDispositivo")
);

-- CreateTable
CREATE TABLE "Alert" (
    "idAlerta" TEXT NOT NULL,
    "idPaciente" TEXT NOT NULL,
    "idRound" TEXT NOT NULL,
    "dataAlerta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoAlerta" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "gravidade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "origem" TEXT,
    "dataResolucao" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("idAlerta")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "idLog" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "idEntidade" TEXT NOT NULL,
    "detalhes" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("idLog")
);

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_idPaciente_fkey" FOREIGN KEY ("idPaciente") REFERENCES "Patient"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_idPaciente_fkey" FOREIGN KEY ("idPaciente") REFERENCES "Patient"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Infection" ADD CONSTRAINT "Infection_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistance" ADD CONSTRAINT "Assistance_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_idPaciente_fkey" FOREIGN KEY ("idPaciente") REFERENCES "Patient"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_idPaciente_fkey" FOREIGN KEY ("idPaciente") REFERENCES "Patient"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_idRound_fkey" FOREIGN KEY ("idRound") REFERENCES "Round"("idRound") ON DELETE CASCADE ON UPDATE CASCADE;
