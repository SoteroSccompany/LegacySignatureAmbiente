import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import { formatDateAnTime } from "../../Common";
import { jsonConfig } from "../../Config";
import { conection } from "../../utils";

const truncHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-10)}` : "—");

const statusSignatarioLabel = {
  SIGNED: "Assinado",
  PENDING: "Pendente",
  PROCESSING: "Processando",
  ERROR: "Erro",
  AGUARDANDO_ONBOARDING: "Aguardando cadastro",
};

const rotuloEvento = {
  SOLICITACAO_CRIADA: "Solicitação criada",
  SOLICITACAO_CONFIRMADA: "Solicitação confirmada",
  DOCUMENTO_RECEBIDO: "Documento recebido",
  SIGNATARIO_ADICIONADO: "Signatário adicionado",
  DEMARCACAO_DEFINIDA: "Área de assinatura definida",
  DOCUMENTO_PRONTO_ASSINATURA: "Documento pronto para assinatura",
  ACEITE_TERMO_REGISTRADO: "Termo de responsabilidade aceito",
  SESSAO_ASSINATURA_ABERTA: "Sessão de assinatura iniciada",
  SESSAO_ASSINATURA_CONFIRMADA: "Sessão de assinatura confirmada",
  BIOMETRIA_RECEBIDA: "Biometria recebida",
  BIOMETRIA_VALIDADA: "Biometria validada",
  BIOMETRIA_NEGADA: "Biometria não conferiu",
  ESTAMPA_SOLICITADA: "Estampa solicitada",
  ASSINATURA_SOLICITADA: "Assinatura solicitada",
  ASSINATURA_APLICADA: "Assinatura aplicada",
  FOLHA_AUDITORIA_GERADA: "Folha de auditoria gerada",
  DOCUMENTO_SELADO: "Documento selado",
  DOCUMENTO_VALIDACAO_SOLICITADA: "Validação do arquivo",
};

const rotuloObjeto = {
  SOLICITACAO: "Solicitação",
  DOCUMENTO: "Documento",
  SIGNATARIO: "Signatário",
  DEMARCACAO: "Área de assinatura",
  ACEITE_TERMO: "Aceite de termo",
  DESAFIO_AUTENTICACAO: "Autenticação",
  IDENTIFICACAO_BIOMETRICA: "Identificação biométrica",
  EVENTO: "Evento",
  DOCUMENTO_VALIDACAO: "Validação do documento",
};

const rotuloVeredito = {
  INTEGRO: "O arquivo confere com este documento",
  DIVERGENTE: "O arquivo não confere com este documento",
  NAO_ENCONTRADO: "Este arquivo não foi encontrado na trilha do documento",
};

const humanizarChave = (valor, mapa) => {
  if (!valor || typeof valor !== "string") return "";
  if (mapa[valor]) return mapa[valor];
  if (!/^[A-Z0-9_]+$/.test(valor)) return valor;
  const pretty = valor.toLowerCase().replace(/_/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
};

const rotuloTipoEvento = (valor) => humanizarChave(valor, rotuloEvento) || "—";

const rotuloTipoObjeto = (item) => {
  if (!item || typeof item !== "object") return "";
  const bruto =
    item.objeto_tipo ||
    (typeof item.objeto === "string" ? item.objeto : item.objeto?.tipo) ||
    item.objeto_nome ||
    "";
  return humanizarChave(bruto, rotuloObjeto);
};

const dataElo = (item) =>
  item?.criado_em || item?.data || item?.data_criacao || null;

const rotuloHashConferido = (hash) => {
  if (!hash) return "";
  if (hash === "original" || hash === "hash_original") {
    return "Hash original do documento";
  }
  if (hash === "final" || hash === "hash_final") {
    return "Hash final do documento";
  }
  if (hash === "elo" || hash === "hash_documento_final") {
    return "Hash de um passo da trilha";
  }
  return truncHash(hash);
};

const ehPdf = (file) => {
  if (!file) return false;
  if (file.type === "application/pdf") return true;
  return file.name?.toLowerCase().endsWith(".pdf");
};

const ordenarTrilha = (trilha) => {
  if (!Array.isArray(trilha) || trilha.length === 0) return [];
  return [...trilha].sort(
    (a, b) => Number(a?.sequencia) - Number(b?.sequencia)
  );
};

// Portal público de validação do código impresso na estampa do PDF.
// Sem login: consome GET /verificar/:codigo na raiz da API.
const Verificar = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useState(codigo || "");
  const [cert, setCert] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [validacao, setValidacao] = useState(null);
  const [validacaoErro, setValidacaoErro] = useState("");
  const [validandoArquivo, setValidandoArquivo] = useState(false);

  const consultar = useCallback(async (cod) => {
    if (!cod) return;
    setLoading(true);
    setErro("");
    setCert(null);
    setValidacao(null);
    setValidacaoErro("");
    try {
      // profundo=false: resposta rápida; a prova estrutural é suficiente p/ o portal
      const { data } = await conection
        .raiz()
        .get(`/verificar/${encodeURIComponent(cod)}?profundo=false`);
      setCert(data?.data);
    } catch (err) {
      setErro(
        err?.response?.data?.msg ||
          "Não foi possível validar este código. Confira e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (codigo) consultar(codigo);
  }, [codigo, consultar]);

  const submeter = (e) => {
    e.preventDefault();
    const cod = busca.trim();
    if (!cod) return;
    navigate(`/verificar/${encodeURIComponent(cod)}`, { replace: true });
    consultar(cod);
  };

  const escolherArquivo = (e) => {
    const file = e.target.files?.[0];
    setValidacao(null);
    setValidacaoErro("");
    if (!file) {
      setArquivo(null);
      return;
    }
    if (!ehPdf(file)) {
      setArquivo(null);
      setValidacaoErro("Envie um arquivo PDF.");
      e.target.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setArquivo(null);
      setValidacaoErro("O arquivo não pode ser maior que 20 MB.");
      e.target.value = "";
      return;
    }
    setArquivo(file);
  };

  const validarArquivo = async (e) => {
    e.preventDefault();
    const cod = (codigo || busca).trim();
    if (!cod || !arquivo) return;
    if (!ehPdf(arquivo)) {
      setValidacao(null);
      setValidacaoErro("Envie um arquivo PDF.");
      return;
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      setValidacao(null);
      setValidacaoErro("O arquivo não pode ser maior que 20 MB.");
      return;
    }
    setValidandoArquivo(true);
    setValidacao(null);
    setValidacaoErro("");
    try {
      const bytes = await arquivo.arrayBuffer();
      // Body cru (express.raw): sem FormData. CSRF/apikey/cookies vêm do interceptor.
      const { data } = await conection
        .raiz()
        .post(`/verificar/${encodeURIComponent(cod)}/documento`, bytes, {
          headers: { "Content-Type": "application/pdf" },
          transformRequest: [(body) => body],
        });
      if (data?.data?.veredito) {
        setValidacao(data.data);
        if (!data.status) setValidacaoErro(data.msg || "");
      } else if (!data?.status) {
        setValidacaoErro(
          data?.msg || "Não foi possível validar o arquivo. Tente novamente."
        );
      } else {
        setValidacao(data?.data || null);
      }
    } catch (err) {
      const payload = err?.response?.data;
      if (payload?.data?.veredito) {
        setValidacao(payload.data);
        setValidacaoErro(payload.msg || "");
      } else {
        setValidacaoErro(
          payload?.msg ||
            "Não foi possível validar o arquivo. Confira o código e tente novamente."
        );
      }
    } finally {
      setValidandoArquivo(false);
    }
  };

  const integro = cert?.veredito_geral === "INTEGRO";
  const codigoAlvo = (codigo || busca).trim();
  const trilhaAssinatura = ordenarTrilha(cert?.trilha_assinatura);
  const vereditoArquivo = validacao?.veredito;
  const arquivoIntegro = vereditoArquivo === "INTEGRO";
  const arquivoDivergente = vereditoArquivo === "DIVERGENTE";

  return (
    <div className="min-h-screen bg-brand-mist flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-5">
        <p className="text-[11px] tracking-[0.22em] uppercase text-brand-mute m-0">
          {jsonConfig.brand.nameSoftware}
        </p>
        <h1 className="font-display text-xl font-bold m-0 mt-1">
          Portal de validação de documentos
        </h1>
        <p className="text-sm text-brand-mute-soft m-0 mt-1">
          Confirme a autenticidade de um documento pelo código de verificação
          impresso na estampa de assinatura.
        </p>
      </header>
      <div className="h-1 bg-gradient-to-r from-brand-teal via-brand-teal-light to-brand-navy" />

      <main className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-6">
        <form
          onSubmit={submeter}
          className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm flex flex-col sm:flex-row gap-3"
        >
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Código de verificação (ex.: A1B2-C3D4-E5F6)"
            className="flex-1 rounded-brand border border-gray-200 px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <button
            type="submit"
            disabled={loading || !busca.trim()}
            className="inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-brand"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            {loading ? "Validando…" : "Validar"}
          </button>
        </form>

        <form
          onSubmit={validarArquivo}
          className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm space-y-3"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
            Conferir o PDF
          </h3>
          <p className="text-sm text-brand-ink m-0">
            Envie o arquivo que você recebeu para confirmar se ele é o mesmo
            documento deste código.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus-within:ring-2 focus-within:ring-brand-teal bg-white cursor-pointer flex items-center gap-2 min-w-0">
              <DocumentArrowUpIcon className="w-4 h-4 text-brand-teal shrink-0" />
              <span className="truncate text-brand-navy">
                {arquivo ? arquivo.name : "Selecionar PDF"}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={escolherArquivo}
              />
            </label>
            <button
              type="submit"
              disabled={validandoArquivo || !codigoAlvo || !arquivo}
              className="inline-flex items-center justify-center gap-2 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-brand"
            >
              {validandoArquivo ? "Conferindo…" : "Validar arquivo"}
            </button>
          </div>
          {arquivo && (
            <p className="text-xs text-brand-soft m-0">
              {(arquivo.size / 1024).toFixed(1)} KB
            </p>
          )}
        </form>

        {validacaoErro && !validacao && (
          <div className="bg-rose-50 border border-rose-200 rounded-brand p-5 flex items-start gap-3">
            <ShieldExclamationIcon className="w-8 h-8 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-800 m-0">
                Arquivo não validado
              </p>
              <p className="text-sm text-brand-ink m-0 mt-1">{validacaoErro}</p>
            </div>
          </div>
        )}

        {validacao && (
          <div
            className={`rounded-brand p-5 border shadow-sm flex items-start gap-4 ${
              arquivoIntegro
                ? "bg-emerald-50 border-emerald-200"
                : arquivoDivergente
                  ? "bg-rose-50 border-rose-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            {arquivoIntegro ? (
              <ShieldCheckIcon className="w-10 h-10 text-emerald-600 shrink-0" />
            ) : (
              <ShieldExclamationIcon
                className={`w-10 h-10 shrink-0 ${
                  arquivoDivergente ? "text-rose-600" : "text-amber-600"
                }`}
              />
            )}
            <div>
              <p
                className={`text-lg font-bold m-0 ${
                  arquivoIntegro
                    ? "text-emerald-800"
                    : arquivoDivergente
                      ? "text-rose-800"
                      : "text-amber-800"
                }`}
              >
                {rotuloVeredito[vereditoArquivo] ||
                  validacaoErro ||
                  "Resultado da conferência do arquivo"}
              </p>
              {(validacaoErro || validacao.msg) && (
                <p className="text-sm text-brand-ink m-0 mt-1">
                  {validacaoErro || validacao.msg}
                </p>
              )}
              <dl className="m-0 mt-3 space-y-1 text-xs text-brand-ink">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Hash do arquivo enviado</dt>
                  <dd
                    className="m-0 font-mono"
                    title={validacao.hash_documento_enviado}
                  >
                    {truncHash(validacao.hash_documento_enviado)}
                  </dd>
                </div>
                {validacao.hash_conferido_com && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-soft">Conferiu com</dt>
                    <dd
                      className="m-0 font-mono text-right"
                      title={validacao.hash_conferido_com}
                    >
                      {rotuloHashConferido(validacao.hash_conferido_com)}
                    </dd>
                  </div>
                )}
                {validacao.elo && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-soft">Passo da trilha</dt>
                    <dd className="m-0 text-right">
                      {validacao.elo.sequencia != null
                        ? `${validacao.elo.sequencia}`
                        : "—"}
                      {validacao.elo.tipo_evento
                        ? ` · ${rotuloTipoEvento(validacao.elo.tipo_evento)}`
                        : ""}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {erro && (
          <div className="bg-rose-50 border border-rose-200 rounded-brand p-5 flex items-start gap-3">
            <ShieldExclamationIcon className="w-8 h-8 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-800 m-0">
                Código não validado
              </p>
              <p className="text-sm text-brand-ink m-0 mt-1">{erro}</p>
            </div>
          </div>
        )}

        {cert && (
          <>
            <div
              className={`rounded-brand p-5 border shadow-sm flex items-start gap-4 ${
                integro
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}
            >
              {integro ? (
                <ShieldCheckIcon className="w-10 h-10 text-emerald-600 shrink-0" />
              ) : (
                <ShieldExclamationIcon className="w-10 h-10 text-rose-600 shrink-0" />
              )}
              <div>
                <p
                  className={`text-lg font-bold m-0 ${
                    integro ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {integro
                    ? "Documento íntegro"
                    : "Inconsistência detectada"}
                </p>
                <p className="text-sm text-brand-ink m-0 mt-1">
                  {integro
                    ? "O código confere com o documento e todas as trilhas de auditoria seladas estão íntegras."
                    : "A trilha de auditoria apresenta divergências. Trate este documento com cautela."}
                </p>
                <p className="text-xs text-brand-soft m-0 mt-2">
                  Verificação realizada em {formatDateAnTime(cert.gerado_em)} ·{" "}
                  {cert.total_eventos} eventos auditados
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
                Documento
              </h3>
              <dl className="space-y-2 text-sm m-0">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Nome</dt>
                  <dd className="text-brand-navy font-semibold m-0 text-right">
                    {cert.documento?.nome_documento}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Status</dt>
                  <dd className="m-0">{cert.documento?.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Hash original (SHA-256)</dt>
                  <dd className="m-0 font-mono text-xs" title={cert.documento?.hash_original}>
                    {truncHash(cert.documento?.hash_original)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Hash final (SHA-256)</dt>
                  <dd className="m-0 font-mono text-xs" title={cert.documento?.hash_final}>
                    {truncHash(cert.documento?.hash_final)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-soft">Assinado/carimbado em</dt>
                  <dd className="m-0">
                    {cert.assinatura_criptografica?.carimbado_em
                      ? formatDateAnTime(
                          cert.assinatura_criptografica.carimbado_em
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {cert.signatarios?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
                  Quem assinou
                </h3>
                <ul className="m-0 p-0 list-none divide-y divide-gray-100">
                  {cert.signatarios.map((s, i) => (
                    <li
                      key={`${s.nome}-${i}`}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <div>
                        <p className="text-sm font-semibold text-brand-navy m-0">
                          {s.nome}
                        </p>
                        <p className="text-xs text-brand-soft m-0 mt-0.5 font-mono">
                          CPF: {s.cpf_mascarado}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-xs font-bold m-0 ${
                            s.status === "SIGNED"
                              ? "text-emerald-700"
                              : "text-brand-soft"
                          }`}
                        >
                          {statusSignatarioLabel[s.status] || s.status}
                        </p>
                        <p className="text-xs text-brand-soft m-0 mt-0.5">
                          {s.assinado_em ? formatDateAnTime(s.assinado_em) : "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {trilhaAssinatura.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
                  Trilha de assinatura
                </h3>
                <ol className="m-0 p-0 list-none divide-y divide-gray-100">
                  {trilhaAssinatura.map((elo, i) => {
                    const objeto = rotuloTipoObjeto(elo);
                    const quando = dataElo(elo);
                    return (
                      <li
                        key={`${elo.sequencia}-${elo.tipo_evento}-${i}`}
                        className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1"
                      >
                        <div>
                          <p className="text-sm font-semibold text-brand-navy m-0">
                            <span className="text-brand-soft font-mono text-xs mr-2">
                              {elo.sequencia != null ? elo.sequencia : i + 1}.
                            </span>
                            {rotuloTipoEvento(elo.tipo_evento)}
                          </p>
                          {objeto && (
                            <p className="text-xs text-brand-soft m-0 mt-0.5">
                              {objeto}
                            </p>
                          )}
                          {elo.nome && (
                            <p className="text-xs text-brand-soft m-0 mt-0.5">
                              {elo.nome}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-brand-soft m-0 sm:text-right">
                          {quando ? formatDateAnTime(quando) : "—"}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <div className="bg-brand-tip rounded-brand p-5 text-xs text-brand-slate leading-relaxed">
              <p className="font-bold uppercase tracking-wider m-0 mb-2">
                Como este documento é autenticado
              </p>
              <p className="m-0">
                Este documento combina duas camadas de prova: as{" "}
                <strong>assinaturas eletrônicas avançadas</strong> dos
                signatários listados acima (Lei nº 14.063/2020), comprovadas
                pela estampa no PDF e por esta trilha de auditoria, e o{" "}
                <strong>selo digital da plataforma</strong>, aplicado ao PDF
                final com o certificado digital da empresa.
              </p>
              <p className="m-0 mt-2">
                Ao validar o PDF no verificador oficial do governo brasileiro,{" "}
                <a
                  href="https://validar.iti.gov.br"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-teal font-semibold"
                >
                  validar.iti.gov.br
                </a>
                , aparecerá a razão social da empresa (titular do certificado do
                selo) — e não o nome de cada signatário. Isso é esperado: a
                identificação dos signatários é feita por esta página e pela
                estampa impressa no documento.
              </p>
            </div>
          </>
        )}
      </main>

      <footer className="text-center text-xs text-brand-soft py-6">
        {jsonConfig.brand.nameSoftware} · validação pública de integridade
      </footer>
    </div>
  );
};

export default Verificar;
