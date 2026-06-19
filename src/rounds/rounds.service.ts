import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PatientStatus, RoundStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type AnyRow = Record<string, any>;

@Injectable()
export class RoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    const [patients, rounds, goals, alerts] = await Promise.all([
      this.prisma.patient.count({ where: { statusPaciente: PatientStatus.Ativo } }),
      this.prisma.round.count(),
      this.prisma.goal.count(),
      this.prisma.alert.count({ where: { status: 'Ativo' } }),
    ]);

    return {
      ok: true,
      modo: 'NestJS',
      pacientes: patients,
      rounds,
      metas: goals,
      alertasAtivos: alerts,
      ultimaAtualizacao: new Date().toISOString(),
    };
  }

  async bootstrap() {
    const [pacientes, dashboard, diagnostico] = await Promise.all([
      this.listPatients(),
      this.dashboard({}),
      this.health(),
    ]);

    const alertas = await this.prisma.alert.findMany({
      where: { status: 'Ativo', patient: { statusPaciente: PatientStatus.Ativo } },
      include: { patient: true },
      orderBy: { dataAlerta: 'desc' },
    });

    return {
      pacientes,
      alertas: alertas.map((a) => ({
        ...a,
        nomePaciente: a.patient.nomePaciente,
        leito: a.patient.leito,
        unidade: a.patient.unidade,
      })),
      dashboard,
      unidades: [...new Set(pacientes.map((p) => p.unidade).filter(Boolean))],
      diagnostico,
    };
  }

  async listPatients() {
    const patients = await this.prisma.patient.findMany({
      where: { statusPaciente: PatientStatus.Ativo },
      include: {
        rounds: {
          orderBy: { dataRegistro: 'desc' },
          include: { goals: true, risks: true, devices: true, alerts: true },
        },
      },
      orderBy: [{ unidade: 'asc' }, { leito: 'asc' }],
    });

    return patients.map((patient) => {
      const latest = patient.rounds[0];
      const latestGoals = latest?.goals ?? [];
      const risks = latest?.risks[0];
      const devices = latest?.devices.filter((d) => d.statusDispositivo === 'Ativo') ?? [];
      const alerts = latest?.alerts.filter((a) => a.status === 'Ativo') ?? [];

      return {
        ...patient,
        statusRound: latest?.statusRound ?? 'Nao iniciado',
        evolucaoPaciente: latest?.evolucaoPaciente ?? 'Estavel',
        metasResumo: latestGoals.map((m) => [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | ')).join('\n'),
        pendenciasResumo: latest?.pendencias ?? '',
        riscosAtivos: this.riskLabels(risks).join(', '),
        alertasAtivos: alerts.map((a) => a.tipoAlerta).join(', '),
        alertasDetalhes: alerts,
        dispositivosResumo: devices.map((d) => `${d.tipoDispositivo}: ${d.tempoDispositivoDias ?? 0}d`).join(' | '),
      };
    });
  }

  async savePatient(data: AnyRow) {
    if (!data.nomePaciente || !data.leito) {
      throw new Error('Informe nome do paciente e leito.');
    }

    const idPaciente = String(data.idPaciente || this.makeId('PAC'));
    const patient = await this.prisma.patient.upsert({
      where: { idPaciente },
      create: this.patientInput(idPaciente, data),
      update: this.patientInput(idPaciente, data),
    });

    await this.audit('Cadastro/edicao paciente', 'Patient', patient.idPaciente, patient.nomePaciente);
    return patient;
  }

  async archivePatient(idPaciente: string, data: AnyRow) {
    const patient = await this.prisma.patient.update({
      where: { idPaciente },
      data: {
        statusPaciente: PatientStatus.Arquivado,
        desfecho: String(data.desfecho || ''),
        dataDesfecho: this.dateOrNull(data.dataDesfecho),
        dataAtualizacao: new Date(),
      },
    });

    await this.audit('Arquivamento paciente', 'Patient', idPaciente, patient.desfecho ?? '');
    return { ok: true };
  }

  async startRound(data: AnyRow) {
    const idPaciente = String(data.idPaciente || '');
    if (!idPaciente) throw new Error('Paciente invalido.');

    const patient = await this.prisma.patient.findUnique({ where: { idPaciente } });
    if (!patient) throw new NotFoundException('Paciente nao encontrado.');

    const today = this.today();
    const equipesPresentes = Array.isArray(data.equipesPresentes)
      ? data.equipesPresentes.join(', ')
      : String(data.equipesPresentes || '');

    let round = await this.prisma.round.findFirst({
      where: { idPaciente, statusRound: RoundStatus.EmAndamento, dataRound: today },
    });

    if (!round) {
      round = await this.prisma.round.create({
        data: {
          idRound: this.makeId('RND'),
          idPaciente,
          dataRound: today,
          equipesPresentes,
          horarioInicioRound: new Date(),
          statusRound: RoundStatus.EmAndamento,
          evolucaoPaciente: 'Estavel',
        },
      });
      await this.audit('Inicio round', 'Round', round.idRound, idPaciente);
    }

    return this.roundPayload(idPaciente, round.idRound);
  }

  async dashboard(filters: AnyRow) {
    const patients = await this.prisma.patient.findMany({
      where: {
        statusPaciente: PatientStatus.Ativo,
        unidade: filters.unidade || undefined,
      },
    });
    const ids = patients.map((p) => p.idPaciente);
    const rounds = await this.prisma.round.findMany({
      where: {
        idPaciente: { in: ids },
        dataRound: {
          gte: filters.inicio || undefined,
          lte: filters.fim || undefined,
        },
      },
      include: { goals: true, devices: true, risks: true, alerts: true },
    });

    const goals = rounds.flatMap((r) => r.goals);
    const done = goals.filter((g) => g.status === 'Concluida' || g.status === 'Concluída').length;
    const finished = rounds.filter((r) => r.statusRound === RoundStatus.Finalizado).length;
    const activeDevices = rounds.flatMap((r) => r.devices).filter((d) => d.statusDispositivo === 'Ativo');
    const patientWithDevice = new Set(activeDevices.map((d) => d.idPaciente)).size;
    const cvc = new Set(activeDevices.filter((d) => d.tipoDispositivo === 'CVC').map((d) => d.idPaciente)).size;
    const svd = new Set(activeDevices.filter((d) => ['SVD', 'CVD'].includes(d.tipoDispositivo)).map((d) => d.idPaciente)).size;
    const tev = rounds.flatMap((r) => r.risks).filter((r) => r.riscoTEV === 'Sim');
    const tevOk = tev.filter((r) => r.profilaxiaTEV === 'Sim');

    return {
      totalPacientesAtivos: patients.length,
      indicadores: {
        taxaRound: this.pct(finished, Math.max(patients.length, 1)),
        metasConcluidas: this.pct(done, Math.max(goals.length, 1)),
        taxaDispositivos: this.pct(patientWithDevice, Math.max(patients.length, 1)),
        taxaCVC: this.pct(cvc, Math.max(patients.length, 1)),
        taxaSVD: this.pct(svd, Math.max(patients.length, 1)),
        taxaVM: this.pct(patients.filter((p) => Number(p.tempoVMDias || 0) > 0).length, Math.max(patients.length, 1)),
        tempoMedioUnidade: this.avg(patients.map((p) => p.diasInternacao ?? 0)),
        tempoMedioVM: this.avg(patients.map((p) => p.tempoVMDias ?? 0)),
        profilaxiaTEV: this.pct(tevOk.length, Math.max(tev.length, 1)),
        tempoMedioRound: this.avg(rounds.map((r) => r.tempoRoundMinutos ?? 0)),
      },
      gruposAlertas: this.groupAlerts(rounds.flatMap((r) => r.alerts)),
      participacaoEquipe: this.groupTeams(rounds),
      justificativasSedacao: [],
      tempoPCV: [],
    };
  }

  async history(filters: AnyRow) {
    const rounds = await this.prisma.round.findMany({
      where: {
        idPaciente: filters.idPaciente || undefined,
        dataRound: { gte: filters.inicio || undefined, lte: filters.fim || undefined },
        patient: {
          statusPaciente: PatientStatus.Ativo,
          unidade: filters.unidade || undefined,
        },
      },
      include: {
        patient: true,
        goals: true,
        bundle: true,
        infection: true,
        assistance: true,
        risks: true,
        devices: true,
        alerts: true,
      },
      orderBy: { dataRegistro: 'desc' },
    });

    return rounds.map((round) => ({
      paciente: round.patient,
      round,
      metas: round.goals,
      bundle: round.bundle[0] ?? {},
      infeccao: round.infection,
      assistencia: round.assistance[0] ?? {},
      riscos: round.risks[0] ?? {},
      dispositivos: round.devices,
      alertas: round.alerts,
    }));
  }

  async dailyReport(filters: AnyRow) {
    const data = filters.data || this.today();
    const rounds = await this.history({ inicio: data, fim: data, unidade: filters.unidade });
    return { data, rounds, alertas: [] };
  }

  private async roundPayload(idPaciente: string, idRound: string) {
    const [paciente, round, previousRound] = await Promise.all([
      this.prisma.patient.findUnique({ where: { idPaciente } }),
      this.prisma.round.findUnique({
        where: { idRound },
        include: { goals: true, bundle: true, infection: true, assistance: true, risks: true, devices: true },
      }),
      this.prisma.round.findFirst({
        where: { idPaciente, idRound: { not: idRound }, statusRound: RoundStatus.Finalizado },
        orderBy: { dataRegistro: 'desc' },
        include: { goals: true },
      }),
    ]);

    return {
      paciente,
      round,
      metas: round?.goals ?? [],
      metasAnteriores: previousRound?.goals.filter((g) => ['Pendente', 'Em andamento'].includes(g.status)) ?? [],
      bundle: round?.bundle[0] ?? {},
      infeccao: round?.infection ?? [],
      assistencia: round?.assistance[0] ?? {},
      riscos: round?.risks[0] ?? {},
      dispositivos: round?.devices ?? [],
    };
  }

  private patientInput(idPaciente: string, data: AnyRow): Prisma.PatientUncheckedCreateInput {
    return {
      idPaciente,
      prontuario: String(data.prontuario || ''),
      nomePaciente: String(data.nomePaciente || ''),
      dataNascimento: this.dateOrNull(data.dataNascimento),
      idade: this.numberOrNull(data.idade),
      leito: String(data.leito || ''),
      unidade: String(data.unidade || 'UTI Adulto'),
      motivoInternacao: String(data.motivoInternacao || ''),
      diagnosticoAtual: String(data.diagnosticoAtual || ''),
      dataAdmissaoHospitalar: this.dateOrNull(data.dataAdmissaoHospitalar),
      dataAdmissaoUnidade: this.dateOrNull(data.dataAdmissaoUnidade),
      diasInternacao: this.daysBetween(data.dataAdmissaoUnidade || data.dataAdmissaoHospitalar),
      SAPS: this.numberOrNull(data.SAPS),
      dataInicioVM: this.dateOrNull(data.dataInicioVM),
      dataFimVM: this.dateOrNull(data.dataFimVM),
      tempoVMDias: this.daysBetween(data.dataInicioVM, data.dataFimVM),
      previsaoAlta: this.dateOrNull(data.previsaoAlta),
      statusPaciente: PatientStatus.Ativo,
      dataAtualizacao: new Date(),
    };
  }

  private async audit(acao: string, entidade: string, idEntidade: string, detalhes: string) {
    await this.prisma.auditLog.create({
      data: { idLog: this.makeId('LOG'), acao, entidade, idEntidade, detalhes },
    });
  }

  private groupAlerts(alerts: { tipoAlerta: string; idPaciente: string; status: string }[]) {
    const grouped = new Map<string, { tipo: string; quantidade: number; pacientes: string[] }>();
    for (const alert of alerts.filter((a) => a.status === 'Ativo')) {
      const item = grouped.get(alert.tipoAlerta) ?? { tipo: alert.tipoAlerta, quantidade: 0, pacientes: [] };
      item.quantidade += 1;
      item.pacientes.push(alert.idPaciente);
      grouped.set(alert.tipoAlerta, item);
    }
    return [...grouped.values()];
  }

  private groupTeams(rounds: { equipesPresentes: string | null }[]) {
    const grouped = new Map<string, { equipe: string; quantidade: number }>();
    for (const round of rounds) {
      for (const team of String(round.equipesPresentes || '').split(',').map((x) => x.trim()).filter(Boolean)) {
        const item = grouped.get(team) ?? { equipe: team, quantidade: 0 };
        item.quantidade += 1;
        grouped.set(team, item);
      }
    }
    return [...grouped.values()];
  }

  private riskLabels(r?: AnyRow | null) {
    if (!r) return [];
    return [
      ['riscoTEV', 'TEV'],
      ['riscoInfeccao', 'Infeccao'],
      ['riscoSangramento', 'Sangramento'],
      ['riscoLPP', 'LPP'],
      ['riscoNutricional', 'Nutricional'],
      ['riscoDelirium', 'Delirium'],
      ['riscoBroncoaspiracao', 'Broncoaspiracao'],
      ['riscoQueda', 'Queda'],
    ].filter(([key]) => r[key] === 'Sim').map(([, label]) => label);
  }

  private dateOrNull(value: unknown) {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private numberOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }

  private daysBetween(start: unknown, end?: unknown) {
    const a = this.dateOrNull(start);
    if (!a) return null;
    const b = this.dateOrNull(end) ?? new Date();
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private makeId(prefix: string) {
    return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private avg(values: number[]) {
    const clean = values.filter((n) => n > 0);
    return clean.length ? Math.round(clean.reduce((a, b) => a + b, 0) / clean.length) : 0;
  }

  private pct(a: number, b: number) {
    return b ? Math.round((a / b) * 100) : 0;
  }
}
