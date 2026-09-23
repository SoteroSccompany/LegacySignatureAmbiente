/* Página de assinatura — login 2FA + visualização + enfileiramento PAdES */
(function () {
    'use strict';

    const PDFJS = window.pdfjsLib;
    const WORKER_SRC = new URL('pdf.worker.min.js', window.location.href).href;
    const STORAGE_KEY = 'assinatura:config';

    const state = {
        documentoId: null,
        pdfUrl: null,
        demarcacoes: [],
        modos: { DESENHO: 'DESENHO', DADOS: 'DADOS' },
        downloadUrl: null,
        polling: null,
        loginStep: 1,
    };

    const el = {};
    let toastTimer = null;
    let drawing = false;

    function $(id) { return document.getElementById(id); }

    function toast(msg, isError) {
        el.toast.textContent = msg;
        el.toast.classList.toggle('is-error', !!isError);
        el.toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 3200);
    }

    function setMsg(node, msg, isError) {
        if (!msg) {
            node.hidden = true;
            return;
        }
        node.hidden = false;
        node.textContent = msg;
        node.classList.toggle('is-error', !!isError);
    }

    function loadConfig() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function saveConfig() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            apiBase: el.apiBase.value.trim(),
            proxyKey: el.proxyKey.value.trim(),
            bucketHost: el.bucketHost.value.trim() || '127.0.0.1',
            documentoId: el.documentoId.value.trim(),
            email: el.email.value.trim(),
        }));
    }

    function apiBase() {
        return (el.apiBase.value || '').replace(/\/$/, '');
    }

    function bucketPublicHost() {
        return (el.bucketHost?.value || '127.0.0.1').trim() || '127.0.0.1';
    }

    /**
     * Presign vem como https://bucketsignatureexperts:8333/...
     * Trocar só o scheme NÃO basta: HSTS no host força https de novo (ERR_SSL_PROTOCOL_ERROR).
     * Gera candidatos em http://127.0.0.1 (e localhost) com o mesmo path/query.
     */
    function bucketUrlCandidates(url) {
        if (!url || typeof url !== 'string') return [];
        let raw = url.trim();
        if (raw.startsWith('//')) raw = `http:${raw}`;
        raw = raw.replace(/^https:\/\//i, 'http://');

        let parsed;
        try {
            parsed = new URL(raw);
        } catch {
            return [raw.replace(/^https:\/\//i, 'http://')];
        }
        parsed.protocol = 'http:';

        const pathQuery = `${parsed.pathname}${parsed.search}`;
        const port = parsed.port || '8333';
        const publicHost = bucketPublicHost();
        const originalHost = parsed.hostname;

        const hosts = [publicHost, '127.0.0.1', 'localhost', originalHost]
            .filter(Boolean)
            .filter((h, i, arr) => arr.indexOf(h) === i);

        return hosts.map((host) => `http://${host}:${port}${pathQuery}`);
    }

    function forceHttp(url) {
        const list = bucketUrlCandidates(url);
        return list[0] || url;
    }

    function xhrArrayBuffer(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.withCredentials = false;
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(new Uint8Array(xhr.response));
                    return;
                }
                reject(new Error(`HTTP ${xhr.status} em ${url.split('?')[0]}`));
            };
            xhr.onerror = () => reject(new Error(`Falha de rede em ${url.split('?')[0]}`));
            xhr.send();
        });
    }

    async function baixarPdfBytes(url) {
        const candidates = bucketUrlCandidates(url);
        const errors = [];
        for (const candidate of candidates) {
            try {
                // XHR evita alguns caminhos do fetch que reaparecem como https no DevTools
                const bytes = await xhrArrayBuffer(candidate);
                if (bytes && bytes.byteLength > 0) {
                    console.info('[assinatura] PDF baixado via', candidate.split('?')[0]);
                    return bytes;
                }
            } catch (err) {
                errors.push(`${candidate.split('?')[0]} → ${err.message}`);
            }
        }
        throw new Error(
            `Não foi possível baixar o PDF por HTTP. Tentativas:\n${errors.join('\n')}\n`
            + 'Ajuste "Host público do bucket" (ex.: 127.0.0.1) e confirme a porta 8333 no host.'
        );
    }

    function proxyHeader() {
        const key = el.proxyKey.value.trim();
        if (!key) return {};
        return { proxyauthorization: key.startsWith('Bearer ') ? key : `Bearer ${key}` };
    }

    async function api(path, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = {
            'Content-Type': 'application/json',
            ...proxyHeader(),
            ...(options.headers || {}),
        };

        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const csrfRes = await fetch(`${apiBase()}/csrftoken`, {
                credentials: 'include',
                headers: proxyHeader(),
            });
            const csrfJson = await csrfRes.json();
            if (!csrfJson.status || !csrfJson.csrfToken) {
                throw new Error(csrfJson.msg || 'Falha ao obter CSRF');
            }
            headers['X-CSRF-Token'] = csrfJson.csrfToken;
        }

        const res = await fetch(`${apiBase()}${path}`, {
            method,
            credentials: 'include',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const json = await res.json().catch(() => ({ status: false, msg: 'Resposta inválida da API' }));
        if (!res.ok && !json.msg) json.msg = `HTTP ${res.status}`;
        return json;
    }

    function getModo() {
        const checked = document.querySelector('input[name="modo"]:checked');
        return checked ? checked.value : 'DADOS';
    }

    /* ---------- canvas desenho ---------- */

    function setupPad() {
        const canvas = el.padCanvas;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const pos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const src = e.touches ? e.touches[0] : e;
            return {
                x: (src.clientX - rect.left) * (canvas.width / rect.width),
                y: (src.clientY - rect.top) * (canvas.height / rect.height),
            };
        };

        const start = (e) => {
            drawing = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            e.preventDefault();
        };
        const move = (e) => {
            if (!drawing) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            e.preventDefault();
        };
        const end = () => { drawing = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);

        el.btnLimparPad.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }

    function padIsEmpty() {
        const ctx = el.padCanvas.getContext('2d');
        const data = ctx.getImageData(0, 0, el.padCanvas.width, el.padCanvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return false;
        }
        return true;
    }

    async function uploadEstampa() {
        const urlResp = await api(`/admin/assinatura/documentos/${state.documentoId}/estampa-url`, {
            method: 'POST',
            body: {},
        });
        if (!urlResp.status) throw new Error(urlResp.msg || 'Falha ao gerar URL da estampa');

        const blob = await new Promise((resolve) => el.padCanvas.toBlob(resolve, 'image/png'));
        const putHeaders = { ...(urlResp.data.headers || {}), 'Content-Type': 'image/png' };
        let uploaded = false;
        let lastErr = null;
        for (const candidate of bucketUrlCandidates(urlResp.data.url)) {
            try {
                const put = await fetch(candidate, {
                    method: 'PUT',
                    headers: putHeaders,
                    body: blob,
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-store',
                });
                if (put.ok) {
                    uploaded = true;
                    break;
                }
                lastErr = new Error(`HTTP ${put.status}`);
            } catch (err) {
                lastErr = err;
            }
        }
        if (!uploaded) throw new Error(`Upload da estampa falhou: ${lastErr?.message || 'erro desconhecido'}`);
        return urlResp.data.object_name;
    }

    /* ---------- PDF viewer ---------- */

    async function renderPdf(url, demarcacoes) {
        if (!PDFJS) throw new Error('PDF.js não carregou (pdf.min.js local).');
        PDFJS.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        el.viewer.innerHTML = '';
        el.viewerEmpty?.remove();

        // Baixa via HTTP e passa bytes — evita o worker/fetch interno usar a URL https do presign
        const data = await baixarPdfBytes(url);
        const loading = await PDFJS.getDocument({
            data,
            withCredentials: false,
            useWorkerFetch: false,
            stopAtErrors: false,
        }).promise;
        for (let pageNum = 1; pageNum <= loading.numPages; pageNum++) {
            const page = await loading.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.25 });
            const wrap = document.createElement('div');
            wrap.className = 'page-wrap';
            wrap.dataset.page = String(pageNum);

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            wrap.appendChild(canvas);
            el.viewer.appendChild(wrap);

            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            const pageMarks = (demarcacoes || []).filter((d) => Number(d.pagina) === pageNum);
            for (const mark of pageMarks) {
                const box = document.createElement('div');
                box.className = 'mark-preview';
                box.style.left = `${Number(mark.x) * 100}%`;
                box.style.top = `${Number(mark.y) * 100}%`;
                box.style.width = `${Number(mark.largura) * 100}%`;
                box.style.height = `${Number(mark.altura) * 100}%`;
                wrap.appendChild(box);
            }
        }
    }

    function fillMeta(data) {
        const d = data.documento;
        const s = data.signatario;
        el.docMeta.innerHTML = `
            <dt>Documento</dt><dd>${d.nome || d.id}</dd>
            <dt>Status documento</dt><dd>${d.status}</dd>
            <dt>Signatário</dt><dd>${s.nome} (${s.email})</dd>
            <dt>CPF</dt><dd>${s.cpf_mascarado || '—'}</dd>
            <dt>Ordem</dt><dd>${s.ordem ?? '—'}</dd>
            <dt>Status assinatura</dt><dd id="statusSign">${s.status}</dd>
        `;
        el.docInfo.textContent = d.nome || d.id;
    }

    /* ---------- fluxo ---------- */

    function setLoginStep(step) {
        state.loginStep = step;
        const step2 = step === 2;
        el.stepCredenciais.hidden = step2;
        el.step2fa.hidden = !step2;
        el.btnVoltarLogin.hidden = !step2;
        el.token2fa.required = step2;
        el.documentoId.required = !step2;
        el.email.required = !step2;
        el.senha.required = !step2;
        el.btnLogin.textContent = step2 ? 'Confirmar 2FA e carregar' : 'Validar credenciais';
        el.loginHint.textContent = step2
            ? 'Passo 2: informe o código do autenticador para liberar o documento.'
            : 'Passo 1: e-mail e senha geram o desafio. Passo 2: código 2FA libera o documento.';
        if (step2) {
            el.token2fa.value = '';
            el.token2fa.focus();
        }
    }

    async function carregarDocumento() {
        const doc = await api(`/admin/assinatura/documentos/${state.documentoId}`);
        if (!doc.status) throw new Error(doc.msg || 'Falha ao carregar documento');

        state.pdfUrl = forceHttp(doc.data.pdf_url);
        state.demarcacoes = doc.data.demarcacoes || [];
        state.modos = doc.data.modos || state.modos;

        fillMeta(doc.data);
        el.loginPanel.hidden = true;
        el.workspace.hidden = false;
        await renderPdf(state.pdfUrl, state.demarcacoes);

        if (doc.data.signatario.status === 'SIGNED') {
            el.btnAssinar.disabled = true;
            await pollStatus(true);
        }
        toast('Documento pronto para assinatura');
    }

    async function onLogin(e) {
        e.preventDefault();
        saveConfig();
        setMsg(el.loginMsg, '');
        el.btnLogin.disabled = true;
        try {
            if (!apiBase()) throw new Error('Informe a Base URL da API (proxy).');

            if (state.loginStep === 1) {
                const sessao = await api('/admin/assinatura/sessao', {
                    method: 'POST',
                    body: {
                        documento_id: el.documentoId.value.trim(),
                        email: el.email.value.trim(),
                        senha: el.senha.value,
                    },
                });
                if (!sessao.status) throw new Error(sessao.msg || 'Falha na autenticação');
                state.documentoId = el.documentoId.value.trim();
                setLoginStep(2);
                toast('Credenciais ok. Informe o 2FA.');
                return;
            }

            const token = el.token2fa.value.trim();
            if (!token) throw new Error('Informe o código 2FA.');
            const conf = await api('/admin/assinatura/sessao/2fa', {
                method: 'POST',
                body: { token },
            });
            if (!conf.status) throw new Error(conf.msg || 'Falha na confirmação 2FA');

            // Site/Addon só liberam o PDF na etapa validado (2) — consulta o progresso
            // em vez de assumir que o 2FA já basta (biometria pode ainda estar pendente).
            const documentoId = state.documentoId || el.documentoId.value.trim();
            const progresso = await api(`/admin/assinatura/sessao/progresso?documento_id=${encodeURIComponent(documentoId)}`);
            if (!progresso.status) throw new Error(progresso.msg || 'Não foi possível consultar o progresso da sessão.');
            const etapaBruta = progresso.data && progresso.data.etapa;
            const etapa = etapaBruta === 'otp' || etapaBruta === null || etapaBruta === undefined
                ? etapaBruta
                : Number(etapaBruta);
            if (etapa === 2) {
                await carregarDocumento();
                return;
            }
            let msgEtapa = progresso.msg || 'A etapa atual ainda não libera o documento.';
            if (etapa === 0) msgEtapa = progresso.msg || 'Aguarde a captura da câmera antes de abrir o documento.';
            else if (etapa === 1) msgEtapa = progresso.msg || 'Reconhecimento facial em validação.';
            else if (etapa === 3) msgEtapa = progresso.msg || 'Reconhecimento facial não validado.';
            else if (etapa === 'otp') msgEtapa = progresso.msg || 'Confirme o código OTP antes de abrir o documento.';
            setMsg(el.loginMsg, msgEtapa);
            toast(msgEtapa);
        } catch (err) {
            setMsg(el.loginMsg, err.message, true);
            toast(err.message, true);
        } finally {
            el.btnLogin.disabled = false;
        }
    }

    async function onAssinar() {
        setMsg(el.signMsg, '');
        el.btnAssinar.disabled = true;
        try {
            const modo = getModo();
            let estampa_object_name = null;
            if (modo === 'DESENHO') {
                if (padIsEmpty()) throw new Error('Desenhe a assinatura no pad antes de continuar.');
                estampa_object_name = await uploadEstampa();
            }

            const resp = await api(`/admin/assinatura/documentos/${state.documentoId}/assinar`, {
                method: 'POST',
                body: { modo, estampa_object_name },
            });
            if (!resp.status) throw new Error(resp.msg || 'Falha ao enfileirar assinatura');

            setMsg(el.signMsg, 'Assinatura em processamento…');
            toast('Assinatura enfileirada');
            await pollStatus(false);
        } catch (err) {
            setMsg(el.signMsg, err.message, true);
            toast(err.message, true);
            el.btnAssinar.disabled = false;
        }
    }

    async function pollStatus(silent) {
        clearInterval(state.polling);
        const tick = async () => {
            try {
                const st = await api(`/admin/assinatura/documentos/${state.documentoId}/status`);
                if (!st.status) return;
                const status = st.data.signatario.status;
                const statusEl = document.getElementById('statusSign');
                if (statusEl) statusEl.textContent = status;

                if (status === 'SIGNED') {
                    clearInterval(state.polling);
                    state.downloadUrl = forceHttp(st.data.download_url);
                    el.btnDownload.hidden = !state.downloadUrl;
                    el.btnAssinar.disabled = true;
                    setMsg(el.signMsg, 'Documento assinado com sucesso.');
                    if (!silent) toast('Assinatura concluída');
                    if (state.downloadUrl) {
                        try { await renderPdf(state.downloadUrl, state.demarcacoes); } catch (_) { /* ignore */ }
                    }
                } else if (status === 'ERROR') {
                    clearInterval(state.polling);
                    el.btnAssinar.disabled = false;
                    setMsg(el.signMsg, 'Falha ao aplicar assinatura. Tente novamente.', true);
                    toast('Erro ao assinar', true);
                } else if (status === 'PROCESSING') {
                    setMsg(el.signMsg, 'Processando assinatura criptográfica…');
                }
            } catch (err) {
                if (!silent) console.warn(err);
            }
        };
        await tick();
        state.polling = setInterval(tick, 2500);
    }

    function onDownload() {
        if (!state.downloadUrl) return;
        window.open(state.downloadUrl, '_blank', 'noopener');
    }

    function bindModo() {
        document.querySelectorAll('input[name="modo"]').forEach((input) => {
            input.addEventListener('change', () => {
                el.desenhoBox.hidden = getModo() !== 'DESENHO';
            });
        });
    }

    function init() {
        el.loginPanel = $('loginPanel');
        el.workspace = $('workspace');
        el.loginForm = $('loginForm');
        el.documentoId = $('documentoId');
        el.email = $('email');
        el.senha = $('senha');
        el.token2fa = $('token2fa');
        el.stepCredenciais = $('stepCredenciais');
        el.step2fa = $('step2fa');
        el.loginHint = $('loginHint');
        el.btnVoltarLogin = $('btnVoltarLogin');
        el.apiBase = $('apiBase');
        el.proxyKey = $('proxyKey');
        el.bucketHost = $('bucketHost');
        el.btnLogin = $('btnLogin');
        el.loginMsg = $('loginMsg');
        el.docInfo = $('docInfo');
        el.docMeta = $('docMeta');
        el.desenhoBox = $('desenhoBox');
        el.padCanvas = $('padCanvas');
        el.btnLimparPad = $('btnLimparPad');
        el.btnAssinar = $('btnAssinar');
        el.btnDownload = $('btnDownload');
        el.signMsg = $('signMsg');
        el.viewer = $('viewer');
        el.viewerEmpty = $('viewerEmpty');
        el.toast = $('toast');

        const cfg = loadConfig();
        if (cfg.apiBase) {
            el.apiBase.value = cfg.apiBase;
        } else if (window.location.pathname.startsWith('/tools')) {
            el.apiBase.value = `${window.location.origin}/signature`;
        } else {
            el.apiBase.value = `http://${window.location.hostname || 'localhost'}:7749/signature`;
        }
        el.proxyKey.value = cfg.proxyKey || '';
        el.bucketHost.value = cfg.bucketHost || '127.0.0.1';
        el.documentoId.value = cfg.documentoId || new URLSearchParams(location.search).get('documento_id') || '';
        el.email.value = cfg.email || '';

        setupPad();
        bindModo();
        setLoginStep(1);
        el.loginForm.addEventListener('submit', onLogin);
        el.btnVoltarLogin.addEventListener('click', () => {
            setMsg(el.loginMsg, '');
            setLoginStep(1);
        });
        el.btnAssinar.addEventListener('click', onAssinar);
        el.btnDownload.addEventListener('click', onDownload);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
