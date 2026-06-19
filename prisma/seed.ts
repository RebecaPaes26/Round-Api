import { PrismaClient, PatientStatus, RoundStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.upsert({
    where: { idPaciente: 'PAC-DEMO01' },
    update: {},
    create: {
      idPaciente: 'PAC-DEMO01',
      prontuario: '123456',
      nomePaciente: 'Paciente Demonstração',
      leito: 'UTI-01',
      unidade: 'UTI Adulto',
      diagnosticoAtual: 'Sepse pulmonar em acompanhamento',
      motivoInternacao: 'Insuficiência respiratória aguda',
      statusPaciente: PatientStatus.Ativo,
      diasInternacao: 4,
      tempoVMDias: 2,
    },
  });

  const round = await prisma.round.upsert({
    where: { idRound: 'RND-DEMO01' },
    update: {},
    create: {
      idRound: 'RND-DEMO01',
      idPaciente: patient.idPaciente,
      dataRound: new Date().toISOString().slice(0, 10),
      equipesPresentes: 'Médico(a), Enfermeiro(a), Fisioterapeuta',
      statusRound: RoundStatus.Finalizado,
      evolucaoPaciente: 'Estável',
      problemaAtivoPrincipal: 'Desmame ventilatório e controle infeccioso',
      condutaDefinida: 'Manter antibiótico e reavaliar TRE amanhã',
      tempoRoundMinutos: 18,
    },
  });

  await prisma.goal.upsert({
    where: { idMeta: 'MET-DEMO01' },
    update: {},
    create: {
      idMeta: 'MET-DEMO01',
      idPaciente: patient.idPaciente,
      idRound: round.idRound,
      meta: 'Avaliar teste de respiração espontânea',
      prazo: '24h',
      responsavel: 'Fisioterapia',
      status: 'Em andamento',
      conduta: 'Reduzir suporte conforme tolerância',
    },
  });

  await prisma.risk.upsert({
    where: { idRisco: 'RIS-DEMO01' },
    update: {},
    create: {
      idRisco: 'RIS-DEMO01',
      idPaciente: patient.idPaciente,
      idRound: round.idRound,
      riscoTEV: 'Sim',
      profilaxiaTEV: 'Sim',
      riscoLPP: 'Sim',
      riscoDelirium: 'Sim',
    },
  });

  await prisma.alert.upsert({
    where: { idAlerta: 'ALT-DEMO01' },
    update: {},
    create: {
      idAlerta: 'ALT-DEMO01',
      idPaciente: patient.idPaciente,
      idRound: round.idRound,
      tipoAlerta: 'Risco LPP',
      mensagem: 'Paciente com risco de lesão por pressão registrado no round.',
      gravidade: 'Moderada',
      origem: 'Riscos',
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
