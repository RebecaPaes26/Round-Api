var APP_READY = false;

var SOCIALHOSP_SHEETS = {
  Usuarios: ['ID_Usuario', 'Usuario', 'Senha', 'Nome', 'Perfil', 'Ativo', 'Criado_Em', 'Atualizado_Em'],
  Pacientes: ['ID_Paciente', 'Nome_Paciente', 'Data_Nascimento', 'Idade', 'Sexo', 'Filiação', 'Municipio_Residencia', 'Unidade', 'Leito', 'Data_Admissao', 'Diagnostico_Clinico', 'Referencia_Familiar', 'Descricao_Genograma', 'Nome_Referencia', 'Grau_Parentesco', 'Telefone', 'Rede_Comunitaria', 'Situacao_Moradia', 'Situacao_Previdenciaria', 'Beneficios_Sociais', 'Descricao_Beneficios', 'Vulnerabilidades', 'Descricao_Vulnerabilidades', 'Grau_Dependencia', 'Data_Inclusao_Social', 'Data_Previsao_Alta', 'Arquivado', 'Data_Arquivamento', 'Data_Desfecho', 'Desfecho', 'Atualizado_Em'],
  Historico_Atendimentos: ['ID_Evento', 'ID_Paciente', 'Nome_Paciente', 'Unidade', 'Leito', 'Data_Atendimento', 'Profissional', 'Tipo_Atendimento', 'Descricao_Tipo_Atendimento', 'Tipo_Caso', 'Descricao_Tipo_Caso', 'Complexidade', 'Metas', 'Prazos', 'Status', 'Condutas', 'Pendencias', 'Observacoes', 'Impressao_Caso', 'Barreira_Alta', 'Descricao_Barreira', 'Data_Identificacao_Barreira', 'Data_Resolucao_Barreira', 'Resultado_Barreira', 'Encaminhamentos', 'Documentacao_Encaminhamento', 'Notificacao_Compulsoria', 'Tipo_Notificacao', 'Articulacao_Familiar', 'Articulacao_Comunitaria', 'Articulacao_Equipamento', 'Equipamento_Envolvido', 'Resultado_Intervencao', 'Desfecho', 'Alertas_Identificados', 'Criado_Em'],
  Monitoramento: ['ID_Alerta', 'ID_Paciente', 'Paciente', 'Unidade', 'Leito', 'Tipo_Alerta', 'Problema', 'Prioridade', 'Criterio', 'Data_Alerta', 'Responsavel', 'Status', 'Criado_Em'],
  Relatorios_Sociais: ['ID_Relatorio', 'Data_Emissao', 'Tipo_Relatorio', 'ID_Paciente', 'Nome_Paciente', 'Profissional_Responsavel', 'Unidade', 'Leito', 'Periodo_Inicial', 'Periodo_Final', 'Texto_Relatorio', 'Status_Relatorio', 'Link_PDF', 'Observacoes', 'Criado_Em', 'Atualizado_Em'],
  Log_Auditoria: ['ID_Log', 'Data_Hora', 'Usuario', 'Perfil', 'Acao', 'Modulo', 'Paciente', 'Registro', 'Valor_Anterior', 'Valor_Novo']
};

var SCHEMAS = {
  Pacientes: ['idPaciente', 'prontuario', 'nomePaciente', 'dataNascimento', 'idade', 'leito', 'unidade', 'motivoInternacao', 'diagnosticoAtual', 'dataAdmissaoHospitalar', 'dataAdmissaoUnidade', 'diasInternacao', 'SAPS', 'dataInicioVM', 'dataFimVM', 'tempoVMDias', 'previsaoAlta', 'statusPaciente', 'desfecho', 'dataDesfecho', 'dataAtualizacao'],
  Rounds: ['idRound', 'idPaciente', 'dataRound', 'equipesPresentes', 'horarioInicioRound', 'horarioTerminoRound', 'tempoRoundMinutos', 'statusRound', 'problemaAtivoPrincipal', 'barreirasAlta', 'condutaDefinida', 'evolucaoPaciente', 'pendencias', 'dataRegistro'],
  Metas: ['idMeta', 'idPaciente', 'idRound', 'dataRegistro', 'meta', 'prazo', 'responsavel', 'status', 'conduta'],
  Bundle: ['idBundle', 'idPaciente', 'idRound', 'dataRegistro', 'analgesiaAdequada', 'podeReduzirSedacao', 'despertarDiario', 'alvoRASS', 'justificativaNaoReducaoSedacao', 'outroJustificativaSedacao', 'pacienteDelirium', 'podeIniciarDesmame', 'indicacaoTRE', 'realizarExtubacao', 'podeMobilizarHoje', 'nivelMobilidade', 'progredirMobilidade', 'justificativaNaoMobilizar', 'familiaInformadaPlano', 'presencaLesao', 'localLesao', 'grauLesao', 'barreiraPsicossocial'],
  Infeccao: ['idInfeccao', 'idPaciente', 'idRound', 'dataRegistro', 'suspeitaInfeccaoAtiva', 'provavelFoco', 'nomeAntibiotico', 'dataInicioAntibiotico', 'tempoTratamentoPrevistoDias', 'dataProvavelTerminoAntibiotico', 'tempoAntibioticoDias', 'melhoraParametrosInfeccao', 'condutaSemMelhora'],
  Assistencia: ['idAssistencia', 'idPaciente', 'idRound', 'dataRegistro', 'viasAlimentacao', 'tneDataInicio', 'tneVetPleno', 'tneAdequacaoPercentual', 'tnpDataInicio', 'tnpVetPleno', 'tnpAdequacaoPercentual', 'npoDataInicio', 'npoDias', 'instabilidadeHemodinamica', 'instabilidadeUltimasHoras', 'usoDrogaVasoativa', 'aumentoDoseDrogaVasoativa', 'lactatoAlterado', 'suporteRespiratorio', 'modoVentilatorioAtual', 'dataInicioModoVentilatorio', 'diasModoVentilatorio', 'viaAerea', 'statusSuporteVentilatorio', 'aumentoSuporteVentilatorio', 'pacienteEmHD', 'tipoHD', 'antibioticoEmUso', 'ajusteAntibioticoDialise', 'pausaDialitica', 'dataInicioPausaDialitica', 'tempoPausaDialiticaDias', 'dataProvavelTerminoPausaDialitica'],
  Riscos: ['idRisco', 'idPaciente', 'idRound', 'dataRegistro', 'riscoTEV', 'riscoInfeccao', 'riscoSangramento', 'riscoLPP', 'riscoNutricional', 'riscoDelirium', 'riscoBroncoaspiracao', 'riscoQueda', 'profilaxiaTEV', 'profilaxiaLAMG', 'outrosRiscos'],
  Dispositivos: ['idDispositivo', 'idPaciente', 'idRound', 'dataRegistro', 'tipoDispositivo', 'sitio', 'dataInsercao', 'podeRetirarHoje', 'dataRetirada', 'tempoDispositivoDias', 'justificativaPermanencia', 'statusDispositivo'],
  Alertas: ['idAlerta', 'idPaciente', 'idRound', 'dataAlerta', 'tipoAlerta', 'mensagem', 'gravidade', 'status', 'origem', 'dataResolucao'],
  Logs_Auditoria: ['idLog', 'dataHora', 'acao', 'entidade', 'idEntidade', 'detalhes']
};

function doGet() {
  inicializarBanco();
  return HtmlService.createHtmlOutputFromFile('socialhosp')
    .setTitle('SOCIALHOSP | Sistema de Gestão e Assistência do Serviço Social Hospitalar')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function inicializarBanco() {
  return criarAbasSeNaoExistirem();
}

function criarAbasSeNaoExistirem() {
  var ss = ensureDatabase_(true);
  var allSheets = Object.assign({}, SCHEMAS, SOCIALHOSP_SHEETS);
  var names = Object.keys(allSheets);
  names.forEach(function(name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = allSheets[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else {
      var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0] || [];
      headers.forEach(function(header) {
        if (current.indexOf(header) === -1) {
          sh.getRange(1, sh.getLastColumn() + 1).setValue(header);
        }
      });
    }
  });
  return { ok: true, abas: names };
}

function setupSocialHosp() {
  return criarAbasSeNaoExistirem();
}

function seedUsuariosPadrao_() {
  var usuarios = readTable_('Usuarios');
  if (usuarios.length) return usuarios;
  var admin = {
    ID_Usuario: 'USR-ADMIN',
    Usuario: 'admin',
    Senha: 'admin123',
    Nome: 'Administrador',
    Perfil: 'Administrador | Coordenador',
    Ativo: 'Sim',
    Criado_Em: nowIso_(),
    Atualizado_Em: nowIso_()
  };
  var rotina = {
    ID_Usuario: 'USR-ROTINA',
    Usuario: 'rotina',
    Senha: 'rotina123',
    Nome: 'Rotina',
    Perfil: 'Rotina',
    Ativo: 'Sim',
    Criado_Em: nowIso_(),
    Atualizado_Em: nowIso_()
  };
  var plantonista = {
    ID_Usuario: 'USR-PLANTONISTA',
    Usuario: 'plantonista',
    Senha: 'plantonista123',
    Nome: 'Plantonista',
    Perfil: 'Plantonista',
    Ativo: 'Sim',
    Criado_Em: nowIso_(),
    Atualizado_Em: nowIso_()
  };
  escreverLinhaEmLote_('Usuarios', [admin, rotina, plantonista]);
  return [admin, rotina, plantonista];
}

function loginUsuario(usuario, senha) {
  var usuarios = seedUsuariosPadrao_();
  var user = usuarios.find(function(row) {
    return String(row.Usuario || '').toLowerCase() === String(usuario || '').trim().toLowerCase() && String(row.Senha || '') === String(senha || '') && String(row.Ativo || '').toLowerCase() !== 'nao';
  });
  if (!user) {
    return { ok: false, mensagem: 'Usuário ou senha inválidos.' };
  }
  var perfil = String(user.Perfil || 'Rotina');
  var payload = { id: user.ID_Usuario, usuario: user.Usuario, nome: user.Nome, perfil: perfil };
  PropertiesService.getUserProperties().setProperty('SOCIALHOSP_SESSION', JSON.stringify(payload));
  return { ok: true, usuario: payload, mensagem: 'Login realizado com sucesso.' };
}

function getUsuarioAtual() {
  var raw = PropertiesService.getUserProperties().getProperty('SOCIALHOSP_SESSION');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function validarPermissao(perfilRequerido) {
  var usuario = getUsuarioAtual();
  if (!usuario) return false;
  if (!perfilRequerido) return true;
  var perfil = String(usuario.perfil || 'Rotina');
  if (perfilRequerido === 'Administrador | Coordenador') {
    return perfil === 'Administrador | Coordenador';
  }
  if (perfilRequerido === 'Rotina') {
    return perfil === 'Rotina' || perfil === 'Administrador | Coordenador';
  }
  if (perfilRequerido === 'Plantonista') {
    return perfil === 'Plantonista' || perfil === 'Rotina' || perfil === 'Administrador | Coordenador';
  }
  return perfil === perfilRequerido || perfil === 'Administrador | Coordenador';
}

function requirePermissao_(perfilRequerido, contexto) {
  if (!validarPermissao(perfilRequerido)) {
    throw new Error('Você não possui permissão para esta ação.');
  }
  return true;
}

function logoutUsuario() {
  PropertiesService.getUserProperties().deleteProperty('SOCIALHOSP_SESSION');
  return { ok: true };
}

function listarPacientesAtivos() {
  var rows = readTable_('Pacientes');
  return rows.filter(function(row) {
    return String(row.Arquivado || '').toLowerCase() !== 'sim';
  });
}

function getDadosMapa(filtros) {
  filtros = filtros || {};
  var pacientes = listarPacientesAtivos();
  var historico = readTable_('Historico_Atendimentos');
  var ultimoPorPaciente = {};
  historico.forEach(function(evento) {
    var id = String(evento.ID_Paciente || '');
    if (!id) return;
    var atual = ultimoPorPaciente[id] || null;
    if (!atual || new Date(String(evento.Data_Atendimento || '1900-01-01')).getTime() >= new Date(String(atual.Data_Atendimento || '1900-01-01')).getTime()) {
      ultimoPorPaciente[id] = evento;
    }
  });

  return pacientes.filter(function(row) {
    var ultimo = ultimoPorPaciente[String(row.ID_Paciente || '')] || {};
    row.Status = row.Status || (ultimo.Status || 'Ativo');
    row.Complexidade = row.Complexidade || (ultimo.Complexidade || 'Média');
    row.Data_Atendimento = row.Data_Atendimento || (ultimo.Data_Atendimento || '');
    row.Unidade = row.Unidade || (ultimo.Unidade || '');
    row.Leito = row.Leito || (ultimo.Leito || '');
    if (filtros.unidade && String(row.Unidade || '') !== String(filtros.unidade)) return false;
    if (filtros.status && String(row.Status || '') !== String(filtros.status)) return false;
    if (filtros.paciente && String(row.ID_Paciente || '') !== String(filtros.paciente)) return false;
    return true;
  });
}

function getHistoricoPaciente(idPaciente, filtros) {
  filtros = filtros || {};
  var rows = readTable_('Historico_Atendimentos');
  return rows.filter(function(row) {
    if (idPaciente && String(row.ID_Paciente || '') !== String(idPaciente)) return false;
    if (filtros.idPaciente && String(row.ID_Paciente || '') !== String(filtros.idPaciente)) return false;
    if (filtros.unidade && String(row.Unidade || '') !== String(filtros.unidade)) return false;
    if (filtros.profissional && String(row.Profissional || '').toLowerCase().indexOf(String(filtros.profissional).toLowerCase()) === -1) return false;
    if (filtros.inicio && String(row.Data_Atendimento || '') < String(filtros.inicio)) return false;
    if (filtros.fim && String(row.Data_Atendimento || '') > String(filtros.fim)) return false;
    return true;
  }).sort(function(a, b) {
    return new Date(String(b.Data_Atendimento || '1900-01-01')).getTime() - new Date(String(a.Data_Atendimento || '1900-01-01')).getTime();
  });
}

function gerarEvolucaoAutomatica(idPaciente) {
  var paciente = buscarPacientePorId(idPaciente);
  if (!paciente) {
    return { ok: false, texto: 'Paciente não encontrado.' };
  }
  var historico = getHistoricoPaciente(idPaciente);
  var linhas = [
    'Evolução de ' + (paciente.Nome_Paciente || 'Paciente') + ' - ' + (paciente.Unidade || 'Unidade não informada'),
    'Diagnóstico/Contexto: ' + (paciente.Diagnostico_Clinico || 'Não informado'),
    'Grau de dependência: ' + (paciente.Grau_Dependencia || 'Não informado'),
    'Vulnerabilidades: ' + (paciente.Vulnerabilidades || 'Não informado'),
    '',
    'Resumo da trajetória:'
  ];
  if (!historico.length) {
    linhas.push('Ainda não há registros de acompanhamento no histórico para este paciente.');
  } else {
    historico.slice(0, 5).forEach(function(evento) {
      linhas.push('- ' + (evento.Data_Atendimento || 'sem data') + ': ' + (evento.Tipo_Atendimento || 'atendimento') + '. ' + (evento.Resultado_Intervencao || evento.Observacoes || 'Sem registro detalhado.'));
    });
  }
  linhas.push('');
  linhas.push('Conclusão: paciente permanece em acompanhamento social com foco na articulação de rede, acesso a benefícios e proteção de vulnerabilidades identificadas.');
  return { ok: true, texto: linhas.join('\n') };
}

function gerarRelatorioSocial(idPaciente) {
  var paciente = buscarPacientePorId(idPaciente);
  if (!paciente) {
    return { ok: false, texto: 'Paciente não encontrado para emissão de relatório.' };
  }
  var historico = getHistoricoPaciente(idPaciente);
  var ultimoEvento = historico[0] || {};
  var texto = [
    'RELATÓRIO SOCIAL HOSPITALAR',
    'Paciente: ' + (paciente.Nome_Paciente || 'Não informado'),
    'Unidade: ' + (paciente.Unidade || 'Não informado') + ' | Leito: ' + (paciente.Leito || 'Não informado'),
    'Diagnóstico clínico: ' + (paciente.Diagnostico_Clinico || 'Não informado'),
    'Benefícios e vulnerabilidades: ' + (paciente.Beneficios_Sociais || 'Não informado') + ' / ' + (paciente.Vulnerabilidades || 'Não informado'),
    'Situação de moradia: ' + (paciente.Situacao_Moradia || 'Não informado'),
    'Previdência e rede comunitária: ' + (paciente.Situacao_Previdenciaria || 'Não informado') + ' | ' + (paciente.Rede_Comunitaria || 'Não informado'),
    '',
    'Último atendimento: ' + (ultimoEvento.Data_Atendimento || 'Sem registro') + ' | Profissional: ' + (ultimoEvento.Profissional || 'Não informado'),
    'Resultado da intervenção: ' + (ultimoEvento.Resultado_Intervencao || 'Sem registro')
  ].join('\n');
  return { ok: true, texto: texto };
}

function buscarPacientePorId(idPaciente) {
  var rows = readTable_('Pacientes');
  return rows.find(function(row) { return String(row.ID_Paciente) === String(idPaciente); }) || null;
}

function salvarNovoPaciente(payload) {
  requirePermissao_('Rotina', 'cadastro_paciente');
  payload = payload || {};
  if (!payload.Nome_Paciente || !payload.Unidade) {
    throw new Error('Informe nome do paciente e unidade.');
  }
  var rows = readTable_('Pacientes');
  var id = payload.ID_Paciente || makeId_('PAC');
  var item = {
    ID_Paciente: id,
    Nome_Paciente: payload.Nome_Paciente,
    Data_Nascimento: payload.Data_Nascimento || '',
    Idade: payload.Idade || '',
    Sexo: payload.Sexo || '',
    Filiação: payload.Filiação || '',
    Municipio_Residencia: payload.Municipio_Residencia || '',
    Unidade: payload.Unidade || '',
    Leito: payload.Leito || '',
    Data_Admissao: payload.Data_Admissao || '',
    Diagnostico_Clinico: payload.Diagnostico_Clinico || '',
    Referencia_Familiar: payload.Referencia_Familiar || '',
    Descricao_Genograma: payload.Descricao_Genograma || '',
    Nome_Referencia: payload.Nome_Referencia || '',
    Grau_Parentesco: payload.Grau_Parentesco || '',
    Telefone: payload.Telefone || '',
    Rede_Comunitaria: payload.Rede_Comunitaria || '',
    Situacao_Moradia: payload.Situacao_Moradia || '',
    Situacao_Previdenciaria: payload.Situacao_Previdenciaria || '',
    Beneficios_Sociais: payload.Beneficios_Sociais || '',
    Descricao_Beneficios: payload.Descricao_Beneficios || '',
    Vulnerabilidades: payload.Vulnerabilidades || '',
    Descricao_Vulnerabilidades: payload.Descricao_Vulnerabilidades || '',
    Grau_Dependencia: payload.Grau_Dependencia || '',
    Data_Inclusao_Social: payload.Data_Inclusao_Social || todayIso_(),
    Data_Previsao_Alta: payload.Data_Previsao_Alta || '',
    Arquivado: 'Não',
    Atualizado_Em: nowIso_()
  };
  rows.push(item);
  escreverLinhaEmLote_('Pacientes', rows);
  registrarLog_('Cadastro paciente', 'Pacientes', id, JSON.stringify(item));
  return item;
}

function atualizarCadastroPaciente(payload) {
  requirePermissao_('Rotina', 'atualizar_cadastro');
  var id = payload.ID_Paciente;
  var rows = readTable_('Pacientes');
  var index = rows.findIndex(function(row) { return String(row.ID_Paciente) === String(id); });
  if (index === -1) throw new Error('Paciente não encontrado.');
  Object.keys(payload).forEach(function(key) {
    rows[index][key] = payload[key];
  });
  rows[index].Atualizado_Em = nowIso_();
  escreverLinhaEmLote_('Pacientes', rows);
  registrarLog_('Atualização cadastral', 'Pacientes', id, JSON.stringify(payload));
  return rows[index];
}

function salvarAtualizacaoDiaria(payload) {
  requirePermissao_('Rotina', 'atualizacao_diaria');
  payload = payload || {};
  if (!payload.ID_Paciente || !payload.Data_Atendimento) {
    throw new Error('Paciente e data de atendimento são obrigatórios.');
  }
  var evento = {
    ID_Evento: payload.ID_Evento || makeId_('EVT'),
    ID_Paciente: payload.ID_Paciente,
    Nome_Paciente: payload.Nome_Paciente || buscarPacientePorId(payload.ID_Paciente).Nome_Paciente || '',
    Unidade: payload.Unidade || '',
    Leito: payload.Leito || '',
    Data_Atendimento: payload.Data_Atendimento,
    Profissional: payload.Profissional || '',
    Tipo_Atendimento: payload.Tipo_Atendimento || '',
    Descricao_Tipo_Atendimento: payload.Descricao_Tipo_Atendimento || '',
    Tipo_Caso: payload.Tipo_Caso || '',
    Descricao_Tipo_Caso: payload.Descricao_Tipo_Caso || '',
    Complexidade: payload.Complexidade || '',
    Metas: payload.Metas || '',
    Prazos: payload.Prazos || '',
    Status: payload.Status || 'Andamento',
    Condutas: payload.Condutas || '',
    Pendencias: payload.Pendencias || '',
    Observacoes: payload.Observacoes || '',
    Impressao_Caso: payload.Impressao_Caso || '',
    Barreira_Alta: payload.Barreira_Alta || 'Não',
    Descricao_Barreira: payload.Descricao_Barreira || '',
    Data_Identificacao_Barreira: payload.Data_Identificacao_Barreira || '',
    Data_Resolucao_Barreira: payload.Data_Resolucao_Barreira || '',
    Resultado_Barreira: payload.Resultado_Barreira || '',
    Encaminhamentos: payload.Encaminhamentos || '',
    Documentacao_Encaminhamento: payload.Documentacao_Encaminhamento || '',
    Notificacao_Compulsoria: payload.Notificacao_Compulsoria || 'Não',
    Tipo_Notificacao: payload.Tipo_Notificacao || '',
    Articulacao_Familiar: payload.Articulacao_Familiar || 'Não',
    Articulacao_Comunitaria: payload.Articulacao_Comunitaria || 'Não',
    Articulacao_Equipamento: payload.Articulacao_Equipamento || 'Não',
    Equipamento_Envolvido: payload.Equipamento_Envolvido || '',
    Resultado_Intervencao: payload.Resultado_Intervencao || '',
    Desfecho: payload.Desfecho || '',
    Alertas_Identificados: payload.Alertas_Identificados || '',
    Criado_Em: nowIso_()
  };
  var historico = readTable_('Historico_Atendimentos');
  historico.push(evento);
  escreverLinhaEmLote_('Historico_Atendimentos', historico);
  registrarLog_('Atualização diária', 'Historico_Atendimentos', evento.ID_Evento, JSON.stringify(evento));
  return evento;
}

function arquivarPaciente(payload) {
  requirePermissao_('Rotina', 'arquivamento');
  payload = payload || {};
  if (!payload.ID_Paciente || !payload.Desfecho || !payload.Data_Desfecho) throw new Error('Informe paciente, desfecho e data do desfecho.');
  var rows = readTable_('Pacientes');
  var index = rows.findIndex(function(row) { return String(row.ID_Paciente) === String(payload.ID_Paciente); });
  if (index === -1) throw new Error('Paciente não encontrado para arquivamento.');
  rows[index].Arquivado = 'Sim';
  rows[index].Data_Arquivamento = payload.Data_Arquivamento || todayIso_();
  rows[index].Data_Desfecho = payload.Data_Desfecho;
  rows[index].Desfecho = payload.Desfecho;
  rows[index].Atualizado_Em = nowIso_();
  escreverLinhaEmLote_('Pacientes', rows);
  registrarLog_('Arquivamento', 'Pacientes', payload.ID_Paciente, JSON.stringify({ Desfecho: payload.Desfecho, Data_Desfecho: payload.Data_Desfecho }));
  return { ok: true };
}

function getDashboardData(filtros) {
  requirePermissao_('Rotina', 'dashboard');
  return calcularIndicadores(filtros || {});
}

function getMonitoramentoData(filtros) {
  requirePermissao_('Rotina', 'monitoramento');
  filtros = filtros || {};
  var monitor = readTable_('Monitoramento');
  return monitor.filter(function(row) {
    if (filtros.unidade && String(row.Unidade || '') !== String(filtros.unidade)) return false;
    if (filtros.paciente && String(row.ID_Paciente || '') !== String(filtros.paciente)) return false;
    return true;
  });
}

function getProdutividadeData(filtros) {
  requirePermissao_('Administrador | Coordenador', 'produtividade');
  filtros = filtros || {};
  var rows = readTable_('Historico_Atendimentos');
  return rows.filter(function(row) {
    if (filtros.unidade && String(row.Unidade || '') !== String(filtros.unidade)) return false;
    if (filtros.profissional && String(row.Profissional || '') !== String(filtros.profissional)) return false;
    return true;
  });
}

function getPerfilEpidemiologico(filtros) {
  requirePermissao_('Rotina', 'perfil_epidemiologico');
  filtros = filtros || {};
  var pacientes = readTable_('Pacientes');
  return pacientes.filter(function(row) {
    if (filtros.unidade && String(row.Unidade || '') !== String(filtros.unidade)) return false;
    return true;
  });
}

function registrarLog_(acao, modulo, paciente, valor) {
  var row = {
    ID_Log: makeId_('LOG'),
    Data_Hora: nowIso_(),
    Usuario: getUsuarioAtual() ? getUsuarioAtual().usuario : 'Sistema',
    Perfil: getUsuarioAtual() ? getUsuarioAtual().perfil : 'Sistema',
    Acao: acao || '',
    Modulo: modulo || '',
    Paciente: paciente || '',
    Registro: '',
    Valor_Anterior: '',
    Valor_Novo: valor || ''
  };
  var rows = readTable_('Log_Auditoria');
  rows.push(row);
  escreverLinhaEmLote_('Log_Auditoria', rows);
}

function escreverLinhaEmLote_(sheetName, rows) {
  var sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh) return;
  if (sh.getLastRow() === 0) {
    var headers = Object.keys(SOCIALHOSP_SHEETS[sheetName] || {}).length ? SOCIALHOSP_SHEETS[sheetName] : (SCHEMAS[sheetName] || []);
    if (headers && headers.length) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var cols = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = rows.map(function(row) {
    return cols.map(function(colName) { return row[colName] !== undefined ? row[colName] : ''; });
  });
  if (!values.length) return;
  sh.clearContents();
  sh.getRange(1, 1, values.length + 1, cols.length).setValues([cols].concat(values));
}

function setupRoundHosp() {
  var ss = ensureDatabase_(true);
  return { ok: true, urlPlanilha: ss.getUrl(), abas: ss.getSheets().map(function(s) { return s.getName(); }) };
}

function myFunction() {
  return setupRoundHosp();
}

function apiBootstrap() {
  ensureDatabase_();
  var data = readTables_(['Pacientes', 'Rounds', 'Metas', 'Dispositivos', 'Riscos', 'Alertas', 'Bundle', 'Assistencia']);
  var pacientes = enrichPatients_(data);
  var alertas = enrichAlerts_(data.Alertas, data.Pacientes);
  return {
    pacientes: pacientes,
    alertas: alertas,
    dashboard: buildDashboard_(pacientes, data.Rounds, data.Metas, data.Dispositivos, data.Riscos, alertas, data.Bundle, data.Assistencia),
    unidades: unique_(data.Pacientes.map(function(p) { return p.unidade; }).filter(Boolean)),
    diagnostico: apiDiagnostics()
  };
}

function apiDiagnostics() {
  ensureDatabase_();
  var data = readAll_();
  return {
    modo: 'Apps Script',
    pacientes: data.Pacientes.filter(function(p) { return !p.statusPaciente || p.statusPaciente === 'Ativo'; }).length,
    rounds: data.Rounds.length,
    roundsFinalizados: data.Rounds.filter(function(r) { return r.statusRound === 'Finalizado'; }).length,
    metas: data.Metas.length,
    bundle: data.Bundle.length,
    infeccao: data.Infeccao.length,
    assistencia: data.Assistencia.length,
    riscos: data.Riscos.length,
    dispositivos: data.Dispositivos.length,
    alertasAtivos: data.Alertas.filter(function(a) { return a.status === 'Ativo'; }).length,
    ultimaAtualizacao: nowIso_()
  };
}

function apiHealth() {
  var ss = ensureDatabase_();
  var out = { ok: true, planilha: ss.getName(), urlPlanilha: ss.getUrl(), abas: {} };
  Object.keys(SCHEMAS).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    out.abas[name] = sh ? Math.max(0, sh.getLastRow() - 1) : -1;
  });
  return out;
}

function apiSavePatient(data) {
  ensureDatabase_();
  data = data || {};
  if (!data.nomePaciente || !data.leito) throw new Error('Informe nome do paciente e leito.');
  var existingPatient = data.idPaciente ? (readTable_('Pacientes').find(function(p) { return String(p.idPaciente) === String(data.idPaciente); }) || null) : null;
  var paciente = {
    idPaciente: data.idPaciente || makeId_('PAC'),
    prontuario: data.prontuario || '',
    nomePaciente: data.nomePaciente || '',
    dataNascimento: data.dataNascimento || '',
    idade: data.idade || '',
    leito: data.leito || '',
    unidade: data.unidade || 'UTI Adulto',
    motivoInternacao: data.motivoInternacao || '',
    diagnosticoAtual: data.diagnosticoAtual || '',
    dataAdmissaoHospitalar: data.dataAdmissaoHospitalar || '',
    dataAdmissaoUnidade: data.dataAdmissaoUnidade || '',
    diasInternacao: daysBetween_(data.dataAdmissaoUnidade || data.dataAdmissaoHospitalar, ''),
    SAPS: data.SAPS || '',
    dataInicioVM: data.dataInicioVM || '',
    dataFimVM: data.dataFimVM || '',
    tempoVMDias: daysBetween_(data.dataInicioVM, data.dataFimVM),
    previsaoAlta: data.previsaoAlta || '',
    statusPaciente: existingPatient && existingPatient.statusPaciente ? existingPatient.statusPaciente : 'Ativo',
    desfecho: existingPatient ? (existingPatient.desfecho || '') : '',
    dataDesfecho: existingPatient ? (existingPatient.dataDesfecho || '') : '',
    dataAtualizacao: nowIso_()
  };
  withWriteLock_(function() {
    if (existingPatient) {
      updateById_('Pacientes', 'idPaciente', paciente.idPaciente, paciente);
      appendRows_('Logs_Auditoria', [logRecord_('Edição paciente', 'Pacientes', paciente.idPaciente, paciente.nomePaciente)]);
    } else {
      appendRows_('Pacientes', [paciente]);
      appendRows_('Logs_Auditoria', [logRecord_('Cadastro paciente', 'Pacientes', paciente.idPaciente, paciente.nomePaciente)]);
    }
  });
  var enrichedPatient = enrichPatients_(readAll_()).find(function(p) { return p.idPaciente === paciente.idPaciente; });
  if (enrichedPatient) return enrichedPatient;
  paciente.statusRound = 'Não iniciado';
  paciente.evolucaoPaciente = 'Estável';
  paciente.metasResumo = '';
  paciente.pendenciasResumo = '';
  paciente.riscosAtivos = '';
  paciente.alertasAtivos = '';
  paciente.dispositivosResumo = '';
  return paciente;
}

function apiArchivePatient(payload) {
  ensureDatabase_();
  payload = payload || {};
  if (!payload.idPaciente || !payload.desfecho || !payload.dataDesfecho) throw new Error('Informe paciente, desfecho e data do desfecho.');
  withWriteLock_(function() {
    updateById_('Pacientes', 'idPaciente', payload.idPaciente, {
      statusPaciente: 'Arquivado',
      desfecho: payload.desfecho,
      dataDesfecho: payload.dataDesfecho,
      dataAtualizacao: nowIso_()
    });
    appendRows_('Logs_Auditoria', [logRecord_('Arquivamento paciente', 'Pacientes', payload.idPaciente, payload.desfecho)]);
  });
  return { ok: true };
}

function apiListPatients() {
  ensureDatabase_();
  return enrichPatients_(readTables_(['Pacientes', 'Rounds', 'Metas', 'Dispositivos', 'Riscos', 'Alertas']));
}

function apiStartRoundFull(payload) {
  ensureDatabase_();
  payload = payload || {};
  if (!payload.idPaciente) throw new Error('Paciente inválido.');
  var equipes = (payload.equipesPresentes || []).join(', ');
  var round;
  withWriteLock_(function() {
    var rounds = readTable_('Rounds');
    round = rounds.find(function(r) { return r.idPaciente === payload.idPaciente && r.statusRound === 'Em andamento' && String(r.dataRound) === todayIso_(); });
    if (!round) {
      round = {
        idRound: makeId_('RND'),
        idPaciente: payload.idPaciente,
        dataRound: todayIso_(),
        equipesPresentes: equipes,
        horarioInicioRound: nowIso_(),
        horarioTerminoRound: '',
        tempoRoundMinutos: '',
        statusRound: 'Em andamento',
        problemaAtivoPrincipal: '',
        barreirasAlta: '',
        condutaDefinida: '',
        evolucaoPaciente: 'Estável',
        pendencias: '',
        dataRegistro: nowIso_()
      };
      appendRows_('Rounds', [round]);
      appendRows_('Logs_Auditoria', [logRecord_('Início round', 'Rounds', round.idRound, payload.idPaciente)]);
    } else if (equipes && !round.equipesPresentes) {
      updateById_('Rounds', 'idRound', round.idRound, { equipesPresentes: equipes });
      round.equipesPresentes = equipes;
    }
  });
  var result;
  try {
    result = getRoundPayload_(payload.idPaciente, round.idRound);
  } catch (e) {
    result = {};
  }
  result = result || {};
  result.round = normalizeForClient_(result.round && result.round.idRound ? result.round : round);
  result.paciente = normalizeForClient_(result.paciente || readTable_('Pacientes').find(function(p) { return p.idPaciente === payload.idPaciente; }) || {});
  result.metas = normalizeForClient_(result.metas || []);
  result.metasAnteriores = normalizeForClient_(result.metasAnteriores || []);
  result.bundle = normalizeForClient_(result.bundle || {});
  result.infeccao = normalizeForClient_(result.infeccao && result.infeccao.length ? result.infeccao : [{}]);
  result.assistencia = normalizeForClient_(result.assistencia || {});
  result.riscos = normalizeForClient_(result.riscos || {});
  result.dispositivos = normalizeForClient_(result.dispositivos && result.dispositivos.length ? result.dispositivos : [{}]);
  return result;
}

function apiSaveRound(payload) {
  ensureDatabase_();
  payload = payload || {};
  var r = payload.round || {};
  if (!r.idPaciente || !r.idRound) throw new Error('Round inválido.');
  var existingRound = readTable_('Rounds').find(function(x) { return String(x.idRound) === String(r.idRound); }) || {};
  if (existingRound.statusRound === 'Finalizado') {
    var saved = getRoundPayload_(r.idPaciente, r.idRound);
    saved.verificacao = verifyRoundSaved_(r.idRound);
    saved.ignorado = true;
    saved.mensagem = 'Round já finalizado. Autosave posterior ignorado.';
    return saved;
  }
  var saveSkipped = false;
  withWriteLock_(function() {
    var lockedRound = readTable_('Rounds').find(function(x) { return String(x.idRound) === String(r.idRound); }) || {};
    if (lockedRound.statusRound === 'Finalizado') {
      saveSkipped = true;
      return;
    }
    upsertRound_(r, {
      equipesPresentes: r.equipesPresentes || '',
      problemaAtivoPrincipal: r.problemaAtivoPrincipal || '',
      barreirasAlta: r.barreirasAlta || '',
      condutaDefinida: r.condutaDefinida || '',
      evolucaoPaciente: r.evolucaoPaciente || 'Estável',
      pendencias: r.pendencias || '',
      statusRound: 'Em andamento',
      dataRegistro: nowIso_()
    });
    updatePreviousMetaStatuses_(payload.metasAnteriores || []);
    replaceRoundRows_('Metas', r.idRound, buildMetaRows_(payload.metas || [], r));
    replaceRoundRows_('Bundle', r.idRound, [buildBundleRow_(payload.bundle || {}, r)]);
    replaceRoundRows_('Infeccao', r.idRound, buildInfectionRows_(payload.infeccao || [], r));
    replaceRoundRows_('Assistencia', r.idRound, [buildAssistRow_(payload.assistencia || {}, r)]);
    replaceRoundRows_('Riscos', r.idRound, [buildRiskRow_(payload.riscos || {}, r)]);
    replaceRoundRows_('Dispositivos', r.idRound, buildDeviceRows_(payload.dispositivos || [], r));
    SpreadsheetApp.flush();
    generateAlerts_(r.idPaciente, r.idRound);
    appendRows_('Logs_Auditoria', [logRecord_('Registro round', 'Rounds', r.idRound, r.idPaciente)]);
  });
  if (saveSkipped) {
    var kept = getRoundPayload_(r.idPaciente, r.idRound);
    kept.verificacao = verifyRoundSaved_(r.idRound);
    kept.ignorado = true;
    kept.mensagem = 'Round já finalizado. Autosave posterior ignorado.';
    return kept;
  }
  var result = getRoundPayload_(r.idPaciente, r.idRound);
  result.verificacao = verifyRoundSaved_(r.idRound);
  return result;
}

function apiFinishRound(payload) {
  ensureDatabase_();
  payload = payload || {};
  var r = payload.round || {};
  if (!r.idPaciente || !r.idRound) throw new Error('Round inválido para finalização.');
  var existing = readTable_('Rounds').find(function(x) { return String(x.idRound) === String(r.idRound); }) || {};
  var start = new Date(existing.horarioInicioRound || r.horarioInicioRound || new Date());
  var end = new Date();
  var minutes = isNaN(start.getTime()) ? '' : Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  var finishTime = nowIso_();
  withWriteLock_(function() {
    upsertRound_(r, {
      equipesPresentes: r.equipesPresentes || existing.equipesPresentes || '',
      problemaAtivoPrincipal: r.problemaAtivoPrincipal || '',
      barreirasAlta: r.barreirasAlta || '',
      condutaDefinida: r.condutaDefinida || '',
      evolucaoPaciente: r.evolucaoPaciente || 'Estável',
      pendencias: r.pendencias || '',
      horarioTerminoRound: finishTime,
      tempoRoundMinutos: minutes,
      statusRound: 'Finalizado',
      dataRegistro: finishTime
    });
    updatePreviousMetaStatuses_(payload.metasAnteriores || []);
    replaceRoundRows_('Metas', r.idRound, buildMetaRows_(payload.metas || [], r));
    replaceRoundRows_('Bundle', r.idRound, [buildBundleRow_(payload.bundle || {}, r)]);
    replaceRoundRows_('Infeccao', r.idRound, buildInfectionRows_(payload.infeccao || [], r));
    replaceRoundRows_('Assistencia', r.idRound, [buildAssistRow_(payload.assistencia || {}, r)]);
    replaceRoundRows_('Riscos', r.idRound, [buildRiskRow_(payload.riscos || {}, r)]);
    replaceRoundRows_('Dispositivos', r.idRound, buildDeviceRows_(payload.dispositivos || [], r));
    SpreadsheetApp.flush();
    generateAlerts_(r.idPaciente, r.idRound);
    appendRows_('Logs_Auditoria', [logRecord_('Finalização round', 'Rounds', r.idRound, r.idPaciente)]);
  });
  var verificacao = verifyRoundSaved_(r.idRound);
  if (!verificacao.contagens.Rounds) {
    throw new Error('Finalização executada, mas o round não foi encontrado na aba Rounds. Planilha usada: ' + verificacao.urlPlanilha);
  }
  var data = readAll_();
  var pacientes = enrichPatients_(data);
  var alertas = enrichAlerts_(data.Alertas, data.Pacientes);
  return {
    ok: true,
    verificacao: verificacao,
    pacientes: pacientes,
    alertas: alertas,
    dashboard: buildDashboard_(pacientes, data.Rounds, data.Metas, data.Dispositivos, data.Riscos, alertas, data.Bundle, data.Assistencia),
    unidades: unique_(data.Pacientes.map(function(p) { return p.unidade; }).filter(Boolean)),
    diagnostico: apiDiagnostics()
  };
}

function apiPlanoTerapeutico(idPaciente) {
  ensureDatabase_();
  var data = readAll_();
  var p = data.Pacientes.find(function(x) { return x.idPaciente === idPaciente; }) || {};
  var rounds = data.Rounds.filter(function(r) { return r.idPaciente === idPaciente; }).sort(function(a, b) { return String(b.dataRegistro).localeCompare(String(a.dataRegistro)); });
  var latestRound = rounds[0] || {};
  var previousRound = rounds.filter(function(r) { return latestRound.idRound && r.idRound !== latestRound.idRound && r.statusRound === 'Finalizado'; })[0] || {};
  var metas = data.Metas.filter(function(m) { return m.idPaciente === idPaciente; }).sort(function(a, b) { return String(b.dataRegistro).localeCompare(String(a.dataRegistro)); });
  var metasAnteriores = previousRound.idRound ? data.Metas.filter(function(m) { return m.idRound === previousRound.idRound && ['Pendente', 'Em andamento'].indexOf(String(m.status || '')) >= 0; }) : [];
  var metasProximas24h = latestRound.idRound ? data.Metas.filter(function(m) { return m.idRound === latestRound.idRound; }) : [];
  var latestRisk = data.Riscos.filter(function(r) { return r.idPaciente === idPaciente; }).pop() || {};
  var risks = riskLabels_(latestRisk);
  function cleanMeta_(m) {
    return { meta: m.meta, prazo: m.prazo, responsavel: m.responsavel, status: m.status, conduta: m.conduta };
  }
  return {
    paciente: p,
    diagnosticoAtual: p.diagnosticoAtual || '',
    problemasAtivos: latestRound.problemaAtivoPrincipal || '',
    riscosAssistenciais: risks.join(', '),
    metas: metas.map(cleanMeta_),
    metasAnteriores: metasAnteriores.map(cleanMeta_),
    metasProximas24h: metasProximas24h.map(cleanMeta_),
    reavaliacao: latestRound.dataRegistro || ''
  };
}

function apiListAlerts(filters) {
  ensureDatabase_();
  filters = filters || {};
  var data = readTables_(['Alertas', 'Pacientes']);
  return enrichAlerts_(data.Alertas, data.Pacientes).filter(function(a) {
    var day = String(a.dataAlerta || '').slice(0, 10);
    if (a.status !== 'Ativo') return false;
    if (filters.idPaciente && a.idPaciente !== filters.idPaciente) return false;
    if (filters.inicio && day < filters.inicio) return false;
    if (filters.fim && day > filters.fim) return false;
    if (filters.unidade && a.unidade !== filters.unidade) return false;
    return true;
  });
}

function apiRebuildAlerts() {
  ensureDatabase_();
  rebuildAlerts_();
  return apiBootstrap();
}

function apiResolveAlert(idAlerta) {
  ensureDatabase_();
  withWriteLock_(function() { updateById_('Alertas', 'idAlerta', idAlerta, { status: 'Resolvido', dataResolucao: nowIso_() }); });
  return { ok: true };
}

function apiDashboard(filters) {
  ensureDatabase_();
  filters = filters || {};
  var data = readTables_(['Pacientes', 'Rounds', 'Metas', 'Dispositivos', 'Riscos', 'Alertas', 'Bundle', 'Assistencia']);
  var pacientes = enrichPatients_(data).filter(function(p) { return !filters.unidade || p.unidade === filters.unidade; });
  var patientIds = pacientes.map(function(p) { return p.idPaciente; });
  var rounds = data.Rounds.filter(function(r) {
    if (patientIds.indexOf(r.idPaciente) === -1) return false;
    if (filters.inicio && String(r.dataRound) < filters.inicio) return false;
    if (filters.fim && String(r.dataRound) > filters.fim) return false;
    return true;
  });
  var byPatient = function(row) { return patientIds.indexOf(row.idPaciente) !== -1; };
  return buildDashboard_(
    pacientes,
    rounds,
    data.Metas.filter(byPatient),
    data.Dispositivos.filter(byPatient),
    data.Riscos.filter(byPatient),
    enrichAlerts_(data.Alertas, data.Pacientes).filter(byPatient),
    data.Bundle.filter(byPatient),
    data.Assistencia.filter(byPatient)
  );
}

function apiDeviceControl(filters) {
  ensureDatabase_();
  filters = filters || {};
  var data = readTables_(['Pacientes', 'Rounds', 'Dispositivos']);
  return data.Dispositivos.filter(function(d) {
    var round = data.Rounds.find(function(r) { return r.idRound === d.idRound; }) || {};
    var rawId = String(d.idPaciente || '').trim();
    var roundId = String(round.idPaciente || '').trim();
    var p = data.Pacientes.find(function(x) { return String(x.idPaciente || '').trim() === rawId; }) || data.Pacientes.find(function(x) { return String(x.idPaciente || '').trim() === roundId; }) || {};
    var idPaciente = p.idPaciente || d.idPaciente || round.idPaciente || '';
    if (filters.idPaciente && idPaciente !== filters.idPaciente) return false;
    if (filters.unidade && p.unidade !== filters.unidade) return false;
    if (filters.inicio && String(d.dataInsercao || d.dataRegistro) < filters.inicio) return false;
    if (filters.fim && String(d.dataInsercao || d.dataRegistro) > filters.fim) return false;
    return true;
  }).map(function(d) {
    var round = data.Rounds.find(function(r) { return r.idRound === d.idRound; }) || {};
    var rawId = String(d.idPaciente || '').trim();
    var roundId = String(round.idPaciente || '').trim();
    var p = data.Pacientes.find(function(x) { return String(x.idPaciente || '').trim() === rawId; }) || data.Pacientes.find(function(x) { return String(x.idPaciente || '').trim() === roundId; }) || {};
    var idPaciente = p.idPaciente || d.idPaciente || round.idPaciente || '';
    return {
      leito: p.leito || '', nomePaciente: p.nomePaciente || '', unidade: p.unidade || '', idPaciente: idPaciente,
      tipoDispositivo: d.tipoDispositivo || '', sitio: d.sitio || '', dataInsercao: d.dataInsercao || '', dataRetirada: d.dataRetirada || '',
      podeRetirarHoje: d.podeRetirarHoje || '', justificativaPermanencia: d.justificativaPermanencia || '',
      tempoDispositivoDias: d.tempoDispositivoDias || daysBetween_(d.dataInsercao, d.dataRetirada), statusDispositivo: d.statusDispositivo || ''
    };
  }).sort(function(a,b){ return String(a.leito).localeCompare(String(b.leito)); });
}

function apiHistory(filters) {
  ensureDatabase_();
  filters = filters || {};
  var data = readAll_();
  var rounds = data.Rounds.filter(function(r) {
    var p = data.Pacientes.find(function(x) { return x.idPaciente === r.idPaciente; }) || {};
    if (filters.idPaciente && r.idPaciente !== filters.idPaciente) return false;
    if (filters.inicio && String(r.dataRound) < filters.inicio) return false;
    if (filters.fim && String(r.dataRound) > filters.fim) return false;
    if (filters.unidade && p.unidade !== filters.unidade) return false;
    return true;
  });
  return rounds.map(function(r) {
    return {
      paciente: data.Pacientes.find(function(p) { return p.idPaciente === r.idPaciente; }) || {},
      round: r,
      metas: data.Metas.filter(function(m) { return m.idRound === r.idRound; }),
      alertas: enrichAlerts_(data.Alertas.filter(function(a) { return a.idRound === r.idRound; }), data.Pacientes),
      dispositivos: data.Dispositivos.filter(function(d) { return d.idRound === r.idRound; }),
      bundle: data.Bundle.filter(function(b) { return b.idRound === r.idRound; }).pop() || {},
      infeccao: data.Infeccao.filter(function(i) { return i.idRound === r.idRound; }),
      assistencia: data.Assistencia.filter(function(a) { return a.idRound === r.idRound; }).pop() || {},
      riscos: data.Riscos.filter(function(x) { return x.idRound === r.idRound; }).pop() || {}
    };
  }).sort(function(a, b) { return String(b.round.dataRegistro).localeCompare(String(a.round.dataRegistro)); });
}

function apiDailyReport(dateText) {
  ensureDatabase_();
  var filters = {};
  if (dateText && typeof dateText === 'object') {
    filters = dateText;
    dateText = filters.data || filters.date || filters.dia || '';
  }
  var day = dateText || todayIso_();
  var data = readAll_();
  var rounds = data.Rounds.filter(function(r) {
    var p = data.Pacientes.find(function(x) { return x.idPaciente === r.idPaciente; }) || {};
    if (String(r.dataRound) !== day) return false;
    if (!p.idPaciente || (p.statusPaciente && p.statusPaciente !== 'Ativo')) return false;
    if (filters.unidade && p.unidade !== filters.unidade) return false;
    return true;
  });
  return {
    data: day,
    rounds: rounds.map(function(r) {
      var p = data.Pacientes.find(function(x) { return x.idPaciente === r.idPaciente; }) || {};
      return {
        paciente: p, round: r,
        metas: data.Metas.filter(function(m) { return m.idRound === r.idRound; }),
        assistencia: data.Assistencia.filter(function(a) { return a.idRound === r.idRound; }).pop() || {},
        riscos: data.Riscos.filter(function(x) { return x.idRound === r.idRound; }).pop() || {},
        dispositivos: data.Dispositivos.filter(function(d) { return d.idRound === r.idRound; }),
        alertas: enrichAlerts_(data.Alertas.filter(function(a) { return a.idRound === r.idRound && a.status === 'Ativo'; }), data.Pacientes),
        pendencias: r.pendencias || ''
      };
    }).sort(function(a,b){return String(a.paciente.leito).localeCompare(String(b.paciente.leito));}),
    alertas: enrichAlerts_(data.Alertas.filter(function(a) { return String(a.dataAlerta).slice(0, 10) === day && a.status === 'Ativo'; }), data.Pacientes)
  };
}

function getRoundPayload_(idPaciente, idRound) {
  var data = readTables_(['Pacientes', 'Rounds', 'Metas', 'Bundle', 'Infeccao', 'Assistencia', 'Riscos', 'Dispositivos']);
  var previousRounds = data.Rounds.filter(function(r) {
    return r.idPaciente === idPaciente && r.idRound !== idRound && r.statusRound === 'Finalizado';
  }).sort(function(a, b) { return String(b.dataRegistro).localeCompare(String(a.dataRegistro)); });
  var previousRound = previousRounds[0] || {};
  var currentMetas = data.Metas.filter(function(m) { return m.idRound === idRound; });
  var previousMetas = previousRound.idRound ? data.Metas.filter(function(m) { return m.idRound === previousRound.idRound && ['Pendente', 'Em andamento'].indexOf(String(m.status || '')) >= 0; }) : [];
  var currentInfeccao = data.Infeccao.filter(function(i) { return i.idRound === idRound; });
  var currentAssistencia = data.Assistencia.filter(function(a) { return a.idRound === idRound; }).pop() || null;
  var currentRiscos = data.Riscos.filter(function(r) { return r.idRound === idRound; }).pop() || null;
  var currentDispositivos = data.Dispositivos.filter(function(d) { return d.idRound === idRound; });
  var previousDispositivos = currentDispositivos.length ? currentDispositivos : latestByPatient_(data.Dispositivos, idPaciente, previousRound.idRound, true).map(function(d) {
    var row = Object.assign({}, d);
    row.idRound = idRound;
    row.podeRetirarHoje = '';
    row.justificativaPermanencia = '';
    return row;
  });
  return {
    paciente: data.Pacientes.find(function(p) { return p.idPaciente === idPaciente; }) || null,
    round: data.Rounds.find(function(r) { return r.idRound === idRound; }) || null,
    metas: currentMetas.length ? currentMetas : [],
    metasAnteriores: previousMetas,
    bundle: data.Bundle.filter(function(b) { return b.idRound === idRound; }).pop() || {},
    infeccao: currentInfeccao.length ? currentInfeccao : latestByPatient_(data.Infeccao, idPaciente, previousRound.idRound, true),
    assistencia: currentAssistencia || latestByPatient_(data.Assistencia, idPaciente, previousRound.idRound, false) || {},
    riscos: currentRiscos || latestByPatient_(data.Riscos, idPaciente, previousRound.idRound, false) || {},
    dispositivos: previousDispositivos
  };
}

function latestByPatient_(rows, idPaciente, preferredRound, many) {
  var filtered = rows.filter(function(r) { return r.idPaciente === idPaciente && (!preferredRound || r.idRound === preferredRound); });
  if (!filtered.length) {
    filtered = rows.filter(function(r) { return r.idPaciente === idPaciente; }).sort(function(a, b) { return String(b.dataRegistro).localeCompare(String(a.dataRegistro)); });
    if (many && filtered.length) {
      var latestRound = filtered[0].idRound;
      filtered = filtered.filter(function(r) { return r.idRound === latestRound; });
    }
  }
  if (many) return filtered;
  return filtered.length ? filtered[0] : null;
}

function buildMetaRows_(rows, round) {
  return rows.filter(function(m) { return m.meta; }).map(function(m) {
    return { idMeta: makeId_('MET'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(), meta: m.meta || '', prazo: m.prazo || '', responsavel: m.responsavel || '', status: m.status || 'Pendente', conduta: m.conduta || '' };
  });
}

function updatePreviousMetaStatuses_(rows) {
  (rows || []).forEach(function(m) {
    if (!m.idMeta || !m.status) return;
    updateById_('Metas', 'idMeta', m.idMeta, { status: m.status });
  });
}

function buildBundleRow_(b, round) {
  return {
    idBundle: makeId_('BUN'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(),
    analgesiaAdequada: status3_(b.analgesiaAdequada),
    podeReduzirSedacao: status3_(b.podeReduzirSedacao),
    despertarDiario: status3_(b.despertarDiario),
    alvoRASS: b.alvoRASS || '',
    justificativaNaoReducaoSedacao: b.justificativaNaoReducaoSedacao || '',
    outroJustificativaSedacao: b.outroJustificativaSedacao || '',
    pacienteDelirium: sim_(b.pacienteDelirium),
    podeIniciarDesmame: status3_(b.podeIniciarDesmame),
    indicacaoTRE: status3_(b.indicacaoTRE),
    realizarExtubacao: status3_(b.realizarExtubacao),
    podeMobilizarHoje: sim_(b.podeMobilizarHoje),
    nivelMobilidade: b.nivelMobilidade || '',
    progredirMobilidade: b.progredirMobilidade || '',
    justificativaNaoMobilizar: b.justificativaNaoMobilizar || '',
    familiaInformadaPlano: sim_(b.familiaInformadaPlano),
    presencaLesao: sim_(b.presencaLesao),
    localLesao: b.localLesao || '',
    grauLesao: b.grauLesao || '',
    barreiraPsicossocial: sim_(b.barreiraPsicossocial)
  };
}

function buildInfectionRows_(rows, round) {
  return rows.filter(function(i) { return i.suspeitaInfeccaoAtiva || i.nomeAntibiotico || i.provavelFoco; }).map(function(i) {
    return {
      idInfeccao: makeId_('INF'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(),
      suspeitaInfeccaoAtiva: i.suspeitaInfeccaoAtiva || 'Não',
      provavelFoco: i.provavelFoco || '',
      nomeAntibiotico: i.nomeAntibiotico || '',
      dataInicioAntibiotico: i.dataInicioAntibiotico || '',
      tempoTratamentoPrevistoDias: i.tempoTratamentoPrevistoDias || '',
      dataProvavelTerminoAntibiotico: addDaysIso_(i.dataInicioAntibiotico, i.tempoTratamentoPrevistoDias),
      tempoAntibioticoDias: daysBetween_(i.dataInicioAntibiotico, ''),
      melhoraParametrosInfeccao: i.melhoraParametrosInfeccao || '',
      condutaSemMelhora: i.condutaSemMelhora || ''
    };
  });
}

function buildAssistRow_(a, round) {
  return {
    idAssistencia: makeId_('AST'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(),
    viasAlimentacao: (a.viasAlimentacao || []).join(', '),
    tneDataInicio: a.tneDataInicio || '', tneVetPleno: a.tneVetPleno || '', tneAdequacaoPercentual: a.tneAdequacaoPercentual || '',
    tnpDataInicio: a.tnpDataInicio || '', tnpVetPleno: a.tnpVetPleno || '', tnpAdequacaoPercentual: a.tnpAdequacaoPercentual || '',
    npoDataInicio: a.npoDataInicio || '', npoDias: daysBetween_(a.npoDataInicio, ''),
    instabilidadeHemodinamica: a.instabilidadeHemodinamica || 'Não', instabilidadeUltimasHoras: a.instabilidadeUltimasHoras || 'Não',
    usoDrogaVasoativa: a.usoDrogaVasoativa || 'Não', aumentoDoseDrogaVasoativa: a.aumentoDoseDrogaVasoativa || 'Não', lactatoAlterado: a.lactatoAlterado || 'Não',
    suporteRespiratorio: a.suporteRespiratorio || '', modoVentilatorioAtual: a.modoVentilatorioAtual || '', dataInicioModoVentilatorio: a.dataInicioModoVentilatorio || '',
    diasModoVentilatorio: daysBetween_(a.dataInicioModoVentilatorio, ''), viaAerea: a.viaAerea || '', statusSuporteVentilatorio: a.statusSuporteVentilatorio || '',
    aumentoSuporteVentilatorio: a.aumentoSuporteVentilatorio || (a.statusSuporteVentilatorio === 'Aumentou' ? 'Sim' : 'Não'),
    pacienteEmHD: a.pacienteEmHD || 'Não', tipoHD: a.tipoHD || '', antibioticoEmUso: a.antibioticoEmUso || 'Não', ajusteAntibioticoDialise: a.ajusteAntibioticoDialise || '',
    pausaDialitica: a.pausaDialitica || 'Não', dataInicioPausaDialitica: a.dataInicioPausaDialitica || '', tempoPausaDialiticaDias: a.tempoPausaDialiticaDias || '',
    dataProvavelTerminoPausaDialitica: addDaysIso_(a.dataInicioPausaDialitica, a.tempoPausaDialiticaDias)
  };
}

function buildRiskRow_(r, round) {
  return {
    idRisco: makeId_('RSC'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(),
    riscoTEV: sim_(r.riscoTEV), riscoInfeccao: sim_(r.riscoInfeccao), riscoSangramento: sim_(r.riscoSangramento), riscoLPP: sim_(r.riscoLPP), riscoNutricional: sim_(r.riscoNutricional), riscoDelirium: sim_(r.riscoDelirium), riscoBroncoaspiracao: sim_(r.riscoBroncoaspiracao), riscoQueda: sim_(r.riscoQueda),
    profilaxiaTEV: sim_(r.profilaxiaTEV), profilaxiaLAMG: sim_(r.profilaxiaLAMG), outrosRiscos: r.outrosRiscos || ''
  };
}

function buildDeviceRows_(rows, round) {
  return rows.filter(function(d) { return d.tipoDispositivo; }).map(function(d) {
    return {
      idDispositivo: makeId_('DSP'), idPaciente: round.idPaciente, idRound: round.idRound, dataRegistro: nowIso_(),
      tipoDispositivo: d.tipoDispositivo || '', sitio: d.sitio || '', dataInsercao: d.dataInsercao || '', podeRetirarHoje: d.podeRetirarHoje || '', dataRetirada: d.dataRetirada || '', tempoDispositivoDias: daysBetween_(d.dataInsercao, d.dataRetirada), justificativaPermanencia: d.justificativaPermanencia || '', statusDispositivo: d.dataRetirada ? 'Retirado' : 'Ativo'
    };
  });
}

function generateAlerts_(idPaciente, idRound) {
  var data = readAll_();
  var p = data.Pacientes.find(function(x) { return x.idPaciente === idPaciente; }) || {};
  var r = data.Rounds.find(function(x) { return x.idRound === idRound; }) || {};
  var metas = data.Metas.filter(function(m) { return m.idRound === idRound; });
  var infs = data.Infeccao.filter(function(i) { return i.idRound === idRound; });
  var bundle = data.Bundle.filter(function(b) { return b.idRound === idRound; }).pop() || {};
  var ast = data.Assistencia.filter(function(a) { return a.idRound === idRound; }).pop() || {};
  var riscos = data.Riscos.filter(function(x) { return x.idRound === idRound; }).pop() || {};
  var devs = data.Dispositivos.filter(function(d) { return d.idRound === idRound; });
  var alerts = [], today = todayIso_();
  function isSim(v){ return v === true || String(v || '').toLowerCase() === 'sim'; }
  function activeDevice(d){ return (d.statusDispositivo || 'Ativo') === 'Ativo' && !d.dataRetirada; }
  function add(tipo,msg,grav,origem){ alerts.push(alertRow_(idPaciente, idRound, tipo, msg, grav, origem)); }
  if (!metas.length) add('Sem meta diária', 'Paciente sem meta de 24h registrada no round do dia.', 'Moderada', 'Metas');
  if (!p.previsaoAlta && Number(p.diasInternacao || daysBetween_(p.dataAdmissaoUnidade || p.dataAdmissaoHospitalar, '') || 0) > 10) add('Sem previsão de alta', 'Paciente ativo com permanência na unidade acima de 10 dias e sem previsão de alta.', 'Moderada', 'Pacientes');
  metas.forEach(function(m) { if (m.prazo && String(m.prazo) < today && String(m.status || '') === 'Pendente') add('Meta vencida', 'Meta vencida: ' + m.meta, 'Alta', 'Metas'); });
  infs.forEach(function(i) {
    if (isSim(ast.antibioticoEmUso) && Number(i.tempoAntibioticoDias || 0) > 7) add('Antibiótico > 7 dias', 'Antibiótico em uso há mais de 7 dias: ' + (i.nomeAntibiotico || 'não informado') + '.', 'Alta', 'Infecção');
    if (String(i.melhoraParametrosInfeccao || '') === 'Não') add('Sem melhora infecciosa', 'Infecção sem melhora dos parâmetros. Conduta: ' + (i.condutaSemMelhora || 'não registrada') + '.', 'Alta', 'Infecção');
  });
  var sed = String(bundle.justificativaNaoReducaoSedacao || '') + ' ' + String(bundle.outroJustificativaSedacao || '');
  if (/agit|autoextuba|delirium hiperativo/i.test(sed)) add('Agitação psicomotora', 'Justificativa para não reduzir sedação sugere agitação psicomotora ou risco de autoextubação.', 'Alta', 'Bundle ABCDEF');
  if (/Estágio IV|Grau IV|Não Classificável|Tissular Profunda/i.test(String(bundle.grauLesao || ''))) add('Lesão grave', 'Paciente com lesão ' + bundle.grauLesao + '.', 'Alta', 'Lesão');
  if (ast.aumentoSuporteVentilatorio === 'Sim' || ast.statusSuporteVentilatorio === 'Aumentou') add('Aumento suporte ventilatório', 'Aumento de suporte ventilatório registrado no round.', 'Alta', 'Respiratório');
  if (ast.instabilidadeHemodinamica === 'Sim' || ast.instabilidadeUltimasHoras === 'Sim' || (ast.usoDrogaVasoativa === 'Sim' && ast.aumentoDoseDrogaVasoativa === 'Sim') || ast.lactatoAlterado === 'Sim') add('Instabilidade hemodinâmica', 'Instabilidade hemodinâmica, droga vasoativa em aumento de dose ou lactato alterado.', 'Crítica', 'Hemodinâmica');
  if (ast.modoVentilatorioAtual === 'PCV' && Number(ast.diasModoVentilatorio || daysBetween_(ast.dataInicioModoVentilatorio, '') || 0) > 2) add('Tempo em PCV > 2 dias', 'Paciente em PCV acima de 2 dias.', 'Alta', 'Respiratório');
  if (ast.tneDataInicio && ast.tneVetPleno === 'Não' && Number(daysBetween_(ast.tneDataInicio, '')) > 3) add('VET pleno não atendido > 3 dias', 'TNE sem VET pleno acima de 3 dias.', 'Moderada', 'Alimentação');
  if (ast.tnpDataInicio && ast.tnpVetPleno === 'Não' && Number(daysBetween_(ast.tnpDataInicio, '')) > 3) add('VET pleno não atendido > 3 dias', 'TNP sem VET pleno acima de 3 dias.', 'Moderada', 'Alimentação');
  var dietaZeroAtiva = /Dieta Zero|NPO/i.test(String(ast.viasAlimentacao || '')) || !!ast.npoDataInicio;
  var dietaZeroDias = Number(ast.npoDias || daysBetween_(ast.npoDataInicio, '') || 0);
  if (dietaZeroAtiva && dietaZeroDias > 3) add('Dieta zero >3dias', 'Paciente em dieta zero acima de 3 dias.', 'Alta', 'Alimentação');
  var limits = { TOT: 7, CVC: 7, CVD: 7, SVD: 7, SNE: 30, SNG: 30, PAI: 5, Dreno: 7, CDL: 7, TQT: 30 };
  devs.forEach(function(d) {
    var tipo = d.tipoDispositivo || '', t = Number(d.tempoDispositivoDias || daysBetween_(d.dataInsercao, d.dataRetirada) || 0);
    if (activeDevice(d) && !d.justificativaPermanencia) add('Dispositivo sem justificativa', tipo + ' ativo sem justificativa de permanência.', 'Alta', 'Dispositivos');
    if (activeDevice(d) && limits[tipo] && t > limits[tipo]) add('Dispositivo prolongado', tipo + ' ativo há ' + t + ' dias, acima do parâmetro de ' + limits[tipo] + ' dias.', 'Moderada', 'Dispositivos');
    if (d.podeRetirarHoje === 'Sim') add('Retirada de dispositivo', tipo + ' com resposta Pode retirar? = Sim. Programar retirada no dia.', 'Alta', 'Dispositivos');
  });
  if (riscos.riscoTEV === 'Sim' && riscos.profilaxiaTEV !== 'Sim') add('TEV sem profilaxia', 'Risco TEV sem profilaxia registrada.', 'Alta', 'Riscos');
  var fresh = alerts.filter(function(a) { return !data.Alertas.some(function(e) { return e.idPaciente === a.idPaciente && e.idRound === a.idRound && e.tipoAlerta === a.tipoAlerta && e.status === 'Ativo'; }); });
  appendRows_('Alertas', fresh);
}

function rebuildAlerts_() {
  var data = readTables_(['Rounds']);
  data.Rounds.forEach(function(r) {
    if (r.idPaciente && r.idRound) generateAlerts_(r.idPaciente, r.idRound);
  });
}

function alertRow_(idPaciente, idRound, tipo, mensagem, gravidade, origem) {
  return { idAlerta: makeId_('ALT'), idPaciente: idPaciente, idRound: idRound, dataAlerta: nowIso_(), tipoAlerta: tipo, mensagem: mensagem, gravidade: gravidade, status: 'Ativo', origem: origem, dataResolucao: '' };
}

function enrichPatients_(data) {
  return data.Pacientes.filter(function(p) { return !p.statusPaciente || p.statusPaciente === 'Ativo'; }).map(function(p) {
    var rounds = data.Rounds.filter(function(r) { return r.idPaciente === p.idPaciente; }).sort(function(a, b) { return String(b.dataRegistro).localeCompare(String(a.dataRegistro)); });
    var latest = rounds[0] || {};
    var metas = latestRoundGoals_(data.Metas, latest.idRound);
    var pendenciasMetas = metas.filter(function(m) { return String(m.status || '').trim() !== 'Concluída'; })
      .map(function(m) { return [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | '); });
    var pendencias = [];
    if (pendenciasMetas.length) pendencias.push('Metas pendentes:\n' + pendenciasMetas.join('\n'));
    if (latest.pendencias) pendencias.push('Pendências do round:\n' + latest.pendencias);
    var risco = data.Riscos.filter(function(r) { return r.idPaciente === p.idPaciente; }).pop() || {};
    var alerts = data.Alertas.filter(function(a) { return a.idPaciente === p.idPaciente && a.status === 'Ativo' && a.idRound; });
    var devs = data.Dispositivos.filter(function(d) { return d.idPaciente === p.idPaciente && d.statusDispositivo === 'Ativo'; });
    p.statusRound = latest.statusRound || 'Não iniciado';
    p.evolucaoPaciente = latest.evolucaoPaciente || 'Estável';
    p.pendenciasResumo = pendencias.join('\n\n');
    p.metasResumo = metas.map(function(m) { return [m.meta, m.prazo, m.responsavel, m.status].filter(Boolean).join(' | '); }).join('\n');
    p.riscosAtivos = riskLabels_(risco).join(', ');
    p.alertasAtivos = alerts.map(function(a) { return a.tipoAlerta; }).join(', ');
    p.alertasDetalhes = alerts;
    p.dispositivosResumo = devs.map(function(d) { return d.tipoDispositivo + ': ' + (d.tempoDispositivoDias || 0) + 'd'; }).join(' | ');
    p.tempoCVC = maxDeviceDays_(devs, ['CVC']);
    p.tempoSVD = maxDeviceDays_(devs, ['SVD', 'CVD']);
    return p;
  });
}

function enrichAlerts_(alerts, patients) {
  return alerts.filter(function(a) { return a.status === 'Ativo'; }).map(function(a) {
    var p = patients.find(function(x) { return x.idPaciente === a.idPaciente; }) || {};
    if (!p.idPaciente) return null;
    if (p.statusPaciente && p.statusPaciente !== 'Ativo') return null;
    a.nomePaciente = p.nomePaciente || '';
    a.leito = p.leito || '';
    a.unidade = p.unidade || '';
    return a;
  }).filter(Boolean);
}

function buildDashboard_(patients, rounds, metas, devices, risks, alerts, bundles, assistencias) {
  bundles = bundles || [];
  assistencias = assistencias || [];
  var finished = rounds.filter(function(r) { return r.statusRound === 'Finalizado'; });
  var done = metas.filter(function(m) { return m.status === 'Concluída'; });
  var activeDevices = devices.filter(function(d) { return d.statusDispositivo === 'Ativo'; });
  var patientWithDevice = unique_(activeDevices.map(function(d) { return d.idPaciente; })).length;
  var cvc = unique_(activeDevices.filter(function(d) { return d.tipoDispositivo === 'CVC'; }).map(function(d) { return d.idPaciente; })).length;
  var svd = unique_(activeDevices.filter(function(d) { return d.tipoDispositivo === 'SVD' || d.tipoDispositivo === 'CVD'; }).map(function(d) { return d.idPaciente; })).length;
  var vm = patients.filter(function(p) { return Number(p.tempoVMDias || 0) > 0; }).length;
  var tev = risks.filter(function(r) { return r.riscoTEV === 'Sim'; });
  var tevOk = tev.filter(function(r) { return r.profilaxiaTEV === 'Sim'; });
  var groups = {};
  alerts.forEach(function(a) {
    if (!groups[a.tipoAlerta]) groups[a.tipoAlerta] = { tipo: a.tipoAlerta, quantidade: 0, pacientes: [] };
    groups[a.tipoAlerta].quantidade++;
    groups[a.tipoAlerta].pacientes.push([a.leito, a.nomePaciente].filter(Boolean).join(' - '));
  });
  var teamGroups = {};
  rounds.forEach(function(r) {
    String(r.equipesPresentes || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean).forEach(function(team) {
      if (!teamGroups[team]) teamGroups[team] = { equipe: team, quantidade: 0 };
      teamGroups[team].quantidade++;
    });
  });
  var sedationGroups = {};
  bundles.forEach(function(b) {
    if (b.podeReduzirSedacao === 'Sim') return;
    if (b.podeReduzirSedacao === 'Não se aplica') return;
    var reason = b.justificativaNaoReducaoSedacao || '';
    if (reason === 'Outro' && b.outroJustificativaSedacao) reason = 'Outro: ' + b.outroJustificativaSedacao;
    if (!reason) return;
    if (!sedationGroups[reason]) sedationGroups[reason] = { justificativa: reason, quantidade: 0 };
    sedationGroups[reason].quantidade++;
  });
  var patientIds = patients.map(function(p) { return p.idPaciente; });
  var pcvRows = assistencias.filter(function(a) {
    return a.modoVentilatorioAtual === 'PCV' && patientIds.indexOf(a.idPaciente) !== -1;
  }).map(function(a) {
    var p = patients.find(function(x) { return x.idPaciente === a.idPaciente; }) || {};
    return {
      paciente: [p.leito, p.nomePaciente].filter(Boolean).join(' - ') || a.idPaciente,
      dias: Number(a.diasModoVentilatorio || daysBetween_(a.dataInicioModoVentilatorio, '') || 0)
    };
  }).sort(function(a, b) { return b.dias - a.dias; });
  return {
    totalPacientesAtivos: patients.length,
    indicadores: {
      taxaRound: pct_(finished.length, Math.max(patients.length, 1)),
      metasConcluidas: pct_(done.length, Math.max(metas.length, 1)),
      taxaDispositivos: pct_(patientWithDevice, Math.max(patients.length, 1)),
      taxaCVC: pct_(cvc, Math.max(patients.length, 1)),
      taxaSVD: pct_(svd, Math.max(patients.length, 1)),
      taxaVM: pct_(vm, Math.max(patients.length, 1)),
      tempoMedioUnidade: avg_(patients.map(function(p) { return Number(p.diasInternacao || 0); })),
      tempoMedioVM: avg_(patients.map(function(p) { return Number(p.tempoVMDias || 0); })),
      profilaxiaTEV: pct_(tevOk.length, Math.max(tev.length, 1)),
      tempoMedioRound: avg_(finished.map(function(r) { return Number(r.tempoRoundMinutos || 0); }))
    },
    gruposAlertas: Object.keys(groups).map(function(k) { return groups[k]; }),
    participacaoEquipe: Object.keys(teamGroups).map(function(k) { return teamGroups[k]; }),
    justificativasSedacao: Object.keys(sedationGroups).map(function(k) { return sedationGroups[k]; }),
    tempoPCV: pcvRows
  };
}

function ensureDatabase_(force) {
  var ss = getSpreadsheet_();
  var readyKey = 'ROUND_UTI_SCHEMA_READY_V6_' + ss.getId();
  if (!force && APP_READY) return ss;
  if (!force && PropertiesService.getDocumentProperties().getProperty(readyKey) === '1') {
    APP_READY = true;
    return ss;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    Object.keys(SCHEMAS).forEach(function(name) {
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);
      var headers = SCHEMAS[name];
      if (sh.getLastRow() === 0) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
      } else {
        var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
        headers.forEach(function(h) { if (current.indexOf(h) === -1) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
      }
    });
    APP_READY = true;
    PropertiesService.getDocumentProperties().setProperty(readyKey, '1');
    SpreadsheetApp.flush();
    return ss;
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abra este projeto por Extensões > Apps Script dentro da planilha usada como banco.');
  return ss;
}

function readAll_() {
  return readTables_(Object.keys(SCHEMAS));
}

function readTables_(names) {
  var out = {};
  names.forEach(function(n) { out[n] = readTable_(n); });
  return out;
}

function readTable_(name) {
  var sh = getSpreadsheet_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues().map(function(row, i) {
    var o = { _row: i + 2 };
    h.forEach(function(k, c) { o[k] = normalizeCellValue_(row[c]); });
    return o;
  });
}

function appendRows_(name, rows) {
  rows = (rows || []).filter(Boolean);
  if (!rows.length) return;
  var sh = getSpreadsheet_().getSheetByName(name);
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = rows.map(function(r) { return h.map(function(k) { return r[k] !== undefined ? r[k] : ''; }); });
  sh.getRange(sh.getLastRow() + 1, 1, values.length, h.length).setValues(values);
}

function updateById_(name, idField, idValue, patch) {
  var sh = getSpreadsheet_().getSheetByName(name);
  var rows = readTable_(name);
  var row = rows.find(function(r) { return String(r[idField]) === String(idValue); });
  if (!row) return null;
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(patch).forEach(function(k) { row[k] = patch[k]; });
  sh.getRange(row._row, 1, 1, h.length).setValues([h.map(function(k) { return row[k] !== undefined ? row[k] : ''; })]);
  return row;
}

function upsertRound_(round, patch) {
  round = round || {};
  patch = patch || {};
  var idRound = round.idRound || patch.idRound;
  if (!idRound || !round.idPaciente) throw new Error('Round inválido para gravação.');
  var updated = updateById_('Rounds', 'idRound', idRound, patch);
  if (updated) return updated;
  var created = {
    idRound: idRound,
    idPaciente: round.idPaciente,
    dataRound: round.dataRound || todayIso_(),
    equipesPresentes: patch.equipesPresentes || round.equipesPresentes || '',
    horarioInicioRound: round.horarioInicioRound || nowIso_(),
    horarioTerminoRound: patch.horarioTerminoRound || '',
    tempoRoundMinutos: patch.tempoRoundMinutos || '',
    statusRound: patch.statusRound || 'Em andamento',
    problemaAtivoPrincipal: patch.problemaAtivoPrincipal || '',
    barreirasAlta: patch.barreirasAlta || '',
    condutaDefinida: patch.condutaDefinida || '',
    evolucaoPaciente: patch.evolucaoPaciente || 'Estável',
    pendencias: patch.pendencias || '',
    dataRegistro: patch.dataRegistro || nowIso_()
  };
  appendRows_('Rounds', [created]);
  return created;
}

function replaceRoundRows_(name, idRound, rows) {
  var sh = getSpreadsheet_().getSheetByName(name);
  var current = readTable_(name);
  var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var kept = current.filter(function(r) { return String(r.idRound) !== String(idRound); });
  var next = kept.concat(rows || []);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, h.length).clearContent();
  if (!next.length) return;
  var values = next.map(function(r) { return h.map(function(k) { return r[k] !== undefined ? r[k] : ''; }); });
  sh.getRange(2, 1, values.length, h.length).setValues(values);
}

function verifyRoundSaved_(idRound) {
  var ss = getSpreadsheet_();
  var names = ['Rounds', 'Metas', 'Bundle', 'Infeccao', 'Assistencia', 'Riscos', 'Dispositivos', 'Alertas'];
  var out = { idRound: idRound, planilha: ss.getName(), urlPlanilha: ss.getUrl(), contagens: {} };
  names.forEach(function(name) {
    out.contagens[name] = readTable_(name).filter(function(r) {
      return String(r.idRound) === String(idRound);
    }).length;
  });
  return out;
}

function withWriteLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

function logRecord_(acao, entidade, idEntidade, detalhes) {
  return { idLog: makeId_('LOG'), dataHora: nowIso_(), acao: acao || '', entidade: entidade || '', idEntidade: idEntidade || '', detalhes: detalhes || '' };
}

function riskLabels_(r) {
  return [['riscoTEV', 'TEV'], ['riscoInfeccao', 'Infecção'], ['riscoSangramento', 'Sangramento'], ['riscoLPP', 'LPP'], ['riscoNutricional', 'Nutricional'], ['riscoDelirium', 'Delirium'], ['riscoBroncoaspiracao', 'Broncoaspiração'], ['riscoQueda', 'Queda']]
    .filter(function(x) { return r[x[0]] === 'Sim'; }).map(function(x) { return x[1]; });
}

function activePatientGoals_(metas, idPaciente) {
  var latestByText = {};
  metas
    .filter(function(m) { return m.idPaciente === idPaciente && m.meta; })
    .sort(function(a, b) { return String(a.dataRegistro).localeCompare(String(b.dataRegistro)); })
    .forEach(function(m) {
      latestByText[String(m.meta).trim()] = m;
    });
  return Object.keys(latestByText)
    .map(function(k) { return latestByText[k]; })
    .filter(function(m) { return String(m.status || '').trim() !== 'Concluída'; })
    .sort(function(a, b) { return String(a.prazo || '').localeCompare(String(b.prazo || '')); });
}

function latestRoundGoals_(metas, idRound) {
  if (!idRound) return [];
  return metas
    .filter(function(m) { return m.idRound === idRound && m.meta; })
    .sort(function(a, b) { return String(a.prazo || '').localeCompare(String(b.prazo || '')); });
}

function maxDeviceDays_(devices, types) {
  return Math.max.apply(null, [0].concat(devices.filter(function(d) { return types.indexOf(d.tipoDispositivo) !== -1; }).map(function(d) { return Number(d.tempoDispositivoDias || 0); })));
}

function nowIso_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function todayIso_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function makeId_(prefix) { return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }
function sim_(value) { return value === true || value === 'Sim' || value === 'true' || value === '1' ? 'Sim' : 'Não'; }
function status3_(value) {
  if (value === 'Não se aplica' || value === 'Não se Aplica') return 'Não se Aplica';
  return sim_(value);
}
function daysBetween_(start, end) {
  if (!start) return '';
  var a = new Date(start);
  var b = end ? new Date(end) : new Date();
  if (isNaN(a.getTime())) return '';
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}
function addDaysIso_(dateValue, days) {
  if (!dateValue || !days) return '';
  var d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(days));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function avg_(values) {
  values = values.filter(function(n) { return n > 0; });
  if (!values.length) return 0;
  return Math.round(values.reduce(function(a, b) { return a + b; }, 0) / values.length);
}
function pct_(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function unique_(values) {
  var out = [];
  values.forEach(function(v) { if (out.indexOf(v) === -1) out.push(v); });
  return out;
}

function normalizeCellValue_(value) {
  if (Object.prototype.toString.call(value) !== '[object Date]') return value;
  if (isNaN(value.getTime())) return '';
  var tz = Session.getScriptTimeZone();
  var hhmmss = Utilities.formatDate(value, tz, 'HH:mm:ss');
  if (hhmmss === '00:00:00') return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  return Utilities.formatDate(value, tz, 'yyyy-MM-dd HH:mm:ss');
}

function normalizeForClient_(value) {
  if (value === null || value === undefined) return value;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if (Array.isArray(value)) {
    return value.map(function(v) { return normalizeForClient_(v); });
  }
  if (typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function(k) {
      if (k === '_row') return;
      out[k] = normalizeForClient_(value[k]);
    });
    return out;
  }
  return value;
}