import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PatientStatus, RoundStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type AnyRow = Record<string, any>;

@Injectable()
export class RoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    const [patients, rounds, goals, alertRows] = await Promise.all([
      this.prisma.patient.count({ where: { statusPaciente: PatientStatus.Ativo } }),
      this.prisma.round.count(),
      this.prisma.goal.count(),
      this.prisma.alert.findMany({ where: { status: 'Ativo' }, select: { idPaciente: true, codigo: true } }),
    ]);
    const alerts = new Set(alertRows.filter((alert) => this.isSupportedAlertCode(alert.codigo)).map((alert) => `${alert.idPaciente}|${alert.codigo}`)).size;

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
      alertas: this.uniqueSupportedAlerts(alertas).map((a) => ({
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

  async listPatients(): Promise<AnyRow[]> {
    const patients = await this.prisma.patient.findMany({
      where: { statusPaciente: PatientStatus.Ativo },
      include: {
        rounds: {
          orderBy: { dataRegistro: 'desc' },
          include: { goals: true, risks: true, devices: true, alerts: true },
        },
        alerts: { where: { status: 'Ativo' }, orderBy: { dataAlerta: 'desc' } },
      },
      orderBy: [{ unidade: 'asc' }, { leito: 'asc' }],
    });

    return patients.map((patient) => this.patientSummary(patient));
  }

  async getPatient(idPaciente: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { idPaciente, statusPaciente: PatientStatus.Ativo },
      include: {
        rounds: {
          orderBy: { dataRegistro: 'desc' },
          include: {
            goals: true,
            bundle: true,
            infection: true,
            assistance: true,
            risks: true,
            devices: true,
            lesions: true,
            alerts: true,
          },
        },
        goals: { orderBy: { dataRegistro: 'desc' } },
        alerts: { where: { status: 'Ativo' }, orderBy: { dataAlerta: 'desc' } },
        devices: { where: { statusDispositivo: 'Ativo' }, orderBy: { dataRegistro: 'desc' } },
      },
    });

    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    return {
      ...this.patientSummary(patient),
      rounds: patient.rounds,
      metas: patient.goals,
      alertas: patient.alerts,
      dispositivos: patient.devices,
    };
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
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

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

    await this.syncAlertsForRound(round.idRound);
    return this.roundPayload(idPaciente, round.idRound);
  }

  async saveRound(idRound: string, data: AnyRow) {
    const round = await this.prisma.round.findUnique({ where: { idRound } });
    if (!round) throw new NotFoundException('Round não encontrado.');

    const idPaciente = round.idPaciente;
    const previousStatuses = this.arrayRows(data.metasAnteriores);
    const goals = this.arrayRows(data.metas);
    const infections = this.arrayRows(data.infeccoes);
    const devices = this.arrayRows(data.dispositivos);
    const lesions = this.arrayRows(data.lesoes);
    const bundle = this.row(data.bundle);
    const assistencia = this.row(data.assistencia);
    const riscos = this.row(data.riscos);

    await this.prisma.$transaction(async (tx) => {
      await tx.round.update({
        where: { idRound },
        data: {
          equipesPresentes: this.joinArray(data.equipesPresentes),
          problemaAtivoPrincipal: this.stringOrNull(data.problemaAtivoPrincipal),
          barreirasAlta: this.stringOrNull(data.barreirasAlta),
          evolucaoPaciente: this.stringOrNull(data.evolucaoPaciente),
          pendencias: this.joinArray(data.pendencias),
          statusRound: data.statusRound === 'Finalizado' ? RoundStatus.Finalizado : RoundStatus.EmAndamento,
          horarioTerminoRound: data.statusRound === 'Finalizado' ? new Date() : undefined,
        },
      });

      for (const goal of previousStatuses) {
        if (goal.idMeta && goal.status) {
          await tx.goal.update({
            where: { idMeta: String(goal.idMeta) },
            data: { status: String(goal.status) },
          });
        }
      }

      await tx.goal.deleteMany({ where: { idRound } });
      if (goals.length) {
        await tx.goal.createMany({
          data: goals
            .filter((goal) => goal.meta)
            .map((goal) => ({
              idMeta: this.makeId('MET'),
              idPaciente,
              idRound,
              meta: String(goal.meta),
              prazo: this.stringOrNull(goal.prazo),
              responsavel: this.stringOrNull(goal.responsavel),
              status: String(goal.status || 'Pendente'),
              conduta: this.stringOrNull(goal.conduta),
            })),
        });
      }

      await tx.bundle.deleteMany({ where: { idRound } });
      await tx.bundle.create({
        data: {
          idBundle: this.makeId('BND'),
          idPaciente,
          idRound,
          analgesiaAdequada: this.stringOrNull(bundle.analgesiaAdequada),
          podeReduzirSedacao: this.stringOrNull(bundle.podeReduzirSedacao),
          despertarDiario: this.stringOrNull(bundle.despertarDiario),
          alvoRASS: this.stringOrNull(bundle.alvoRASS),
          justificativaNaoReducaoSedacao: this.stringOrNull(bundle.justificativaNaoReducaoSedacao),
          outroJustificativaSedacao: this.stringOrNull(bundle.outroJustificativaSedacao),
          pacienteDelirium: this.stringOrNull(bundle.pacienteDelirium),
          podeIniciarDesmame: this.stringOrNull(bundle.podeIniciarDesmame),
          indicacaoTRE: this.stringOrNull(bundle.indicacaoTRE),
          realizarExtubacao: this.stringOrNull(bundle.realizarExtubacao),
          podeMobilizarHoje: this.stringOrNull(bundle.podeMobilizarHoje),
          nivelMobilidade: this.stringOrNull(bundle.nivelMobilidade),
          progredirMobilidade: this.stringOrNull(bundle.progredirMobilidade),
          justificativaNaoMobilizar: this.stringOrNull(bundle.justificativaNaoMobilizar),
          familiaInformadaPlano: this.stringOrNull(bundle.familiaInformadaPlano),
          presencaLesao: lesions.length ? 'Sim' : this.stringOrNull(bundle.presencaLesao),
          localLesao: lesions.map((lesion) => lesion.localLesao).filter(Boolean).join('; '),
          grauLesao: lesions.map((lesion) => lesion.estadiamento).filter(Boolean).join('; '),
        },
      });

      await tx.assistance.deleteMany({ where: { idRound } });
      await tx.assistance.create({
        data: {
          idAssistencia: this.makeId('AST'),
          idPaciente,
          idRound,
          viasAlimentacao: this.joinArray(assistencia.viasAlimentacao),
          tneDataInicio: this.dateOrNull(assistencia.tneDataInicio),
          tneVetPleno: this.stringOrNull(assistencia.tneVetPleno),
          tneAdequacaoPercentual: this.numberOrNull(assistencia.tneAdequacaoPercentual),
          tnpDataInicio: this.dateOrNull(assistencia.tnpDataInicio),
          tnpVetPleno: this.stringOrNull(assistencia.tnpVetPleno),
          tnpAdequacaoPercentual: this.numberOrNull(assistencia.tnpAdequacaoPercentual),
          npoDataInicio: this.dateOrNull(assistencia.npoDataInicio),
          npoDias: this.daysBetween(assistencia.npoDataInicio),
          instabilidadeHemodinamica: this.stringOrNull(assistencia.instabilidadeHemodinamica),
          instabilidadeUltimasHoras: this.stringOrNull(assistencia.instabilidadeUltimasHoras),
          usoDrogaVasoativa: this.stringOrNull(assistencia.usoDrogaVasoativa),
          aumentoDoseDrogaVasoativa: this.stringOrNull(assistencia.aumentoDoseDrogaVasoativa),
          suporteRespiratorio: this.stringOrNull(assistencia.suporteRespiratorio),
          viaAerea: this.stringOrNull(assistencia.viaAerea),
          modoVentilatorioAtual: this.stringOrNull(assistencia.modoVentilatorioAtual),
          dataInicioModoVentilatorio: this.dateOrNull(assistencia.dataInicioModoVentilatorio),
          diasModoVentilatorio: this.daysBetween(assistencia.dataInicioModoVentilatorio),
          statusSuporteVentilatorio: this.stringOrNull(assistencia.statusSuporteVentilatorio),
          pacienteEmHD: this.stringOrNull(assistencia.pacienteEmHD),
          tipoHD: this.stringOrNull(assistencia.tipoHD),
          antibioticoEmUso: this.stringOrNull(assistencia.antibioticoEmUso),
          ajusteAntibioticoDialise: this.stringOrNull(assistencia.ajusteAntibioticoDialise),
        },
      });

      await tx.infection.deleteMany({ where: { idRound } });
      if (infections.length) {
        await tx.infection.createMany({
          data: infections.map((infection) => ({
            idInfeccao: this.makeId('INF'),
            idPaciente,
            idRound,
            suspeitaInfeccaoAtiva: this.stringOrNull(infection.suspeitaInfeccaoAtiva),
            provavelFoco: this.stringOrNull(infection.provavelFoco),
            nomeAntibiotico: this.stringOrNull(infection.nomeAntibiotico),
            dataInicioAntibiotico: this.dateOrNull(infection.dataInicioAntibiotico),
            tempoTratamentoPrevistoDias: this.numberOrNull(infection.tempoTratamentoPrevistoDias),
            dataProvavelTerminoAntibiotico: this.endDateFromDayZero(infection.dataInicioAntibiotico, infection.tempoTratamentoPrevistoDias),
            tempoAntibioticoDias: this.daysBetween(infection.dataInicioAntibiotico),
            melhoraParametrosInfeccao: this.stringOrNull(infection.melhoraParametrosInfeccao),
            condutaSemMelhora: this.stringOrNull(infection.condutaSemMelhora),
          })),
        });
      }

      await tx.device.deleteMany({ where: { idRound } });
      if (devices.length) {
        await tx.device.createMany({
          data: devices.map((device) => ({
            idDispositivo: this.makeId('DSP'),
            idPaciente,
            idRound,
            tipoDispositivo: String(device.tipoDispositivo || ''),
            presente: this.stringOrNull(device.presente) || (device.dataRetirada ? 'Não' : 'Sim'),
            sitio: this.stringOrNull(device.sitio),
            dataInsercao: this.dateOrNull(device.dataInsercao),
            horaInsercao: this.stringOrNull(device.horaInsercao),
            dataRetirada: this.dateOrNull(device.dataRetirada),
            horaRetirada: this.stringOrNull(device.horaRetirada),
            tempoDispositivoDias: this.daysBetween(device.dataInsercao, device.dataRetirada),
            indicacaoInicial: this.stringOrNull(device.indicacaoInicial),
            justificativaPermanencia: this.stringOrNull(device.justificativaPermanencia),
            dispositivoAindaNecessario: this.stringOrNull(device.dispositivoAindaNecessario),
            podeRetirarHoje: this.stringOrNull(device.podeRetirarHoje),
            motivoNaoRetirada: this.stringOrNull(device.motivoNaoRetirada),
            conduta: this.stringOrNull(device.conduta),
            responsavelReavaliacao: this.stringOrNull(device.responsavelReavaliacao),
            dataProximaReavaliacao: this.dateOrNull(device.dataProximaReavaliacao),
            dataUltimaReavaliacao: this.dateOrNull(device.dataUltimaReavaliacao) || new Date(),
            usuarioUltimaReavaliacao: this.stringOrNull(device.usuarioUltimaReavaliacao) || this.stringOrNull(data.usuarioSalvamento),
            statusDispositivo: device.dataRetirada ? 'Retirado' : String(device.statusDispositivo || 'Ativo'),
          })),
        });
      }

      await tx.lesion.deleteMany({ where: { idRound } });
      if (lesions.length) {
        await tx.lesion.createMany({
          data: lesions.map((lesion) => ({
            idLesao: this.makeId('LES'),
            idPaciente,
            idRound,
            localLesao: this.stringOrNull(lesion.localLesao),
            estadiamento: this.stringOrNull(lesion.estadiamento),
            acompanhamento: this.stringOrNull(lesion.acompanhamento),
            dataExclusao: this.dateOrNull(lesion.dataExclusao),
            statusLesao: lesion.dataExclusao ? 'Resolvida' : String(lesion.statusLesao || 'Ativa'),
          })),
        });
      }

      await tx.risk.deleteMany({ where: { idRound } });
      await tx.risk.create({
        data: {
          idRisco: this.makeId('RSK'),
          idPaciente,
          idRound,
          riscoTEV: this.flag(riscos.riscoTEV),
          riscoInfeccao: this.flag(riscos.riscoInfeccao),
          riscoSangramento: this.flag(riscos.riscoSangramento),
          riscoLPP: this.flag(riscos.riscoLPP),
          riscoNutricional: this.flag(riscos.riscoNutricional),
          riscoDelirium: this.flag(riscos.riscoDelirium),
          riscoBroncoaspiracao: this.flag(riscos.riscoBroncoaspiracao),
          riscoQueda: this.flag(riscos.riscoQueda),
          profilaxiaTEV: this.flag(riscos.profilaxiaTEV),
          profilaxiaLAMG: this.flag(riscos.profilaxiaLAMG),
          outrosRiscos: this.stringOrNull(riscos.outrosRiscos),
        },
      });
    });

    await this.audit('Salvamento round', 'Round', idRound, String(data.usuarioSalvamento || 'Equipe do round'));
    await this.syncAlertsForRound(idRound);
    return this.roundPayload(idPaciente, idRound);
  }

  async dashboard(filters: AnyRow) {
    const today = this.startOfDay(new Date());
    const start = this.startOfDay(this.dateOrNull(filters.inicio) ?? new Date(today.getFullYear(), today.getMonth(), 1));
    const requestedEnd = this.startOfDay(this.dateOrNull(filters.fim) ?? today);
    const end = requestedEnd > today ? today : requestedEnd;
    const periodDays = this.dateRange(start, end);
    const selectedPost = String(filters.posto || filters.unidade || '').trim();

    const allPatients = await this.prisma.patient.findMany();
    const patients = selectedPost
      ? allPatients.filter((patient) => this.patientCarePost(patient) === selectedPost)
      : allPatients;
    const patientIds = patients.map((patient) => patient.idPaciente);
    const patientScope = patientIds.length ? { in: patientIds } : { in: ['__none__'] };
    const eligiblePatientDays = this.patientDays(patients, periodDays);
    const totalPatientDays = eligiblePatientDays.length;
    const patientDaySet = new Set(eligiblePatientDays.map((item) => item.key));
    const rounds = await this.prisma.round.findMany({
      where: { idPaciente: patientScope, dataRound: { gte: this.isoDate(start), lte: this.isoDate(end) } },
      include: { patient: true, goals: true, devices: true, risks: true, alerts: true, assistance: true },
    });
    const finalizedRounds = rounds.filter((r) => r.statusRound === RoundStatus.Finalizado && patientDaySet.has(`${r.idPaciente}|${r.dataRound}`));

    const goals = rounds.flatMap((r) => r.goals);
    const closedGoals = goals.filter((g) => {
      const deadline = this.dayOrNull(g.prazo);
      return deadline && deadline >= start && deadline <= end && deadline <= today;
    });
    const completedGoals = closedGoals.filter((g) => this.normalizeText(g.status).startsWith('concluid'));

    const allDevices = await this.prisma.device.findMany({
      where: { idPaciente: patientScope, dataInsercao: { lte: end }, OR: [{ dataRetirada: null }, { dataRetirada: { gte: start } }] },
      include: { patient: true },
    });
    const deviceTypes = ['AVP', 'PVC', 'SNE', 'CVC', 'SVD', 'SNG', 'Dreno', 'PAI', 'CDL', 'TOT', 'TQT'];
    const dispositivos = Object.fromEntries(deviceTypes.map((type) => {
      const days = this.devicePatientDaySet(allDevices, type, periodDays);
      return [type, this.indicator(`Taxa de utilização de ${type}`, days.size, totalPatientDays, [...days].map((key) => this.detailFromPatientDay(key, patients)), this.trend(periodDays, (day) => {
        const date = this.isoDate(day);
        return { numerador: [...days].filter((key) => key.endsWith(`|${date}`)).length, denominador: eligiblePatientDays.filter((item) => item.date === date).length };
      }))];
    }));

    const discharged = patients.filter((p) => {
      const out = this.dayOrNull(p.dataDesfecho);
      return out && out >= start && out <= end && ['alta', 'obito', 'transferencia interna', 'transferencia externa'].includes(this.normalizeText(p.desfecho));
    });
    const vmEnded = patients.filter((p) => { const vmEnd = this.dayOrNull(p.dataFimVM); return vmEnd && vmEnd >= start && vmEnd <= end; });
    const tevEvaluations = rounds.flatMap((round) => round.risks.map((risk) => ({ risk, round }))).filter(({ risk }) => risk.riscoTEV === 'Sim' || risk.profilaxiaTEV);
    const tevAdequate = tevEvaluations.filter(({ risk }) => risk.profilaxiaTEV === 'Sim' || Boolean(risk.outrosRiscos && this.normalizeText(risk.outrosRiscos).includes('contraindic')));
    const roundDurations = finalizedRounds.map((round) => ({ round, minutes: this.minutesBetween(round.horarioInicioRound, round.horarioTerminoRound) ?? round.tempoRoundMinutos ?? 0 })).filter((item) => item.minutes > 0);
    const firstStart = this.minDate(finalizedRounds.map((round) => round.horarioInicioRound));
    const lastEnd = this.maxDate(finalizedRounds.map((round) => round.horarioTerminoRound));
    const totalUnitRoundMinutes = firstStart && lastEnd ? Math.max(0, Math.round((lastEnd.getTime() - firstStart.getTime()) / 60000)) : 0;
    const pcvDurations = this.pcvDurationByPatient(rounds, start, end);
    const openAlertRows = await this.prisma.alert.findMany({ where: { idPaciente: patientScope, status: 'Ativo', patient: { statusPaciente: PatientStatus.Ativo } }, select: { idPaciente: true, codigo: true } });
    const openAlerts = new Set(openAlertRows.filter((alert) => this.isSupportedAlertCode(alert.codigo)).map((alert) => `${alert.idPaciente}|${alert.codigo}`)).size;

    return {
      periodo: { inicio: this.isoDate(start), fim: this.isoDate(end), unidade: selectedPost || 'Todos os postos' },
      totalPacientesAtivos: patients.filter((p) => p.statusPaciente === PatientStatus.Ativo).length,
      pacienteDiaElegivel: totalPatientDays,
      indicadores: {
        alertasAbertos: { titulo: 'Alertas abertos', numerador: openAlerts, denominador: patients.length, resultado: openAlerts, unidade: '', tendencia: [] },
        taxaRound: this.indicator('Taxa de realização do round multidisciplinar', finalizedRounds.length, totalPatientDays, finalizedRounds.map((round) => this.roundDetail(round)), this.trend(periodDays, (day) => {
          const date = this.isoDate(day);
          return { numerador: finalizedRounds.filter((round) => round.dataRound === date).length, denominador: eligiblePatientDays.filter((item) => item.date === date).length };
        })),
        metasConcluidas: this.indicator('Percentual de metas concluídas', completedGoals.length, closedGoals.length, closedGoals.map((goal) => ({ paciente: patients.find((p) => p.idPaciente === goal.idPaciente)?.nomePaciente || goal.idPaciente, item: goal.meta, status: goal.status, prazo: goal.prazo })), this.trend(periodDays, (day) => {
          const due = closedGoals.filter((goal) => this.isoDate(this.dayOrNull(goal.prazo) ?? day) === this.isoDate(day));
          return { numerador: due.filter((goal) => this.normalizeText(goal.status).startsWith('concluid')).length, denominador: due.length };
        })),
        dispositivos,
        tempoMedioUnidade: this.averageIndicator('Tempo médio de permanência na unidade', discharged.map((p) => this.daysBetween(p.dataAdmissaoUnidade || p.dataAdmissaoHospitalar, p.dataDesfecho) ?? 0), discharged.map((p) => ({ paciente: p.nomePaciente, leito: p.leito, desfecho: p.desfecho, dataDesfecho: p.dataDesfecho })), this.averageTrend(periodDays, (day) => discharged.filter((p) => this.isoDate(this.dayOrNull(p.dataDesfecho) ?? day) === this.isoDate(day)).map((p) => this.daysBetween(p.dataAdmissaoUnidade || p.dataAdmissaoHospitalar, p.dataDesfecho) ?? 0))),
        tempoMedioVM: this.averageIndicator('Tempo médio de permanência em VM', vmEnded.map((p) => this.daysBetween(p.dataInicioVM, p.dataFimVM) ?? 0), vmEnded.map((p) => ({ paciente: p.nomePaciente, leito: p.leito, dataFimVM: p.dataFimVM })), this.averageTrend(periodDays, (day) => vmEnded.filter((p) => this.isoDate(this.dayOrNull(p.dataFimVM) ?? day) === this.isoDate(day)).map((p) => this.daysBetween(p.dataInicioVM, p.dataFimVM) ?? 0))),
        tempoMedioPCV: this.averageHoursIndicator('Tempo médio do paciente em modo ventilatório PCV', [...pcvDurations.values()].map((item) => item.horas), [...pcvDurations.values()].map((item) => ({ paciente: item.paciente, leito: item.leito, horasPCV: item.horas, data: item.data })), this.averageTrend(periodDays, (day) => this.pcvDurationHoursOnDay(rounds, day, start))),
        profilaxiaTEV: this.indicator('Percentual de pacientes com profilaxia de TEV', tevAdequate.length, tevEvaluations.length, tevEvaluations.map(({ risk, round }) => ({ paciente: round.patient.nomePaciente, leito: round.patient.leito, classificacao: this.tevClassification(risk), justificativa: risk.outrosRiscos })), this.trend(periodDays, (day) => {
          const date = this.isoDate(day);
          const evaluations = tevEvaluations.filter(({ round }) => round.dataRound === date);
          return { numerador: evaluations.filter(({ risk }) => this.tevClassification(risk) === 'Adequada' || this.tevClassification(risk) === 'Contraindicada com justificativa').length, denominador: evaluations.length };
        })),
        tempoRound: { titulo: 'Tempo de realização do round multidisciplinar', numerador: roundDurations.reduce((sum, item) => sum + item.minutes, 0), denominador: roundDurations.length, resultado: this.avg(roundDurations.map((item) => item.minutes)), unidade: 'min', tempoTotalUnidadeMinutos: totalUnitRoundMinutes, detalhes: roundDurations.map(({ round, minutes }) => ({ ...this.roundDetail(round), tempoMinutos: minutes })), tendencia: this.averageTrend(periodDays, (day) => roundDurations.filter(({ round }) => round.dataRound === this.isoDate(day)).map((item) => item.minutes)) },
      },
      gruposAlertas: this.groupAlerts(rounds.flatMap((r) => r.alerts)),
      participacaoEquipe: this.groupTeams(rounds),
      justificativasSedacao: [],
      tempoPCV: [],
    };
  }

  async deviceControl(filters: AnyRow) {
    const today = this.startOfDay(new Date());
    const start = this.startOfDay(this.dateOrNull(filters.inicio) ?? new Date(today.getFullYear(), today.getMonth(), 1));
    const requestedEnd = this.startOfDay(this.dateOrNull(filters.fim) ?? today);
    const end = requestedEnd > today ? today : requestedEnd;
    const periodDays = this.dateRange(start, end);
    const selectedPost = String(filters.posto || filters.unidade || '').trim();

    const allPatients = await this.prisma.patient.findMany();
    const patients = selectedPost
      ? allPatients.filter((patient) => this.patientCarePost(patient) === selectedPost)
      : allPatients;
    const patientIds = patients.map((patient) => patient.idPaciente);
    const patientScope = filters.idPaciente
      ? String(filters.idPaciente)
      : patientIds.length ? { in: patientIds } : { in: ['__none__'] };
    const eligiblePatientDays = this.patientDays(patients, periodDays);
    const totalPatientDays = eligiblePatientDays.length;
    const devices = await this.prisma.device.findMany({
      where: {
        idPaciente: patientScope,
        OR: [
          { dataInsercao: null },
          { dataInsercao: { lte: end }, OR: [{ dataRetirada: null }, { dataRetirada: { gte: start } }] },
        ],
      },
      include: { patient: true, round: true },
      orderBy: [{ statusDispositivo: 'asc' }, { dataInsercao: 'asc' }],
    });
    const activeDevices = devices.filter((device) => device.statusDispositivo !== 'Retirado' && !device.dataRetirada);
    const activeDevicesOnEnd = devices.filter((device) => {
      if (device.statusDispositivo === 'Retirado') return false;
      const inserted = this.dayOrNull(device.dataInsercao);
      const removed = this.dayOrNull(device.dataRetirada);
      return (!inserted || inserted <= end) && (!removed || removed > end);
    });
    const activePatientDeviceIdsOnEnd = new Set(activeDevicesOnEnd.map((device) => device.idPaciente));
    const deviceTypes = ['AVP', 'PVC', 'SNE', 'CVC', 'SVD', 'SNG', 'Dreno', 'PAI', 'CDL', 'TOT', 'TQT'];
    const indicadores = Object.fromEntries(deviceTypes.map((type) => {
      const days = this.devicePatientDaySet(devices, type, periodDays);
      const byType = devices.filter((device) => this.deviceTypeMatches(device.tipoDispositivo, type));
      return [type, {
        ...this.indicator(`Taxa de utilização de ${type}`, days.size, totalPatientDays, [...days].map((key) => this.detailFromPatientDay(key, patients)), this.trend(periodDays, (day) => {
          const date = this.isoDate(day);
          return { numerador: [...days].filter((key) => key.endsWith(`|${date}`)).length, denominador: eligiblePatientDays.filter((item) => item.date === date).length };
        })),
        tempoMedioPermanenciaDias: this.avg(byType.map((device) => this.daysBetween(device.dataInsercao, device.dataRetirada) ?? 0)),
        ativos: byType.filter((device) => device.statusDispositivo !== 'Retirado' && !device.dataRetirada).length,
        semReavaliacao: byType.filter((device) => this.deviceAlerts(device).some((alert) => alert.codigo === 'sem_reavaliacao_24h')).length,
        elegiveisRetirada: byType.filter((device) => device.podeRetirarHoje === 'Sim').length,
      }];
    }));

    return {
      periodo: { inicio: this.isoDate(start), fim: this.isoDate(end), unidade: selectedPost || 'Todos os postos' },
      totalPacienteDia: totalPatientDays,
      pacientes: patients.map((patient) => ({
        idPaciente: patient.idPaciente,
        nomePaciente: patient.nomePaciente,
        leito: patient.leito,
        unidade: patient.unidade,
        postoAssistencial: this.patientCarePost(patient),
      })),
      dispositivos: devices.map((device) => ({
        ...device,
        tempoDispositivoDias: this.daysBetween(device.dataInsercao, device.dataRetirada),
        alertas: this.deviceAlerts(device),
      })),
      resumo: {
        total: devices.length,
        insercoesNoDia: devices.filter((device) => this.isoDate(this.dayOrNull(device.dataInsercao) ?? new Date(0)) === this.isoDate(end)).length,
        totalPacienteDia: totalPatientDays,
        pacientesComDispositivoNoDia: activePatientDeviceIdsOnEnd.size,
        relacaoPacienteDispositivo: activeDevicesOnEnd.length && activePatientDeviceIdsOnEnd.size ? Number((activeDevicesOnEnd.length / activePatientDeviceIdsOnEnd.size).toFixed(2)) : 0,
        ativos: activeDevices.length,
        semReavaliacao: activeDevices.filter((device) => this.deviceAlerts(device).some((alert) => alert.codigo === 'sem_reavaliacao_24h')).length,
        elegiveisRetirada: activeDevices.filter((device) => device.podeRetirarHoje === 'Sim').length,
      },
      indicadores,
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
        lesions: true,
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
      lesoes: round.lesions,
      alertas: round.alerts,
    }));
  }

  async dailyReport(filters: AnyRow) {
    const data = filters.data || this.today();
    const selectedPost = String(filters.posto || filters.unidade || '').trim();
    let rounds = await this.history({ inicio: data, fim: data });
    if (selectedPost) {
      rounds = rounds.filter((entry) => this.patientCarePost(entry.paciente || {}) === selectedPost);
    }
    return {
      data,
      posto: selectedPost || 'Todos os postos',
      rounds,
      alertas: rounds.flatMap((entry) => entry.alertas || []),
    };
  }

  private async roundPayload(idPaciente: string, idRound: string) {
    const [paciente, round, previousRound] = await Promise.all([
      this.prisma.patient.findUnique({ where: { idPaciente } }),
      this.prisma.round.findUnique({
        where: { idRound },
        include: { goals: true, bundle: true, infection: true, assistance: true, risks: true, devices: true, lesions: true },
      }),
      this.prisma.round.findFirst({
        where: { idPaciente, idRound: { not: idRound }, statusRound: RoundStatus.Finalizado },
        orderBy: { dataRegistro: 'desc' },
        include: { goals: true, bundle: true, infection: true, assistance: true, risks: true, devices: true, lesions: true },
      }),
    ]);
    const [currentSave, previousSave] = await Promise.all([
      this.prisma.auditLog.findFirst({
        where: { entidade: 'Round', idEntidade: idRound, acao: 'Salvamento round' },
        orderBy: { dataHora: 'desc' },
      }),
      previousRound ? this.prisma.auditLog.findFirst({
        where: { entidade: 'Round', idEntidade: previousRound.idRound, acao: 'Salvamento round' },
        orderBy: { dataHora: 'desc' },
      }) : null,
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
      lesoes: round?.lesions ?? [],
      prefill: previousRound ? {
        round: {
          problemaAtivoPrincipal: previousRound.problemaAtivoPrincipal ?? '',
          barreirasAlta: previousRound.barreirasAlta ?? '',
          evolucaoPaciente: previousRound.evolucaoPaciente ?? '',
        },
        bundle: previousRound.bundle[0] ?? {},
        infeccao: previousRound.infection ?? [],
        assistencia: previousRound.assistance[0] ?? {},
        riscos: previousRound.risks[0] ?? {},
        dispositivos: previousRound.devices?.filter((d) => d.statusDispositivo === 'Ativo') ?? [],
        lesoes: previousRound.lesions?.filter((l) => l.statusLesao === 'Ativa') ?? [],
      } : {},
      metadata: {
        prefillDisponivel: Boolean(previousRound),
        roundMemoria: previousRound?.idRound ?? null,
        ultimoSalvamentoAtual: currentSave ? { dataHora: currentSave.dataHora, usuario: currentSave.detalhes } : null,
        ultimoSalvamentoAnterior: previousSave ? { dataHora: previousSave.dataHora, usuario: previousSave.detalhes } : null,
      },
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

  async updateAlert(idAlerta: string, data: AnyRow) {
    return this.prisma.alert.update({
      where: { idAlerta },
      data: {
        responsavel: this.stringOrNull(data.responsavel),
        prazo: this.dateOrNull(data.prazo),
        status: this.stringOrNull(data.status) || undefined,
        historico: this.stringOrNull(data.historico),
        dataAtualizacao: new Date(),
        dataResolucao: data.status === 'Resolvido' ? new Date() : undefined,
      },
    });
  }

  private async syncAlertsForRound(idRound: string) {
    const round = await this.prisma.round.findUnique({
      where: { idRound },
      include: { patient: true, goals: true, bundle: true, infection: true, assistance: true, risks: true, devices: true },
    });
    if (!round) return;
    const period = round.dataRound || this.today();
    const candidates = this.buildAlertCandidates(round as AnyRow, period);
    const activeCodes = new Set(candidates.map((alert) => alert.codigo));
    const openAlerts = await this.prisma.alert.findMany({
      where: { idPaciente: round.idPaciente, status: 'Ativo' },
    });

    for (const alert of candidates) {
      const existing = openAlerts.find((item) => item.codigo === alert.codigo && item.periodo === period);
      const payload = {
        idRound,
        tipoAlerta: alert.tipoAlerta,
        problema: alert.problema,
        mensagem: alert.mensagem,
        motivo: alert.motivo,
        condicao: alert.condicao,
        gravidade: alert.gravidade,
        acaoEsperada: alert.acaoEsperada,
        origem: alert.origem,
        periodo: period,
        resolucaoAutomatica: 'Sim',
        dataAtualizacao: new Date(),
        historico: existing?.historico || `Gerado automaticamente em ${new Date().toISOString()}`,
      };
      if (existing) {
        await this.prisma.alert.update({ where: { idAlerta: existing.idAlerta }, data: payload });
      } else {
        await this.prisma.alert.create({
          data: {
            idAlerta: this.makeId('ALT'),
            idPaciente: round.idPaciente,
            codigo: alert.codigo,
            status: 'Ativo',
            ...payload,
          },
        });
      }
    }

    for (const alert of openAlerts.filter((item) => item.resolucaoAutomatica !== 'Não' && (!item.codigo || !this.isSupportedAlertCode(item.codigo) || !activeCodes.has(String(item.codigo))))) {
      await this.prisma.alert.update({
        where: { idAlerta: alert.idAlerta },
        data: {
          status: 'Resolvido',
          dataResolucao: new Date(),
          dataAtualizacao: new Date(),
          historico: [alert.historico, `Resolvido automaticamente em ${new Date().toISOString()}: condição não está mais ativa.`].filter(Boolean).join('\n'),
        },
      });
    }
  }

  private buildAlertCandidates(round: AnyRow, period: string) {
    const alerts: AnyRow[] = [];
    const add = (alert: AnyRow) => alerts.push({ origem: 'Sistema', periodo: period, ...alert });
    const assistance = round.assistance?.[0] || {};
    const bundle = round.bundle?.[0] || {};
    const risk = round.risks?.[0] || {};
    const infections = round.infection || [];
    const goals = round.goals || [];
    const devices = round.devices || [];

    for (const infection of infections) {
      const antibioticDays = this.daysBetween(infection.dataInicioAntibiotico) ?? infection.tempoAntibioticoDias ?? 0;
      if ((assistance.antibioticoEmUso === 'Sim' || infection.nomeAntibiotico) && antibioticDays > 7) {
        add(this.alertCandidate('antibiotico_maior_7d', 'Antibiótico > 7 dias', 'Antibiótico superior a 7 dias.', `tempoAntibioticoDias=${antibioticDays}`, 'Alta Gravidade', 'Reavaliar antibioticoterapia.'));
      }
    }

    if (bundle.agitacaoPsicomotora === 'Sim') add(this.alertCandidate('agitacao_psicomotora', 'Agitação psicomotora', 'Paciente com agitação psicomotora.', 'agitacaoPsicomotora=Sim', 'Alta Gravidade', 'Reavaliar segurança e conduta.'));
    if (bundle.pacienteDelirium === 'Sim') add(this.alertCandidate('delirium', 'Delirium', 'Paciente com delirium.', 'pacienteDelirium=Sim', 'Alta Gravidade', 'Reavaliar delirium e fatores precipitantes.'));
    if (round.evolucaoPaciente === 'Deteriorou') add(this.alertCandidate('deterioracao_clinica', 'Deterioração clínica', 'Paciente com deterioração clínica.', 'evolucaoPaciente=Deteriorou', 'Alta Gravidade', 'Reavaliar plano terapêutico.'));
    if (assistance.aumentoSuporteVentilatorio === 'Sim' || assistance.statusSuporteVentilatorio === 'Aumentou') add(this.alertCandidate('aumento_suporte_ventilatorio', 'Aumento do suporte ventilatório', 'Aumento do suporte ventilatório.', 'statusSuporteVentilatorio=Aumentou', 'Alta Gravidade', 'Reavaliar causa da piora respiratória.'));

    for (const goal of goals) {
      const deadline = this.dayOrNull(goal.prazo);
      if (deadline && deadline < this.startOfDay(new Date()) && !['concluida', 'concluída', 'suspensa', 'nao aplicavel', 'não aplicável'].includes(this.normalizeText(goal.status))) {
        add(this.alertCandidate(`meta_vencida_${goal.idMeta}`, 'Meta vencida', 'Meta vencida.', `prazo=${goal.prazo}; status=${goal.status}`, 'Moderado', 'Atualizar status ou reprogramar.'));
      }
    }
    if (!goals.some((goal: AnyRow) => goal.meta)) add(this.alertCandidate('sem_meta_diaria', 'Sem meta diária', 'Paciente sem meta diária.', 'metas=0', 'Moderado', 'Definir meta diária.'));

    const stay = this.daysBetween(round.patient?.dataAdmissaoUnidade || round.patient?.dataAdmissaoHospitalar) ?? 0;
    if (stay > 3 && !round.patient?.previsaoAlta) add(this.alertCandidate('sem_previsao_alta', 'Sem previsão de alta', 'Paciente sem previsão de alta.', `permanencia=${stay}d; previsaoAlta=vazia`, 'Moderado', 'Discutir previsão de alta.'));
    if (risk.riscoTEV === 'Sim' && risk.profilaxiaTEV !== 'Sim' && !risk.outrosRiscos) add(this.alertCandidate('tev_sem_profilaxia', 'TEV sem profilaxia', 'Risco de TEV sem profilaxia.', 'riscoTEV=Sim; profilaxiaTEV!=Sim', 'Alta Gravidade', 'Registrar profilaxia ou justificativa.'));

    const npoDays = Number(assistance.npoDias ?? this.daysBetween(assistance.npoDataInicio) ?? 0);
    if (npoDays > 3) add(this.alertCandidate('dieta_zero_maior_3d', 'Dieta zero > 3 dias', 'Paciente em dieta zero acima de 3 dias.', `npoDias=${npoDays}`, 'Moderado', 'Reavaliar plano nutricional.'));

    const enteralVetDays = assistance.tneVetPleno === 'Não' ? this.daysBetween(assistance.tneDataInicio) ?? 0 : 0;
    const parenteralVetDays = assistance.tnpVetPleno === 'Não' ? this.daysBetween(assistance.tnpDataInicio) ?? 0 : 0;
    if (enteralVetDays >= 3 || parenteralVetDays >= 3) add(this.alertCandidate('vet_nao_pleno_3d', 'VET não pleno há 3 dias', 'Paciente com VET não pleno por 3 dias.', `tneVetPleno=${assistance.tneVetPleno}; tnpVetPleno=${assistance.tnpVetPleno}`, 'Moderado', 'Reavaliar adequação nutricional.'));

    const pcvDays = Number(assistance.diasModoVentilatorio ?? this.daysBetween(assistance.dataInicioModoVentilatorio) ?? 0);
    if (assistance.modoVentilatorioAtual === 'PCV' && pcvDays > 2) add(this.alertCandidate('pcv_maior_2d', 'PCV > 2 dias', 'Paciente em PCV acima de 2 dias.', `modoVentilatorioAtual=PCV; dias=${pcvDays}`, 'Moderado', 'Reavaliar modo ventilatório.'));

    for (const device of devices.filter((item: AnyRow) => item.statusDispositivo !== 'Retirado' && !item.dataRetirada)) {
      const type = this.normalizeText(device.tipoDispositivo).toUpperCase();
      const days = this.daysBetween(device.dataInsercao) ?? device.tempoDispositivoDias ?? 0;
      if (!device.justificativaPermanencia) add(this.alertCandidate(`dispositivo_sem_justificativa_${device.idDispositivo}`, 'Dispositivo sem justificativa', `${device.tipoDispositivo || 'Dispositivo'} sem justificativa técnica.`, `tipo=${device.tipoDispositivo}`, 'Moderado', 'Registrar justificativa técnica.'));
      if (device.podeRetirarHoje === 'Sim') add(this.alertCandidate(`dispositivo_retirada_pendente_${device.idDispositivo}`, 'Pode retirar hoje', `${device.tipoDispositivo || 'Dispositivo'} marcado para retirada, mas ativo.`, 'podeRetirarHoje=Sim; status=Ativo', 'Alta Gravidade', 'Confirmar retirada ou justificar manutenção.'));
      const limit = this.deviceLongStayLimit(device.tipoDispositivo);
      if (days > limit) add(this.alertCandidate(`dispositivo_tempo_prolongado_${device.idDispositivo}`, 'Dispositivo com tempo prolongado', `${device.tipoDispositivo || 'Dispositivo'} com tempo prolongado.`, `dias=${days}; limite=${limit}`, 'Moderado', 'Gatilho para reavaliação.'));
    }

    return alerts;
  }

  private alertCandidate(codigo: string, tipoAlerta: string, mensagem: string, condicao: string, gravidade: string, acaoEsperada: string) {
    return {
      codigo,
      tipoAlerta,
      problema: tipoAlerta,
      mensagem,
      motivo: condicao,
      condicao,
      gravidade: this.normalizeAlertSeverity(gravidade),
      acaoEsperada,
    };
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

  private patientSummary(patient: AnyRow): AnyRow {
    const latest = patient.rounds?.[0];
    const latestGoals = latest?.goals ?? [];
    const previousRound = patient.rounds?.find((round: AnyRow) => round.idRound !== latest?.idRound && round.statusRound === RoundStatus.Finalizado) ?? patient.rounds?.[1];
    const previousPendingGoals = (previousRound?.goals ?? []).filter((goal: AnyRow) => ['Pendente', 'Em andamento', 'Atrasado'].includes(String(goal.status || '')));
    const risks = latest?.risks?.[0];
    const devices = latest?.devices?.filter((d: AnyRow) => d.statusDispositivo === 'Ativo') ?? [];
    const alerts = this.uniqueSupportedAlerts(patient.alerts?.filter((a: AnyRow) => a.status === 'Ativo') ?? latest?.alerts?.filter((a: AnyRow) => a.status === 'Ativo') ?? []);
    const alertSeverity = this.highestAlertSeverity(alerts);

    return {
      ...patient,
      statusRound: latest?.statusRound ?? 'Não iniciado',
      evolucaoPaciente: latest?.evolucaoPaciente ?? 'Estável',
      problemaAtivoPrincipal: latest?.problemaAtivoPrincipal ?? '',
      barreirasAlta: latest?.barreirasAlta ?? '',
      metasResumo: latestGoals.map((m: AnyRow) => [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | ')).join('\n'),
      metasPendentesAnterioresResumo: previousPendingGoals.map((m: AnyRow) => [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | ')).join('\n'),
      metasProximas24hResumo: latestGoals.filter((m: AnyRow) => ['Pendente', 'Em andamento', 'Atrasado'].includes(String(m.status || ''))).map((m: AnyRow) => [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | ')).join('\n'),
      pendenciasResumo: latest?.pendencias ?? '',
      riscosAtivos: this.riskLabels(risks).join(', '),
      alertasAtivos: alerts.map((a: AnyRow) => a.problema || a.tipoAlerta).join(', '),
      alertasAbertos: alerts.length,
      maiorGravidadeAlerta: alertSeverity,
      alertasDetalhes: alerts,
      dispositivosResumo: devices.map((d: AnyRow) => `${d.tipoDispositivo}: ${d.tempoDispositivoDias ?? 0}d`).join(' | '),
    };
  }

  private riskLabels(r?: AnyRow | null) {
    if (!r) return [];
    return [
      ['riscoTEV', 'TEV'],
      ['riscoInfeccao', 'Infecção'],
      ['riscoSangramento', 'Sangramento'],
      ['riscoLPP', 'LPP'],
      ['riscoNutricional', 'Nutricional'],
      ['riscoDelirium', 'Delirium'],
      ['riscoBroncoaspiracao', 'Broncoaspiração'],
      ['riscoQueda', 'Queda'],
    ].filter(([key]) => r[key] === 'Sim').map(([, label]) => label);
  }

  private dateOrNull(value: unknown) {
    if (!value) return null;
    const text = String(value);
    const isoDate = text.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [year, month, day] = isoDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private numberOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }

  private stringOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    return String(value);
  }

  private row(value: unknown): AnyRow {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRow : {};
  }

  private arrayRows(value: unknown): AnyRow[] {
    return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as AnyRow[] : [];
  }

  private joinArray(value: unknown) {
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).join(', ');
    return this.stringOrNull(value);
  }

  private flag(value: unknown) {
    return value ? 'Sim' : 'Não';
  }

  private endDateFromDayZero(start: unknown, plannedDays: unknown) {
    const date = this.dateOrNull(start);
    const days = this.numberOrNull(plannedDays);
    if (!date || !days) return null;
    const end = new Date(date);
    end.setDate(end.getDate() + Math.max(days - 1, 0));
    return end;
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

  private startOfDay(value: unknown) {
    const date = this.dateOrNull(value) ?? new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private dayOrNull(value: unknown) {
    const date = this.dateOrNull(value);
    if (!date) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private isoDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private dateRange(start: Date, end: Date) {
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  private patientDays(patients: AnyRow[], days: Date[]) {
    return patients.flatMap((patient) => {
      const admission = this.dayOrNull(patient.dataAdmissaoUnidade || patient.dataAdmissaoHospitalar) ?? days[0];
      const discharge = this.dayOrNull(patient.dataDesfecho);
      return days
        .filter((day) => day >= admission && (!discharge || day <= discharge))
        .map((day) => {
          const date = this.isoDate(day);
          return {
            idPaciente: patient.idPaciente,
            date,
            key: `${patient.idPaciente}|${date}`,
            paciente: patient.nomePaciente,
            leito: patient.leito,
          };
        });
    });
  }

  private patientCarePost(patient: AnyRow) {
    const posts = ['PA 30', 'PA 36', 'PA 41', 'PA 42', 'PA 44'];
    const unit = String(patient.unidade || '').trim().toUpperCase();
    const explicit = posts.find((post) => unit === post || unit.includes(post));
    if (explicit) return explicit;
    const bedPrefix = String(patient.leito || '').replace(/\D/g, '').slice(0, 2);
    return posts.find((post) => post.endsWith(bedPrefix)) || '';
  }

  private devicePatientDaySet(devices: AnyRow[], type: string, days: Date[]) {
    const aliases: Record<string, string[]> = {
      AVP: ['AVP', 'PVP'],
      PVC: ['PVC'],
      Dreno: ['Dreno', 'Dren'],
    };
    const accepted = new Set([type, ...(aliases[type] ?? [])].map((item) => this.normalizeText(item)));
    const keys = new Set<string>();
    for (const device of devices) {
      if (!accepted.has(this.normalizeText(device.tipoDispositivo))) continue;
      const start = this.dayOrNull(device.dataInsercao) ?? days[0];
      const end = this.dayOrNull(device.dataRetirada) ?? days[days.length - 1];
      for (const day of days) {
        if (day >= start && day <= end) keys.add(`${device.idPaciente}|${this.isoDate(day)}`);
      }
    }
    return keys;
  }

  private deviceTypeMatches(value: unknown, type: string) {
    const aliases: Record<string, string[]> = {
      AVP: ['AVP', 'PVP'],
      PVC: ['PVC', 'PICC'],
      Dreno: ['Dreno', 'Dren'],
    };
    const accepted = new Set([type, ...(aliases[type] ?? [])].map((item) => this.normalizeText(item)));
    return accepted.has(this.normalizeText(value));
  }

  private deviceAlerts(device: AnyRow) {
    if (device.statusDispositivo === 'Retirado' || device.dataRetirada) return [];
    const alerts: Array<{ codigo: string; mensagem: string; gravidade: string }> = [];
    const today = this.startOfDay(new Date());
    const lastReview = this.dayOrNull(device.dataUltimaReavaliacao);
    const nextReview = this.dayOrNull(device.dataProximaReavaliacao);
    const days = this.daysBetween(device.dataInsercao) ?? 0;
    const type = this.normalizeText(device.tipoDispositivo);

    if (!device.dataInsercao) alerts.push({ codigo: 'sem_data_insercao', mensagem: 'Dispositivo ativo sem data de inserção.', gravidade: 'Alta' });
    if (!device.justificativaPermanencia) alerts.push({ codigo: 'sem_justificativa', mensagem: 'Dispositivo ativo sem justificativa técnica de permanência.', gravidade: 'Alta' });
    if (!lastReview || today.getTime() - lastReview.getTime() > 86400000) alerts.push({ codigo: 'sem_reavaliacao_24h', mensagem: 'Dispositivo sem reavaliação nas últimas 24 horas.', gravidade: 'Alta' });
    if (device.podeRetirarHoje === 'Sim') alerts.push({ codigo: 'retirada_pendente', mensagem: 'Dispositivo elegível para retirada hoje e ainda ativo.', gravidade: 'Alta' });
    if (device.dispositivoAindaNecessario === 'Não' && !this.normalizeText(device.conduta).includes('retirar')) alerts.push({ codigo: 'sem_plano_retirada', mensagem: 'Dispositivo marcado como não necessário sem plano de retirada.', gravidade: 'Alta' });
    if (!device.responsavelReavaliacao) alerts.push({ codigo: 'sem_responsavel', mensagem: 'Dispositivo ativo sem responsável pela reavaliação.', gravidade: 'Média' });
    if (nextReview && nextReview < today) alerts.push({ codigo: 'proxima_reavaliacao_vencida', mensagem: 'Data da próxima reavaliação vencida.', gravidade: 'Alta' });
    if (days >= this.deviceLongStayLimit(device.tipoDispositivo)) alerts.push({ codigo: 'tempo_prolongado', mensagem: 'Tempo de permanência prolongado: reavaliar necessidade clínica.', gravidade: 'Média' });
    if (type.includes('dreno') && !device.justificativaPermanencia) alerts.push({ codigo: 'dreno_sem_indicacao', mensagem: 'Dreno ativo sem indicação ou justificativa atualizada.', gravidade: 'Alta' });
    if (type === 'tot' && !device.justificativaPermanencia) alerts.push({ codigo: 'tot_sem_reavaliacao_desmame', mensagem: 'TOT mantido sem avaliação atualizada de despertar ou desmame ventilatório.', gravidade: 'Alta' });
    if (type === 'tqt' && !device.justificativaPermanencia) alerts.push({ codigo: 'tqt_sem_reavaliacao_desmame', mensagem: 'TQT mantida sem reavaliação de desmame, oclusão ou decanulação.', gravidade: 'Alta' });
    if (['cvc', 'pai', 'cdl', 'svd'].includes(type) && !device.justificativaPermanencia) alerts.push({ codigo: 'invasivo_sem_justificativa', mensagem: 'CVC, PAI, CDL ou SVD mantido sem justificativa clínica atualizada.', gravidade: 'Alta' });
    return alerts;
  }

  private deviceLongStayLimit(type: unknown) {
    const normalized = this.normalizeText(type).toUpperCase();
    const limits: Record<string, number> = { TOT: 7, CVC: 7, SVD: 7, PAI: 5, TQT: 30 };
    return limits[normalized] ?? Number.POSITIVE_INFINITY;
  }

  private indicator(titulo: string, numerador: number, denominador: number, detalhes: AnyRow[] = [], tendencia: AnyRow[] = []) {
    return { titulo, numerador, denominador, resultado: this.pct(numerador, denominador), unidade: '%', detalhes, tendencia };
  }

  private averageIndicator(titulo: string, values: number[], detalhes: AnyRow[] = [], tendencia: AnyRow[] = []) {
    const clean = values.filter((value) => value > 0);
    const numerador = clean.reduce((sum, value) => sum + value, 0);
    const denominador = clean.length;
    return { titulo, numerador, denominador, resultado: denominador ? Math.round(numerador / denominador) : 0, unidade: 'dias', detalhes, tendencia };
  }

  private averageHoursIndicator(titulo: string, values: number[], detalhes: AnyRow[] = [], tendencia: AnyRow[] = []) {
    const clean = values.filter((value) => value > 0);
    const numerador = clean.reduce((sum, value) => sum + value, 0);
    const denominador = clean.length;
    return { titulo, numerador, denominador, resultado: denominador ? Math.round(numerador / denominador) : 0, unidade: 'h', detalhes, tendencia };
  }

  private pcvDurationByPatient(rounds: AnyRow[], periodStart: Date, periodEnd: Date) {
    const byPatient = new Map<string, AnyRow>();
    for (const round of rounds) {
      const assistance = round.assistance?.[0] || {};
      if (this.normalizeText(assistance.modoVentilatorioAtual) !== 'pcv') continue;
      const hours = this.pcvDurationHours(assistance, round.dataRound, periodStart, periodEnd);
      if (!hours) continue;
      const current = byPatient.get(round.idPaciente);
      if (!current || hours > current.horas) {
        byPatient.set(round.idPaciente, {
          horas: hours,
          paciente: round.patient?.nomePaciente || round.idPaciente,
          leito: round.patient?.leito || '',
          data: round.dataRound,
        });
      }
    }
    return byPatient;
  }

  private pcvDurationHoursOnDay(rounds: AnyRow[], day: Date, periodStart: Date) {
    const date = this.isoDate(day);
    const byPatient = new Map<string, number>();
    for (const round of rounds.filter((item) => item.dataRound === date)) {
      const assistance = round.assistance?.[0] || {};
      if (this.normalizeText(assistance.modoVentilatorioAtual) !== 'pcv') continue;
      const hours = this.pcvDurationHours(assistance, round.dataRound, periodStart, day);
      if (hours) byPatient.set(round.idPaciente, Math.max(byPatient.get(round.idPaciente) || 0, hours));
    }
    return [...byPatient.values()];
  }

  private pcvDurationHours(assistance: AnyRow, roundDate: unknown, periodStart: Date, periodEnd: Date) {
    const roundDay = this.dayOrNull(roundDate);
    if (!roundDay) return 0;
    const cappedEnd = roundDay < periodEnd ? roundDay : periodEnd;
    const cappedStartFromPeriod = periodStart > cappedEnd ? cappedEnd : periodStart;
    const explicitDays = Number(assistance.diasModoVentilatorio || 0);
    const maxPeriodHours = (Math.max(0, Math.floor((cappedEnd.getTime() - cappedStartFromPeriod.getTime()) / 86400000)) + 1) * 24;
    if (explicitDays > 0) return Math.min(explicitDays * 24, maxPeriodHours);
    const start = this.dayOrNull(assistance.dataInicioModoVentilatorio);
    if (!start) return 0;
    const cappedStart = start > periodStart ? start : periodStart;
    if (cappedStart > cappedEnd) return 0;
    return (Math.max(0, Math.floor((cappedEnd.getTime() - cappedStart.getTime()) / 86400000)) + 1) * 24;
  }

  private trend(days: Date[], calc: (day: Date) => { numerador: number; denominador: number }) {
    return days.map((day) => {
      const item = calc(day);
      return { data: this.isoDate(day), ...item, resultado: this.pct(item.numerador, item.denominador) };
    });
  }

  private averageTrend(days: Date[], calc: (day: Date) => number[]) {
    return days.map((day) => {
      const values = calc(day).filter((value) => value > 0);
      const numerador = values.reduce((sum, value) => sum + value, 0);
      const denominador = values.length;
      return { data: this.isoDate(day), numerador, denominador, resultado: denominador ? Math.round(numerador / denominador) : 0 };
    });
  }

  private detailFromPatientDay(key: string, patients: AnyRow[]) {
    const [idPaciente, data] = key.split('|');
    const patient = patients.find((item) => item.idPaciente === idPaciente);
    return { paciente: patient?.nomePaciente || idPaciente, leito: patient?.leito || '', data };
  }

  private roundDetail(round: AnyRow) {
    return { paciente: round.patient?.nomePaciente || round.idPaciente, leito: round.patient?.leito || '', data: round.dataRound, status: round.statusRound };
  }

  private minutesBetween(start: unknown, end: unknown) {
    const a = this.dateOrNull(start);
    const b = this.dateOrNull(end);
    if (!a || !b) return null;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  }

  private minDate(values: unknown[]) {
    const dates = values.map((value) => this.dateOrNull(value)).filter((value): value is Date => Boolean(value));
    return dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
  }

  private maxDate(values: unknown[]) {
    const dates = values.map((value) => this.dateOrNull(value)).filter((value): value is Date => Boolean(value));
    return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
  }

  private normalizeText(value: unknown) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private normalizeAlertSeverity(value: unknown) {
    const text = this.normalizeText(value);
    if (text.includes('crit')) return 'Crítico';
    if (text.includes('alta')) return 'Alta Gravidade';
    return 'Moderado';
  }

  private isSupportedAlertCode(code: unknown) {
    const value = String(code || '');
    return [
      'antibiotico_maior_7d',
      'agitacao_psicomotora',
      'delirium',
      'deterioracao_clinica',
      'aumento_suporte_ventilatorio',
      'sem_meta_diaria',
      'sem_previsao_alta',
      'tev_sem_profilaxia',
      'dieta_zero_maior_3d',
      'vet_nao_pleno_3d',
      'pcv_maior_2d',
    ].includes(value)
      || value.startsWith('meta_vencida_')
      || value.startsWith('dispositivo_sem_justificativa_')
      || value.startsWith('dispositivo_retirada_pendente_')
      || value.startsWith('dispositivo_tempo_prolongado_');
  }

  private uniqueSupportedAlerts(alerts: AnyRow[]) {
    const seen = new Set<string>();
    return alerts.filter((alert) => {
      if (!this.isSupportedAlertCode(alert.codigo)) return false;
      const key = `${alert.idPaciente}|${alert.codigo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private highestAlertSeverity(alerts: AnyRow[]) {
    const order: Record<string, number> = { 'Moderado': 1, 'Alta Gravidade': 2, 'Crítico': 3 };
    return alerts.map((alert) => this.normalizeAlertSeverity(alert.gravidade)).sort((a, b) => (order[b] || 0) - (order[a] || 0))[0] || '';
  }

  private deviceActionForAlert(code: string) {
    const actions: Record<string, string> = {
      sem_data_insercao: 'Registrar data de inserção do dispositivo.',
      sem_justificativa: 'Registrar justificativa técnica atualizada e necessidade do dispositivo.',
      sem_reavaliacao_24h: 'Reavaliar necessidade, atualizar justificativa e definir conduta.',
      retirada_pendente: 'Confirmar retirada ou registrar motivo de manutenção com responsável e prazo.',
      sem_plano_retirada: 'Definir plano de retirada ou justificativa de manutenção.',
      sem_responsavel: 'Definir responsável pela reavaliação do dispositivo.',
      proxima_reavaliacao_vencida: 'Atualizar reavaliação e definir novo prazo.',
      tempo_prolongado: 'Reavaliar indicação, justificar permanência e definir próxima reavaliação.',
      dreno_sem_indicacao: 'Atualizar indicação ou justificativa de permanência do dreno.',
      tot_sem_reavaliacao_desmame: 'Registrar avaliação de despertar e progressão do desmame ventilatório.',
      tqt_sem_reavaliacao_desmame: 'Registrar reavaliação de desmame, oclusão ou decanulação.',
      invasivo_sem_justificativa: 'Registrar justificativa clínica atualizada para permanência.',
    };
    return actions[code] || 'Sinalizar, interrogar e solicitar reavaliação pela equipe assistencial.';
  }

  private tevClassification(risk: AnyRow) {
    if (risk.profilaxiaTEV === 'Sim') return 'Adequada';
    if (risk.outrosRiscos && this.normalizeText(risk.outrosRiscos).includes('contraindic')) return 'Contraindicada com justificativa';
    if (risk.riscoTEV === 'Sim') return 'Inadequada';
    return 'Pendente';
  }

  private pct(a: number, b: number) {
    return b ? Math.round((a / b) * 100) : 0;
  }
}
