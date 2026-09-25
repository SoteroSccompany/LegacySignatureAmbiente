import { useEffect, useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { getPanelService } from "../../../services/panel";
import {
  formatCpf,
  onlyDigits,
} from "../../../utils/validators/identity";

const DEBOUNCE_MS = 320;

/**
 * Linha de cadastro de signatário: busca de cadastrados + campos manuais.
 * Ações de lista ("me adicionar" / "único signatário") ficam no pai.
 */
const LinhaCadastroSignatario = ({
  signatario,
  index,
  onChange,
  onSelectUsuario,
  onRemove,
  podeRemover,
}) => {
  const panel = getPanelService();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (signatario.autoAssinatura || signatario.usuarioSelecionadoId) {
      setBusca("");
      setResultados([]);
      setAberto(false);
    }
  }, [signatario.autoAssinatura, signatario.usuarioSelecionadoId]);

  useEffect(() => {
    if (signatario.autoAssinatura || signatario.usuarioSelecionadoId)
      return undefined;
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultados([]);
      setBuscando(false);
      return undefined;
    }
    let alive = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      const resp = await panel.buscarUsuariosCadastro(termo);
      if (!alive) return;
      setBuscando(false);
      if (!resp.status) {
        setResultados([]);
        return;
      }
      setResultados(resp.data || []);
      setAberto(true);
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busca,
    signatario.autoAssinatura,
    signatario.usuarioSelecionadoId,
  ]);

  const selecionar = (u) => {
    onSelectUsuario(signatario.id, {
      nome: u.nome || "",
      email: u.email || "",
      cpf: onlyDigits(u.cpf || "").slice(0, 11),
      telefone: onlyDigits(u.telefone || ""),
      usuarioSelecionadoId: u.user_id || u.id || null,
    });
    setBusca("");
    setResultados([]);
    setAberto(false);
  };

  const editarCampo = (field, value) => {
    onChange(signatario.id, field, value);
  };

  // Busca some quando há vínculo (seleção da busca / "me adicionar")
  // ou autoAssinatura. Digitação manual sem id mantém a busca.
  const buscaVisivel =
    !signatario.autoAssinatura && !signatario.usuarioSelecionadoId;

  return (
    <div className="space-y-3 border-b border-gray-50 pb-4">
      {!signatario.autoAssinatura ? (
        <>
          {buscaVisivel && (
            <div className="relative" ref={wrapRef}>
              <label className="block text-xs font-semibold text-brand-soft mb-1">
                Buscar usuário cadastrado
              </label>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => resultados.length > 0 && setAberto(true)}
                placeholder="Nome, e-mail ou CPF…"
                autoComplete="off"
                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              />
              {buscando && (
                <p className="text-xs text-brand-soft mt-1 m-0">Buscando…</p>
              )}
              {aberto && resultados.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-brand border border-gray-100 bg-white shadow-md">
                  {resultados.map((u) => (
                    <li key={u.user_id || u.id}>
                      <button
                        type="button"
                        onClick={() => selecionar(u)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="font-semibold text-brand-ink block">
                          {u.nome || "Sem nome"}
                        </span>
                        <span className="text-xs text-brand-soft">
                          {u.email}
                          {u.cpf ? ` · CPF ${formatCpf(u.cpf)}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {aberto &&
                !buscando &&
                busca.trim().length >= 2 &&
                resultados.length === 0 && (
                  <p className="text-xs text-brand-soft mt-1 m-0">
                    Nenhum usuário encontrado. Preencha os campos manualmente.
                  </p>
                )}
            </div>
          )}

          {signatario.usuarioSelecionadoId && (
            <p className="text-xs text-brand-teal m-0">
              Usuário selecionado — campos preenchidos (você ainda pode editar).
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-brand-soft mb-1">
                Nome {index + 1}
              </label>
              <input
                value={signatario.nome}
                onChange={(e) => editarCampo("nome", e.target.value)}
                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-soft mb-1">
                E-mail
              </label>
              <input
                value={signatario.email}
                onChange={(e) => editarCampo("email", e.target.value)}
                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-soft mb-1">
                CPF (opcional)
              </label>
              <input
                value={formatCpf(signatario.cpf)}
                onChange={(e) =>
                  editarCampo("cpf", onlyDigits(e.target.value).slice(0, 11))
                }
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-soft mb-1">
                Telefone (opcional)
              </label>
              <input
                value={signatario.telefone || ""}
                onChange={(e) => editarCampo("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(signatario.id)}
              disabled={!podeRemover}
              className="p-2 text-rose-500 disabled:opacity-30"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-brand-soft m-0 mt-1">
            Se não souber agora, o próprio signatário completa ao acessar o link.
          </p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-brand-soft m-0 py-1">
            Signatário {index + 1} — dados do seu perfil serão usados no cadastro
            (CPF não trafega no formulário).
          </p>
          <button
            type="button"
            onClick={() => onRemove(signatario.id)}
            disabled={!podeRemover}
            className="p-2 text-rose-500 disabled:opacity-30 shrink-0"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LinhaCadastroSignatario;
