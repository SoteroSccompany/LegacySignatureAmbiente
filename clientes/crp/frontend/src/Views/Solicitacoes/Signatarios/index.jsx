import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../Components/Header";
import PdfDemarcacao from "../../../Components/Pdf/Demarcacao";
import LinhaCadastroSignatario from "../../../Components/Signatario/LinhaCadastro";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService, STATUS_SOLICITACAO } from "../../../services/panel";
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

const steps = ["Signatários", "Demarcações"];

// Retoma o cadastro de signatários de uma solicitação cujo upload já foi
// concluído (UPLOAD_CONCLUIDO) mas que ainda não teve signatários enviados —
// mesmo passo do wizard "Nova solicitação", só que fora dele.
const SignatariosSolicitacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();

  const [solicitacao, setSolicitacao] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [pdfSrc, setPdfSrc] = useState(jsonConfig.uiMock ? "/documento.sample.pdf" : null);
  const [step, setStep] = useState(0);
  const [signatarios, setSignatarios] = useState([criarSignatarioVazio(0)]);
  const [areas, setAreas] = useState([]);
  const [adicionandoMe, setAdicionandoMe] = useState(false);
  const [unicoSignatario, setUnicoSignatario] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await panel.getSolicitacao(id);
      if (!alive) return;

      if (!resp.status) {
        setErro(resp.msg || "Solicitação não encontrada.");
        setCarregando(false);
        return;
      }

      const sol = resp.data;
      // Mesmo gate aplicado pelo backend: só cabe cadastrar signatários
      // quando o upload já concluiu e ainda não existe nenhum signatário.
      if (sol.status !== STATUS_SOLICITACAO.UPLOAD_CONCLUIDO) {
        toast.info("Esta solicitação não está pronta para cadastro de signatários.");
        navigate(`/solicitacoes/${id}`, { replace: true });
        return;
      }
      if (sol.signatarios?.length) {
        toast.info("Esta solicitação já tem signatários cadastrados.");
        navigate(`/solicitacoes/${id}`, { replace: true });
        return;
      }

      setSolicitacao(sol);
      setCarregando(false);

      if (!jsonConfig.uiMock && sol.documento_id) {
        const doc = await panel.getDocumentoDownload(sol.documento_id);
        if (!alive) return;
        if (doc.status && doc.data?.url) {
          setPdfSrc(doc.data.url);
        } else {
          toast.error("Não foi possível carregar a pré-visualização do documento.");
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addSigner = () => {
    setSignatarios((prev) => [...prev, criarSignatarioVazio(prev.length)]);
  };

  const updateSigner = (sid, field, value) => {
    setSignatarios((prev) =>
      prev.map((s) =>
        s.id === sid
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

  const removeSigner = (sid) => {
    setSignatarios((prev) => prev.filter((s) => s.id !== sid));
    setAreas((prev) => prev.filter((a) => a.signatarioId !== sid));
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
    if (step === 0) {
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
    if (step === 1) {
      const lista = signatariosEfetivos(signatarios);
      return lista.every(
        (s) => areas.filter((a) => a.signatarioId === s.id).length === 1
      );
    }
    return true;
  };

  const avancar = () => {
    if (step === 0) {
      const efetivos = signatariosEfetivos(signatarios);
      const ids = new Set(efetivos.map((s) => s.id));
      setSignatarios(efetivos);
      setAreas((prev) => prev.filter((a) => ids.has(a.signatarioId)));
    }
    setStep((s) => s + 1);
  };

  const enviar = async () => {
    if (!solicitacao?.documento_id) {
      toast.error("Documento ainda não está disponível.");
      return;
    }
    setEnviando(true);
    try {
      const resp = await panel.addSignatarios(
        solicitacao.documento_id,
        montarPayloadSignatarios(signatarios, areas, pageSize)
      );
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao cadastrar signatários.");
        return;
      }
      toast.success(resp.msg || "Signatários cadastrados e convites disparados.");
      navigate(`/solicitacoes/${id}`);
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return <div className="p-6 text-sm text-brand-soft">Carregando…</div>;
  }

  if (erro || !solicitacao) {
    return (
      <div className="p-6">
        <p className="text-brand-ink">{erro || "Solicitação não encontrada."}</p>
      </div>
    );
  }

  const isDemarcacaoStep = step === 1;

  return (
    <div
      className={
        isDemarcacaoStep
          ? "flex flex-col h-[calc(100vh-4rem)] min-h-0 overflow-hidden"
          : ""
      }
    >
      <Header
        title="Cadastrar signatários"
        description={solicitacao.titulo}
        icon={UserGroupIcon}
        hasReturn
        compact={isDemarcacaoStep}
        buttonReturnAction={() => navigate(`/solicitacoes/${id}`)}
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
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <p className="text-xs text-brand-soft m-0">
              Documento com upload já concluído. Cadastre os signatários para
              disparar os convites de assinatura. Você pode se adicionar, buscar
              um usuário já cadastrado ou digitar os dados manualmente.
            </p>
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
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-sm font-semibold text-brand-navy"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={enviando || !canNext()}
              onClick={enviar}
              className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-brand"
            >
              {enviando
                ? "Enviando…"
                : !canNext()
                  ? "Demarque os signatarios para continuar"
                  : "Cadastrar signatários e enviar convites"}
            </button>
          </div>
        )}

        {step === 1 && (
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

        {!isDemarcacaoStep && (
          <div className="flex justify-between mt-8">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-sm font-semibold text-brand-navy disabled:opacity-30"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!canNext()}
              onClick={avancar}
              className="px-5 py-2.5 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-40 text-white text-sm font-bold rounded-brand"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatariosSolicitacao;
