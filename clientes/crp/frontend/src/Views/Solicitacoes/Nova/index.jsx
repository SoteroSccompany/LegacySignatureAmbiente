import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../Components/Header";
import UploadDocumento, {
  LABEL_DONE,
} from "../../../Components/Upload/Documento";
import PdfDemarcacao from "../../../Components/Pdf/Demarcacao";
import LinhaCadastroSignatario from "../../../Components/Signatario/LinhaCadastro";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService, STATUS_SOLICITACAO } from "../../../services/panel";
import { TIPO_TERMO_RESPONSABILIDADE } from "../../../services/panel/types";
import { jsonConfig } from "../../../Config";
import {
  isValidCpf,
  isValidTelefone,
  onlyDigits,
} from "../../../utils/validators/identity";
import { getSessionUser } from "../../../utils/roles";
import {
  criarSignatarioVazio,
  montarPayloadSignatarios,
  normalizarTelefone,
  signatariosEfetivos,
} from "../../../utils/signatarios";

const steps = [
  "Metadados",
  "Termo",
  "Upload",
  "Signatários",
  "Demarcações",
  "Revisar",
];

const NovaSolicitacao = () => {
  const navigate = useNavigate();
  const panel = getPanelService();
  const [step, setStep] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [termos, setTermos] = useState([]);
  const [termoId, setTermoId] = useState("");
  const [carregandoTermos, setCarregandoTermos] = useState(true);
  const [file, setFile] = useState(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState(null);
  const [signatarios, setSignatarios] = useState([criarSignatarioVazio(0)]);
  const [areas, setAreas] = useState([]);
  const [adicionandoMe, setAdicionandoMe] = useState(false);
  const [unicoSignatario, setUnicoSignatario] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingLabel, setSendingLabel] = useState("");
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });

  // Preview do PDF real selecionado (object URL) para o passo de demarcação
  const pdfSrc = useMemo(
    () => (file ? URL.createObjectURL(file) : "/documento.sample.pdf"),
    [file]
  );
  useEffect(() => {
    return () => {
      if (pdfSrc.startsWith("blob:")) URL.revokeObjectURL(pdfSrc);
    };
  }, [pdfSrc]);

  // Passo 2 do wizard: seletor de termo de responsabilidade — obrigatório
  // no POST /documentos/solicitacao (termo_id). Só cabem termos ativos do
  // tipo documento (o de foto de perfil é para o cadastro biométrico).
  useEffect(() => {
    let alive = true;
    (async () => {
      setCarregandoTermos(true);
      const resp = await panel.listTermos();
      if (!alive) return;
      const ativos = (resp.data || []).filter(
        (t) => t.ativo === true && t.tipo_termo === TIPO_TERMO_RESPONSABILIDADE.TERMO_DOCUMENTO
      );
      setTermos(ativos);
      if (ativos.length === 1) setTermoId(ativos[0].id);
      setCarregandoTermos(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (f) => {
    if (!f || uploading) return;

    setFile(f);
    setUploadDone(false);
    setSolicitacaoId(null);
    setUploading(true);
    setUploadProgress(10);
    setProgressLabel("Preparando upload…");

    try {
      // 1. POST — cria solicitação e recebe id + url presignada
      const criada = await panel.createSolicitacao({
        titulo: titulo.trim(),
        arquivo: f.name,
        termoId,
      });
      if (!criada.status || !criada.data?.id) {
        toast.error(criada.msg || "Falha ao criar solicitação.");
        setProgressLabel("");
        setUploadProgress(0);
        setFile(null);
        return;
      }

      // 2. PUT no link do bucket
      setUploadProgress(45);
      setProgressLabel("Enviando o PDF…");
      const up = await panel.uploadArquivo(criada.data.upload_url, f);
      if (!up.status) {
        toast.error(up.msg || "Falha no upload do arquivo.");
        setProgressLabel("");
        setUploadProgress(0);
        setFile(null);
        return;
      }

      // 3. PUT confirmação na API
      setUploadProgress(80);
      setProgressLabel("Confirmando…");
      const conf = await panel.confirmUpload(criada.data.id);
      if (!conf.status) {
        toast.error(conf.msg || "Erro ao confirmar o upload.");
        setProgressLabel("");
        setUploadProgress(0);
        setFile(null);
        return;
      }

      setSolicitacaoId(criada.data.id);
      setUploadProgress(100);
      setProgressLabel(LABEL_DONE);
      setUploadDone(true);
    } finally {
      setUploading(false);
    }
  };

  const addSigner = () => {
    setSignatarios((prev) => [...prev, criarSignatarioVazio(prev.length)]);
  };

  const updateSigner = (id, field, value) => {
    setSignatarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, [field]: value, usuarioSelecionadoId: null }
          : s
      )
    );
  };

  const selecionarUsuario = (sid, dados) => {
    setSignatarios((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
            ...s,
            ...dados,
            telefone: normalizarTelefone(dados.telefone || ""),
            autoAssinatura: false,
          }
          : s
      )
    );
  };

  // "Me adicionar": acrescenta o usuário logado sem apagar os demais.
  const meAdicionarComoSignatario = async () => {
    if (adicionandoMe || unicoSignatario || signatarios.some((s) => s.autoAssinatura)) return;
    const session = getSessionUser();
    const termo = (session.email || session.nome || "").trim();
    if (termo.length < 2) {
      toast.error(
        "Não foi possível identificar seu usuário. Faça login novamente."
      );
      return;
    }
    setAdicionandoMe(true);
    try {
      const resp = await panel.buscarUsuariosCadastro(termo);
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao carregar seus dados de signatário.");
        return;
      }
      const lista = resp.data || [];
      const emailNorm = (session.email || "").trim().toLowerCase();
      const eu =
        lista.find(
          (u) =>
            (session.userId &&
              (String(u.user_id) === String(session.userId) ||
                String(u.id) === String(session.userId))) ||
            (emailNorm &&
              String(u.email || "")
                .trim()
                .toLowerCase() === emailNorm)
        ) || null;
      if (!eu) {
        toast.error(
          "Seu perfil não foi encontrado na busca. Complete o cadastro de perfil ou preencha os campos manualmente."
        );
        return;
      }
      const dados = {
        nome: eu.nome || "",
        email: eu.email || "",
        cpf: onlyDigits(eu.cpf || "").slice(0, 11),
        telefone: normalizarTelefone(eu.telefone || ""),
        usuarioSelecionadoId: eu.user_id || eu.id || null,
      };
      const cpfNorm = dados.cpf;
      const jaTem = signatarios.some((s) => {
        if (s.autoAssinatura) return false;
        if (
          dados.usuarioSelecionadoId &&
          s.usuarioSelecionadoId &&
          String(s.usuarioSelecionadoId) === String(dados.usuarioSelecionadoId)
        )
          return true;
        if (
          emailNorm &&
          (s.email || "").trim().toLowerCase() === emailNorm
        )
          return true;
        if (cpfNorm.length === 11 && onlyDigits(s.cpf || "") === cpfNorm)
          return true;
        return false;
      });
      if (jaTem) {
        toast.info("Você já está na lista de signatários.");
        return;
      }
      setSignatarios((prev) => {
        const vazioIdx = prev.findIndex(
          (s) =>
            !s.autoAssinatura &&
            !(s.nome || "").trim() &&
            !(s.email || "").trim() &&
            !onlyDigits(s.cpf || "")
        );
        if (vazioIdx >= 0) {
          return prev.map((s, i) =>
            i === vazioIdx
              ? { ...s, ...dados, autoAssinatura: false }
              : s
          );
        }
        return [
          ...prev,
          {
            ...criarSignatarioVazio(prev.length),
            ...dados,
            autoAssinatura: false,
          },
        ];
      });
    } finally {
      setAdicionandoMe(false);
    }
  };

  // "Sou o único signatário": deixa só o usuário logado, com nome e dados do perfil.
  const setAutoAssinatura = async (checked) => {
    if (!checked) {
      setUnicoSignatario(false);
      setSignatarios([criarSignatarioVazio(0)]);
      setAreas([]);
      return;
    }
    if (adicionandoMe) return;
    const session = getSessionUser();
    const termo = (session.email || session.nome || "").trim();
    if (termo.length < 2) {
      toast.error("Não foi possível identificar seu usuário. Faça login novamente.");
      return;
    }
    setAdicionandoMe(true);
    try {
      const resp = await panel.buscarUsuariosCadastro(termo);
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao carregar seus dados de signatário.");
        return;
      }
      const lista = resp.data || [];
      const emailNorm = (session.email || "").trim().toLowerCase();
      const eu =
        lista.find(
          (u) =>
            (session.userId &&
              (String(u.user_id) === String(session.userId) ||
                String(u.id) === String(session.userId))) ||
            (emailNorm &&
              String(u.email || "")
                .trim()
                .toLowerCase() === emailNorm)
        ) || null;
      if (!eu) {
        toast.error(
          "Seu perfil não foi encontrado na busca. Complete o cadastro de perfil ou preencha os campos manualmente."
        );
        return;
      }
      const dados = {
        nome: eu.nome || "",
        email: eu.email || "",
        cpf: onlyDigits(eu.cpf || "").slice(0, 11),
        telefone: normalizarTelefone(eu.telefone || ""),
        usuarioSelecionadoId: eu.user_id || eu.id || null,
      };
      setUnicoSignatario(true);
      setSignatarios((prev) => {
        const base = prev[0] || criarSignatarioVazio(0);
        return [{ ...base, ...dados, autoAssinatura: false }];
      });
      setAreas((prev) => {
        const primeiroId = signatarios[0]?.id;
        return primeiroId
          ? prev.filter((a) => a.signatarioId === primeiroId)
          : [];
      });
    } finally {
      setAdicionandoMe(false);
    }
  };

  const removeSigner = (id) => {
    setSignatarios((prev) => prev.filter((s) => s.id !== id));
    setAreas((prev) => prev.filter((a) => a.signatarioId !== id));
  };

  // Contrato da API (#validarPayload): cpf/email/telefone não podem se
  // repetir entre os signatários da mesma solicitação. Linha vazia e
  // autoassinatura ficam de fora. Campo vazio não conta como duplicado.
  const semDuplicados = (lista) => {
    const normais = lista.filter((s) => !s.autoAssinatura);
    const semRepetidos = (arr) => {
      const preenchidos = arr.filter(Boolean);
      return new Set(preenchidos).size === preenchidos.length;
    };
    const cpfs = normais.map((s) => (s.cpf || "").replace(/\D/g, ""));
    const emails = normais.map((s) => (s.email || "").trim().toLowerCase());
    const tels = normais.map((s) => normalizarTelefone(s.telefone || ""));
    return semRepetidos(cpfs) && semRepetidos(emails) && semRepetidos(tels);
  };

  const canNext = () => {
    if (step === 0) return titulo.trim().length > 2;
    if (step === 1) return Boolean(termoId);
    if (step === 2) return Boolean(file && uploadDone && solicitacaoId);
    if (step === 3) {
      const lista = signatariosEfetivos(signatarios);
      return (
        lista.length > 0 &&
        lista.every((s) => {
          if (s.autoAssinatura) return true;
          return (
            s.nome &&
            /\S+@\S+\.\S+/.test(s.email) &&
            (jsonConfig.uiMock || isValidCpf(s.cpf)) &&
            (jsonConfig.uiMock || isValidTelefone(normalizarTelefone(s.telefone)))
          );
        }) &&
        semDuplicados(lista)
      );
    }
    if (step === 4) {
      // Contrato da API: exatamente uma demarcação por signatário
      const lista = signatariosEfetivos(signatarios);
      return lista.every(
        (s) => areas.filter((a) => a.signatarioId === s.id).length === 1
      );
    }
    return true;
  };

  const avancar = () => {
    if (step === 3) {
      const efetivos = signatariosEfetivos(signatarios);
      const ids = new Set(efetivos.map((s) => s.id));
      setSignatarios(efetivos);
      setAreas((prev) => prev.filter((a) => ids.has(a.signatarioId)));
    }
    setStep((s) => s + 1);
  };

  const aguardarProcessamento = async (id) => {
    // O worker de hash roda em segundos; espera até ~60s
    for (let i = 0; i < 30; i++) {
      const resp = await panel.getSolicitacao(id);
      if (resp.status) {
        const sol = resp.data;
        if (sol.status === STATUS_SOLICITACAO.ERRO_HASH_INICIAL) {
          return { status: false, msg: sol.erro || "Erro no processamento do documento." };
        }
        if (sol.documento_id && sol.status === STATUS_SOLICITACAO.UPLOAD_CONCLUIDO) {
          return { status: true, documento_id: sol.documento_id };
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return { status: false, msg: "Processamento demorou mais que o esperado." };
  };

  const enviar = async () => {
    if (!solicitacaoId) {
      toast.error("Envie o PDF no passo de upload antes de continuar.");
      return;
    }

    setSending(true);
    try {
      // Upload já ocorreu no drop; aqui só espera o hash e cadastra signatários
      setSendingLabel("Processando hash do documento…");
      const pronto = await aguardarProcessamento(solicitacaoId);
      if (!pronto.status) {
        toast.error(pronto.msg);
        navigate(`/solicitacoes/${solicitacaoId}`);
        return;
      }

      setSendingLabel("Cadastrando signatários…");
      const sigs = await panel.addSignatarios(
        pronto.documento_id,
        montarPayloadSignatarios(signatarios, areas, pageSize)
      );
      if (!sigs.status) {
        toast.error(sigs.msg);
        navigate(`/solicitacoes/${solicitacaoId}`);
        return;
      }

      toast.success("Solicitação criada e convites disparados.");
      navigate(`/solicitacoes/${solicitacaoId}`);
    } finally {
      setSending(false);
      setSendingLabel("");
    }
  };

  const isDemarcacaoStep = step === 4;

  return (
    <div
      className={
        isDemarcacaoStep
          ? "flex flex-col h-[calc(100vh-4rem)] min-h-0 overflow-hidden"
          : ""
      }
    >
      <Header
        title="Nova solicitação"
        description="Envie o PDF, escolha signatários e demarcações"
        icon={PlusCircleIcon}
        hasReturn
        compact={isDemarcacaoStep}
        buttonReturnAction={() => navigate("/solicitacoes")}
      />

      <div
        className={
          isDemarcacaoStep
            ? "flex-1 min-h-0 flex flex-col p-3 sm:p-4"
            : "p-6 max-w-5xl"
        }
      >
        <div
          className={`flex flex-wrap gap-2 ${isDemarcacaoStep ? "mb-3 shrink-0" : "mb-8"}`}
        >
          {steps.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-brand text-xs font-semibold ${i === step
                ? "bg-brand-navy text-white"
                : i < step
                  ? "bg-teal-50 text-brand-teal"
                  : "bg-white text-brand-soft border border-gray-100"
                }`}
            >
              <span className="opacity-70">{i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 space-y-4 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Nome do documento
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="Ex.: Contrato de prestação de serviços"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 space-y-4 shadow-sm">
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Termo de responsabilidade
            </label>
            {carregandoTermos ? (
              <p className="text-sm text-brand-soft m-0">Carregando termos…</p>
            ) : termos.length === 0 ? (
              <p className="text-sm text-rose-600 m-0">
                Nenhum termo de responsabilidade ativo cadastrado. Cadastre um
                termo em "Termos de responsabilidade" antes de continuar.
              </p>
            ) : (
              <select
                value={termoId}
                onChange={(e) => setTermoId(e.target.value)}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              >
                <option value="">Selecione um termo…</option>
                {termos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo_termo}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-brand-soft m-0">
              O termo selecionado é vinculado à solicitação no momento da
              criação (termo_id).
            </p>
          </div>
        )}

        {step === 2 && (
          <UploadDocumento
            file={file}
            onFile={handleFile}
            progressLabel={progressLabel}
            progress={uploadProgress}
            busy={uploading}
          />
        )}

        {step === 3 && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            {jsonConfig.uiMock ? (
              <p className="text-xs text-brand-soft m-0">
                Tip demo: busque <strong>Ana Costa</strong> ou use{" "}
                <strong>ana.costa@exemplo.com</strong> para aparecer na inbox do
                SIGNER. Use &quot;Me adicionar&quot; ou &quot;Sou o único
                signatário&quot; para se incluir.
              </p>
            ) : (
              <p className="text-xs text-brand-soft m-0">
                Cada signatário recebe o convite por e-mail. Você pode se
                adicionar, buscar um usuário cadastrado ou digitar os dados
                manualmente.
              </p>
            )}
            <div className="flex flex-row flex-wrap gap-2 items-stretch">
              <button
                type="button"
                onClick={meAdicionarComoSignatario}
                disabled={adicionandoMe || unicoSignatario}
                className="flex-1 min-w-[12rem] text-left flex items-center gap-2 text-sm font-medium select-none rounded-brand px-3 py-2 border bg-slate-50/80 border-transparent text-brand-ink hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adicionandoMe
                  ? "Carregando seus dados…"
                  : "Me adicionar como signatário"}
              </button>
              <label
                className={`flex-1 min-w-[12rem] flex items-center gap-2 text-sm cursor-pointer select-none rounded-brand px-3 py-2 border ${unicoSignatario
                  ? "bg-teal-50 border-teal-100 text-brand-ink"
                  : "bg-slate-50/80 border-transparent text-brand-ink"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={unicoSignatario}
                  onChange={(e) => setAutoAssinatura(e.target.checked)}
                  className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal shrink-0"
                />
                <span className="font-medium">
                  Sou o único signatário do documento
                </span>
              </label>
            </div>
            {signatarios.map((s, idx) => (
              <LinhaCadastroSignatario
                key={s.id}
                signatario={s}
                index={idx}
                onChange={updateSigner}
                onSelectUsuario={selecionarUsuario}
                onRemove={removeSigner}
                podeRemover={signatarios.length > 1}
              />
            ))}
            {!unicoSignatario && (
              <button
                type="button"
                onClick={addSigner}
                className="text-sm font-semibold text-brand-teal hover:underline"
              >
                + Adicionar signatário
              </button>
            )}
          </div>
        )}

        {isDemarcacaoStep && (
          <div className="flex justify-between mb-3 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-sm font-semibold text-brand-navy disabled:opacity-30"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!canNext() || uploading}
              onClick={avancar}
              className="px-5 py-2.5 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-brand"
            >
              {!canNext() ? "Demarque os signatarios para continuar" : "Continuar"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 min-h-0">
            <PdfDemarcacao
              signatarios={signatarios}
              areas={areas}
              onChangeAreas={setAreas}
              src={pdfSrc}
              onPageSize={setPageSize}
              className="h-full"
            />
          </div>
        )}

        {step === 5 && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <h3 className="font-display text-xl text-brand-navy m-0">
              Revisar e enviar
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-brand-soft">Nome</dt>
                <dd className="font-semibold text-brand-navy m-0">{titulo}</dd>
              </div>
              <div>
                <dt className="text-brand-soft">Arquivo</dt>
                <dd className="font-semibold text-brand-navy m-0">
                  {file?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-brand-soft">Signatários</dt>
                <dd className="font-semibold text-brand-navy m-0">
                  {signatarios.length}
                </dd>
              </div>
              <div>
                <dt className="text-brand-soft">Demarcações</dt>
                <dd className="font-semibold text-brand-navy m-0">
                  {areas.length}
                </dd>
              </div>
            </dl>
            <div className="bg-brand-tip rounded-brand p-4 text-sm text-brand-slate">
              Ao enviar: o hash inicial é finalizado e os convites são
              disparados por e-mail. Acompanhe o status no detalhe da
              solicitação.
            </div>
          </div>
        )}

        <div
          className={`flex justify-between mt-8 ${isDemarcacaoStep ? "hidden" : ""}`}
        >
          <button
            type="button"
            disabled={step === 0 || uploading}
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 text-sm font-semibold text-brand-navy disabled:opacity-30"
          >
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              disabled={!canNext() || uploading}
              onClick={avancar}
              className="px-5 py-2.5 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-40 text-white text-sm font-bold rounded-brand"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              disabled={sending || !solicitacaoId}
              onClick={enviar}
              className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white text-sm font-bold rounded-brand"
            >
              {sending ? sendingLabel || "Enviando…" : "Enviar solicitação"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovaSolicitacao;
