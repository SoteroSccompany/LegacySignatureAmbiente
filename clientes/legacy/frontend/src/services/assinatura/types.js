import { NEXT_STEP } from "../identity/types";

// Espelho de statusBiometriaAssinatura (api/certs/index.js) — não são strings, são números.
// 'otp' é a única etapa em string (desafio de assinatura ainda não confirmado).
export const ETAPA_SESSAO = {
  OTP: "otp",
  AGUARDANDO_IMAGEM: 0,
  AGUARDANDO_VALIDACAO: 1,
  VALIDADO: 2,
  NEGADO: 3,
};

// carregarProgressoSessao devolve etapa como número (coluna do MySQL) — alguns
// drivers/versões podem entregar string ("0".."3"). Normaliza antes do ===.
export const normalizarEtapa = (etapa) => {
  if (etapa === null || etapa === undefined) return null;
  if (etapa === ETAPA_SESSAO.OTP) return ETAPA_SESSAO.OTP;
  const numero = Number(etapa);
  return Number.isNaN(numero) ? etapa : numero;
};

// As mensagens abaixo são exatamente as strings devolvidas pelos use cases reais
// (createAssinaturaUseCase / createAssinatura / createPerfilBiometriaUseCase).
// Servem para decidir para onde desviar o fluxo quando a API recusa uma etapa.
export const precisaAceitarTermoDocumento = (msg = "") =>
  /termo de responsabilidade n[aã]o aceito, aceite o termo/i.test(msg);

// sessaoAssinatura (POST /sessao) recusa abrir uma 2ª sessão enquanto a
// identificação anterior ainda está viva — reconsultar o progresso em vez de
// tratar como erro final, pois a sessão em andamento é a fonte de verdade.
// Mensagem real do use case: "Sessão de assinatura já em andamento."
export const sessaoEmAndamento = (msg = "") =>
  /sess[aã]o de assinatura j[aá] em andamento/i.test(msg);

// confirmarRecebimento (POST confirmarFoto) expira a janela da identificação
// específica — some da tela e some do desafio, mas a sessão do usuário continua
// válida. Diferente da "Sessão expirada, faça login novamente." (essa sim
// mapeada em sessaoExpirada, em assinatura/api.js).
export const sessaoAssinaturaExpirada = (msg = "") =>
  /sess[aã]o de assinatura expirada/i.test(msg);

export const precisaCadastrarBiometriaPerfil = (msg = "") =>
  /biometria n[aã]o cadastrada/i.test(msg);

// Mensagens de createPerfilBiometriaUseCase.solicitacaoPerfilBiometria — decidem
// a fase do onboarding sem depender de sempre mostrar o termo primeiro.
export const precisaAceitarTermoFoto = (msg = "") =>
  /termo de responsabilidade n[aã]o aceito pelo usu[aá]rio/i.test(msg);

// Só o caso realmente APROVADO de solicitacaoPerfilBiometria ("Perfil de já
// cadastro e aprovado." — typo do use case). O regex antigo casava qualquer
// msg com "reconhecimento facial", tratando foto pendente de aprovação como
// aprovada e devolvendo o usuário pra cerimônia sem biometria válida.
export const fotoPerfilJaCadastrada = (msg = "") =>
  /perfil de j[aá] cadastr(?:o|ado) e aprovado/i.test(msg);

// Foto de referência já registrada mas AINDA NÃO aprovada: as variantes
// "Perfil de usuário já cadastrado e registrado o reconhecimento facial."
// (base, ".1" e ".2") só saem depois do check de aprovado no use case —
// logo aqui é sempre pendência de validação do administrador.
export const fotoPerfilAguardandoAprovacao = (msg = "") =>
  /j[aá] cadastrado e registrado o reconhecimento facial/i.test(msg);

// #biometriaCadastrada: linha de biometria existe mas sem embedding e sem foto
// no WIP — não há o que o usuário fazer sozinho; reabrir o onboarding só
// recusaria de novo. O hub mostra orientação de suporte em vez de erro genérico.
export const biometriaIncompletaSuporte = (msg = "") =>
  /cadastro biom[eé]trico incompleto/i.test(msg);

// Regex apertado de propósito: "Perfil de usuário já cadastrado e registrado
// o reconhecimento facial." (e variantes ".1"/".2" de createPerfilBiometriaUseCase)
// também batiam aqui antes, mandando quem já tem perfil de volta pro
// /onboarding/perfil — que recusa (perfil já existe) e joga pra "/", fechando
// um loop infinito com o hub de assinatura. Só "não cadastrado" é ausência real.
export const perfilNaoCadastrado = (msg = "") =>
  /perfil de usu[aá]rio\s*n[aã]o cadastrado/i.test(msg);

export const precisaConcluirOnboardingPainel = (msg = "") =>
  /redefini[cç][aã]o de senha|autentica[cç][aã]o de dois fatores|perfil n[aã]o cadastrado|complete seu cadastro de perfil/i.test(
    msg
  );

// Só existe na cerimônia de assinatura (não é um NEXT_STEP de login) — o back
// devolve como data.next_step junto com data.termo_id.
export const NEXT_STEP_ACEITAR_TERMO = "ACEITAR_TERMO";

const NEXT_STEP_PAINEL = new Set([
  NEXT_STEP.REDEFINIR_SENHA,
  NEXT_STEP.SETUP_2FA,
  NEXT_STEP.LOGIN_2FA,
  NEXT_STEP.CRIAR_PERFIL,
]);

// Único ponto que decide para onde a cerimônia desvia. Prefere o código
// estruturado (data.next_step), acrescentado pelos use cases de Assinatura —
// os regex acima ficam só de fallback para respostas que ainda não o anotam.
// tipo: "painel" | "biometria" | "termo" | "suporte" | null (nada a desviar).
export const resolverDesvioQualificacao = (resp) => {
  const nextStep = resp?.data?.next_step;
  if (nextStep === NEXT_STEP.CADASTRAR_BIOMETRIA) return { tipo: "biometria" };
  if (nextStep === NEXT_STEP_ACEITAR_TERMO) {
    return { tipo: "termo", termoId: resp?.data?.termo_id || null, documentoId: resp?.data?.documento_id || null };
  }
  if (nextStep && NEXT_STEP_PAINEL.has(nextStep)) return { tipo: "painel", nextStep };
  if (biometriaIncompletaSuporte(resp?.msg)) return { tipo: "suporte" };
  if (precisaCadastrarBiometriaPerfil(resp?.msg)) return { tipo: "biometria" };
  if (precisaAceitarTermoDocumento(resp?.msg)) {
    return { tipo: "termo", termoId: resp?.data?.termo_id || null, documentoId: resp?.data?.documento_id || null };
  }
  if (precisaConcluirOnboardingPainel(resp?.msg)) return { tipo: "painel", nextStep: null };
  return null;
};
