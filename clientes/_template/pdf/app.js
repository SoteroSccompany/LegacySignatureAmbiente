/* Demarcador de assinaturas — gerador de payload para o fluxo de documentos.
   As coordenadas são mantidas normalizadas (0..1) sobre a página já rotacionada,
   por isso independem de zoom, densidade de tela ou tamanho do dispositivo. */

(function () {
    'use strict';

    const PDFJS = window.pdfjsLib;
    const WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const PALETTE = [
        '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6',
        '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6'
    ];

    const DEFAULT_MARK = { largura: 0.24, altura: 0.062 };
    const MIN_SIZE = 0.012;
    const SNAP_STEP = 0.005;
    const ZOOM_STEPS = [0.25, 0.4, 0.5, 0.65, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    const VIEWER_GUTTER = 48;
    const STORAGE_KEY = 'demarcador:signatarios';

    const state = {
        pdfDoc: null,
        fileName: '',
        pages: [],
        scale: 1,
        zoomMode: 'fit-width',
        signatarios: [],
        marks: [],
        activeSignerId: null,
        selectedMarkId: null,
        editingSignerId: null,
        snap: false
    };

    const el = {};
    let toastTimer = null;
    let resizeTimer = null;
    let pageObserver = null;

    /* ------------------------------------------------------------------ utils */

    const uid = () => (crypto.randomUUID ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        }));

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const round = (v, casas) => Number(v.toFixed(casas));
    const pct = v => round(v * 100, 2);

    function snapValue(v) {
        return state.snap ? Math.round(v / SNAP_STEP) * SNAP_STEP : v;
    }

    function maskCpf(value) {
        const d = value.replace(/\D/g, '').slice(0, 11);
        return d
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    }

    function isCpfValido(cpf) {
        const d = String(cpf || '').replace(/\D/g, '');
        if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
        for (let t = 9; t < 11; t++) {
            let soma = 0;
            for (let i = 0; i < t; i++) soma += Number(d[i]) * ((t + 1) - i);
            const dig = ((soma * 10) % 11) % 10;
            if (dig !== Number(d[t])) return false;
        }
        return true;
    }

    const isEmailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));

    function toast(msg, isError) {
        el.toast.textContent = msg;
        el.toast.classList.toggle('is-error', Boolean(isError));
        el.toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2600);
    }

    function proximaCor() {
        const usadas = new Set(state.signatarios.map(s => s.cor));
        return PALETTE.find(c => !usadas.has(c)) || PALETTE[state.signatarios.length % PALETTE.length];
    }

    /* --------------------------------------------------------------- persistência */

    function salvarSignatarios() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.signatarios));
        } catch (_) { /* storage indisponível: segue sem persistir */ }
    }

    function carregarSignatarios() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const lista = JSON.parse(raw);
            if (Array.isArray(lista)) {
                state.signatarios = lista.filter(s => s && s.id && s.nome);
                state.activeSignerId = state.signatarios.length ? state.signatarios[0].id : null;
            }
        } catch (_) { /* json corrompido: ignora */ }
    }

    /* ------------------------------------------------------------- signatários */

    function getSigner(id) {
        return state.signatarios.find(s => s.id === id) || null;
    }

    function renderSignatarios() {
        el.signersList.innerHTML = '';
        el.signersEmpty.hidden = state.signatarios.length > 0;

        state.signatarios.forEach(signer => {
            const total = state.marks.filter(m => m.signerId === signer.id).length;

            const li = document.createElement('li');
            li.className = 'signer' + (signer.id === state.activeSignerId ? ' is-active' : '');
            li.style.setProperty('--signer-color', signer.cor);
            li.dataset.id = signer.id;

            const dot = document.createElement('span');
            dot.className = 'signer__dot';

            const body = document.createElement('div');
            body.className = 'signer__body';

            const nome = document.createElement('div');
            nome.className = 'signer__name';
            nome.textContent = signer.nome;

            const sub = document.createElement('div');
            sub.className = 'signer__sub';
            sub.textContent = [signer.email, signer.cpf].filter(Boolean).join(' · ') || 'sem contato';

            const tags = document.createElement('div');
            tags.className = 'signer__tags';
            tags.appendChild(criarTag(total === 1 ? '1 marcação' : `${total} marcações`));
            if (signer.ordem) tags.appendChild(criarTag(`ordem ${signer.ordem}`));
            if (signer.cpf && !isCpfValido(signer.cpf)) tags.appendChild(criarTag('CPF inválido', true));
            if (signer.email && !isEmailValido(signer.email)) tags.appendChild(criarTag('e-mail inválido', true));

            body.append(nome, sub, tags);

            const actions = document.createElement('div');
            actions.className = 'signer__actions';
            actions.append(
                criarIconBtn('✎', 'Editar', ev => { ev.stopPropagation(); editarSignatario(signer.id); }),
                criarIconBtn('✕', 'Remover', ev => { ev.stopPropagation(); removerSignatario(signer.id); })
            );

            li.append(dot, body, actions);
            li.addEventListener('click', () => {
                state.activeSignerId = signer.id;
                renderSignatarios();
            });

            el.signersList.appendChild(li);
        });
    }

    function criarTag(texto, warn) {
        const span = document.createElement('span');
        span.className = 'tag' + (warn ? ' tag--warn' : '');
        span.textContent = texto;
        return span;
    }

    function criarIconBtn(texto, title, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'iconbtn';
        btn.title = title;
        btn.textContent = texto;
        btn.addEventListener('click', onClick);
        return btn;
    }

    function submitSignatario(event) {
        event.preventDefault();

        const nome = el.signerNome.value.trim();
        if (!nome) {
            el.signerHint.textContent = 'Informe o nome do signatário.';
            el.signerHint.classList.add('is-error');
            el.signerNome.focus();
            return;
        }

        const dados = {
            nome,
            cpf: el.signerCpf.value.trim(),
            email: el.signerEmail.value.trim(),
            ordem: el.signerOrdem.value ? Number(el.signerOrdem.value) : null
        };

        if (state.editingSignerId) {
            const signer = getSigner(state.editingSignerId);
            if (signer) Object.assign(signer, dados);
            toast('Signatário atualizado');
        } else {
            const signer = Object.assign({ id: uid(), cor: proximaCor() }, dados);
            state.signatarios.push(signer);
            state.activeSignerId = signer.id;
            toast('Signatário adicionado — arraste sobre a página para demarcar');
        }

        resetFormSignatario();
        salvarSignatarios();
        renderSignatarios();
        renderMarks();
        atualizarPayload();
    }

    function editarSignatario(id) {
        const signer = getSigner(id);
        if (!signer) return;

        state.editingSignerId = id;
        el.signerNome.value = signer.nome;
        el.signerCpf.value = signer.cpf || '';
        el.signerEmail.value = signer.email || '';
        el.signerOrdem.value = signer.ordem || '';
        el.signerSubmit.textContent = 'Salvar alterações';
        el.signerCancel.hidden = false;
        el.signerNome.focus();
    }

    function removerSignatario(id) {
        const signer = getSigner(id);
        if (!signer) return;

        const total = state.marks.filter(m => m.signerId === id).length;
        const aviso = total
            ? `Remover "${signer.nome}" e suas ${total} marcação(ões)?`
            : `Remover "${signer.nome}"?`;
        if (!window.confirm(aviso)) return;

        state.signatarios = state.signatarios.filter(s => s.id !== id);
        state.marks = state.marks.filter(m => m.signerId !== id);
        if (state.activeSignerId === id) {
            state.activeSignerId = state.signatarios.length ? state.signatarios[0].id : null;
        }
        if (state.editingSignerId === id) resetFormSignatario();

        selecionarMark(null);
        salvarSignatarios();
        renderSignatarios();
        renderMarks();
        atualizarPayload();
    }

    function resetFormSignatario() {
        state.editingSignerId = null;
        el.signerForm.reset();
        el.signerSubmit.textContent = 'Adicionar signatário';
        el.signerCancel.hidden = true;
        el.signerHint.textContent = '';
        el.signerHint.classList.remove('is-error');
    }

    /* ---------------------------------------------------------------- pdf load */

    async function abrirArquivo(file) {
        if (!file) return;
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
            toast('Selecione um arquivo PDF', true);
            return;
        }

        try {
            const buffer = await file.arrayBuffer();
            const doc = await PDFJS.getDocument({ data: buffer }).promise;

            state.pdfDoc = doc;
            state.fileName = file.name;
            state.marks = [];
            state.selectedMarkId = null;
            state.zoomMode = 'fit-width';

            await montarPaginas();

            el.docInfo.textContent = `${file.name} · ${doc.numPages} página(s)`;
            el.dropzone.hidden = true;
            el.pagesEl.hidden = false;
            habilitarControles(true);
            atualizarPayload();
            toast('PDF carregado');
        } catch (err) {
            console.error(err);
            toast('Não foi possível abrir este PDF', true);
        }
    }

    async function montarPaginas() {
        if (pageObserver) pageObserver.disconnect();
        el.pagesEl.innerHTML = '';
        state.pages = [];

        for (let num = 1; num <= state.pdfDoc.numPages; num++) {
            const page = await state.pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale: 1 });

            const wrapper = document.createElement('div');
            wrapper.className = 'page';
            wrapper.dataset.page = String(num);

            const label = document.createElement('span');
            label.className = 'page__label';
            label.textContent = `Página ${num} · ${Math.round(viewport.width)}×${Math.round(viewport.height)} pt`;

            const canvas = document.createElement('canvas');
            canvas.className = 'page__canvas';

            const overlay = document.createElement('div');
            overlay.className = 'page__overlay';
            overlay.dataset.page = String(num);
            overlay.addEventListener('pointerdown', onOverlayPointerDown);
            overlay.addEventListener('dblclick', onOverlayDoubleClick);

            wrapper.append(label, canvas, overlay);
            el.pagesEl.appendChild(wrapper);

            state.pages.push({
                num, page, wrapper, canvas, overlay,
                widthPt: viewport.width,
                heightPt: viewport.height,
                rotation: viewport.rotation,
                renderTask: null,
                dirty: true,
                visible: false
            });
        }

        aplicarEscala(calcularEscalaAutomatica());

        pageObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const info = state.pages.find(p => p.wrapper === entry.target);
                if (!info) return;
                info.visible = entry.isIntersecting;
                if (entry.isIntersecting && info.dirty) renderPagina(info);
            });
        }, { root: el.viewer, rootMargin: '400px 0px' });

        state.pages.forEach(p => pageObserver.observe(p.wrapper));
    }

    function calcularEscalaAutomatica() {
        if (!state.pages.length) return 1;

        const maiorLargura = Math.max(...state.pages.map(p => p.widthPt));
        const maiorAltura = Math.max(...state.pages.map(p => p.heightPt));
        const disponivelX = Math.max(240, el.viewer.clientWidth - VIEWER_GUTTER);
        const escalaLargura = disponivelX / maiorLargura;

        if (state.zoomMode === 'fit-page') {
            const disponivelY = Math.max(240, el.viewer.clientHeight - VIEWER_GUTTER * 1.6);
            return Math.min(escalaLargura, disponivelY / maiorAltura);
        }
        return escalaLargura;
    }

    function aplicarEscala(escala) {
        state.scale = clamp(escala, 0.1, 6);
        el.zoomValue.textContent = `${Math.round(state.scale * 100)}%`;

        state.pages.forEach(info => {
            const cssW = Math.round(info.widthPt * state.scale);
            const cssH = Math.round(info.heightPt * state.scale);
            info.wrapper.style.width = `${cssW}px`;
            info.wrapper.style.height = `${cssH}px`;
            info.canvas.style.width = `${cssW}px`;
            info.canvas.style.height = `${cssH}px`;
            info.dirty = true;
            if (info.visible) renderPagina(info);
        });
    }

    function renderPagina(info) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = info.page.getViewport({ scale: state.scale * dpr });

        info.canvas.width = Math.floor(viewport.width);
        info.canvas.height = Math.floor(viewport.height);

        if (info.renderTask) {
            info.renderTask.cancel();
            info.renderTask = null;
        }

        const ctx = info.canvas.getContext('2d', { alpha: false });
        const task = info.page.render({ canvasContext: ctx, viewport });
        info.renderTask = task;
        info.dirty = false;

        task.promise.then(() => {
            info.renderTask = null;
        }).catch(err => {
            if (err && err.name === 'RenderingCancelledException') return;
            info.dirty = true;
            console.error(err);
        });
    }

    function alterarZoom(direcao) {
        const atual = state.scale;
        const passos = direcao > 0
            ? ZOOM_STEPS.filter(z => z > atual + 0.01)
            : ZOOM_STEPS.filter(z => z < atual - 0.01).reverse();

        if (!passos.length) return;
        state.zoomMode = 'custom';
        aplicarEscala(passos[0]);
    }

    function definirModoZoom(modo) {
        state.zoomMode = modo;
        aplicarEscala(calcularEscalaAutomatica());
    }

    function habilitarControles(ativo) {
        [el.zoomIn, el.zoomOut, el.fitWidth, el.fitPage, el.generate].forEach(btn => {
            btn.disabled = !ativo;
        });
    }

    /* ------------------------------------------------------------------- marks */

    function getMark(id) {
        return state.marks.find(m => m.id === id) || null;
    }

    function getPageInfo(num) {
        return state.pages.find(p => p.num === num) || null;
    }

    function renderMarks() {
        state.pages.forEach(info => { info.overlay.innerHTML = ''; });

        state.marks.forEach(mark => {
            const info = getPageInfo(mark.page);
            const signer = getSigner(mark.signerId);
            if (!info || !signer) return;
            info.overlay.appendChild(criarMarkEl(mark, signer));
        });

        atualizarPainelMark();
    }

    function criarMarkEl(mark, signer) {
        const node = document.createElement('div');
        node.className = 'mark' + (mark.id === state.selectedMarkId ? ' is-selected' : '');
        node.dataset.id = mark.id;
        node.style.setProperty('--mark-color', signer.cor);
        node.style.left = `${mark.x * 100}%`;
        node.style.top = `${mark.y * 100}%`;
        node.style.width = `${mark.w * 100}%`;
        node.style.height = `${mark.h * 100}%`;

        const label = document.createElement('span');
        label.className = 'mark__label';
        label.textContent = `${signer.nome} · ${mark.tipo}`;
        node.appendChild(label);

        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(dir => {
            const handle = document.createElement('span');
            handle.className = 'mark__handle';
            handle.dataset.dir = dir;
            handle.addEventListener('pointerdown', ev => iniciarResize(ev, mark, dir));
            node.appendChild(handle);
        });

        node.addEventListener('pointerdown', ev => iniciarMove(ev, mark));
        return node;
    }

    function selecionarMark(id) {
        state.selectedMarkId = id;
        renderMarks();
    }

    function onOverlayPointerDown(event) {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        if (event.target.closest('.mark')) return;

        const signer = getSigner(state.activeSignerId);
        if (!signer) {
            toast('Cadastre e selecione um signatário antes de demarcar', true);
            return;
        }

        const overlay = event.currentTarget;
        const rect = overlay.getBoundingClientRect();
        const pageNum = Number(overlay.dataset.page);
        const origemX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const origemY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

        selecionarMark(null);
        event.preventDefault();
        overlay.setPointerCapture(event.pointerId);

        const draft = document.createElement('div');
        draft.className = 'mark is-draft';
        draft.style.setProperty('--mark-color', signer.cor);
        overlay.appendChild(draft);

        let atual = { x: origemX, y: origemY, w: 0, h: 0 };

        const onMove = ev => {
            const px = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
            const py = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
            atual = {
                x: Math.min(origemX, px),
                y: Math.min(origemY, py),
                w: Math.abs(px - origemX),
                h: Math.abs(py - origemY)
            };
            draft.style.left = `${atual.x * 100}%`;
            draft.style.top = `${atual.y * 100}%`;
            draft.style.width = `${atual.w * 100}%`;
            draft.style.height = `${atual.h * 100}%`;
        };

        const onUp = () => {
            overlay.removeEventListener('pointermove', onMove);
            overlay.removeEventListener('pointerup', onUp);
            overlay.removeEventListener('pointercancel', onUp);
            draft.remove();

            if (atual.w >= MIN_SIZE && atual.h >= MIN_SIZE) {
                criarMark(pageNum, signer.id, atual);
            }
        };

        overlay.addEventListener('pointermove', onMove);
        overlay.addEventListener('pointerup', onUp);
        overlay.addEventListener('pointercancel', onUp);
    }

    function onOverlayDoubleClick(event) {
        if (event.target.closest('.mark')) return;

        const signer = getSigner(state.activeSignerId);
        if (!signer) {
            toast('Cadastre e selecione um signatário antes de demarcar', true);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const cx = (event.clientX - rect.left) / rect.width;
        const cy = (event.clientY - rect.top) / rect.height;

        criarMark(Number(event.currentTarget.dataset.page), signer.id, {
            x: cx - DEFAULT_MARK.largura / 2,
            y: cy - DEFAULT_MARK.altura / 2,
            w: DEFAULT_MARK.largura,
            h: DEFAULT_MARK.altura
        });
    }

    function criarMark(pageNum, signerId, base) {
        const w = clamp(snapValue(base.w), MIN_SIZE, 1);
        const h = clamp(snapValue(base.h), MIN_SIZE, 1);
        const mark = {
            id: uid(),
            signerId,
            page: pageNum,
            tipo: 'assinatura',
            x: clamp(snapValue(base.x), 0, 1 - w),
            y: clamp(snapValue(base.y), 0, 1 - h),
            w,
            h
        };

        state.marks.push(mark);
        state.selectedMarkId = mark.id;
        renderSignatarios();
        renderMarks();
        atualizarPayload();
    }

    function iniciarMove(event, mark) {
        if (event.target.classList.contains('mark__handle')) return;
        if (event.button !== 0 && event.pointerType === 'mouse') return;

        event.stopPropagation();
        event.preventDefault();
        selecionarMark(mark.id);

        const overlay = getPageInfo(mark.page).overlay;
        const node = overlay.querySelector(`.mark[data-id="${mark.id}"]`);
        const rect = overlay.getBoundingClientRect();
        const inicio = { x: event.clientX, y: event.clientY, mx: mark.x, my: mark.y };

        node.setPointerCapture(event.pointerId);

        const onMove = ev => {
            const dx = (ev.clientX - inicio.x) / rect.width;
            const dy = (ev.clientY - inicio.y) / rect.height;
            mark.x = clamp(snapValue(inicio.mx + dx), 0, 1 - mark.w);
            mark.y = clamp(snapValue(inicio.my + dy), 0, 1 - mark.h);
            aplicarGeometria(node, mark);
            atualizarPainelMark();
        };

        const onUp = () => {
            node.removeEventListener('pointermove', onMove);
            node.removeEventListener('pointerup', onUp);
            node.removeEventListener('pointercancel', onUp);
            atualizarPayload();
        };

        node.addEventListener('pointermove', onMove);
        node.addEventListener('pointerup', onUp);
        node.addEventListener('pointercancel', onUp);
    }

    function iniciarResize(event, mark, dir) {
        if (event.button !== 0 && event.pointerType === 'mouse') return;

        event.stopPropagation();
        event.preventDefault();
        selecionarMark(mark.id);

        const overlay = getPageInfo(mark.page).overlay;
        const node = overlay.querySelector(`.mark[data-id="${mark.id}"]`);
        const handle = node.querySelector(`.mark__handle[data-dir="${dir}"]`);
        const rect = overlay.getBoundingClientRect();
        const inicio = { x: event.clientX, y: event.clientY, mx: mark.x, my: mark.y, mw: mark.w, mh: mark.h };

        handle.setPointerCapture(event.pointerId);

        const onMove = ev => {
            const dx = (ev.clientX - inicio.x) / rect.width;
            const dy = (ev.clientY - inicio.y) / rect.height;

            let { mx: x, my: y, mw: w, mh: h } = inicio;

            if (dir.includes('e')) w = inicio.mw + dx;
            if (dir.includes('s')) h = inicio.mh + dy;
            if (dir.includes('w')) {
                w = inicio.mw - dx;
                x = inicio.mx + dx;
            }
            if (dir.includes('n')) {
                h = inicio.mh - dy;
                y = inicio.my + dy;
            }

            if (w < MIN_SIZE) {
                if (dir.includes('w')) x = inicio.mx + inicio.mw - MIN_SIZE;
                w = MIN_SIZE;
            }
            if (h < MIN_SIZE) {
                if (dir.includes('n')) y = inicio.my + inicio.mh - MIN_SIZE;
                h = MIN_SIZE;
            }

            x = clamp(snapValue(x), 0, 1 - MIN_SIZE);
            y = clamp(snapValue(y), 0, 1 - MIN_SIZE);
            mark.w = clamp(snapValue(w), MIN_SIZE, 1 - x);
            mark.h = clamp(snapValue(h), MIN_SIZE, 1 - y);
            mark.x = x;
            mark.y = y;

            aplicarGeometria(node, mark);
            atualizarPainelMark();
        };

        const onUp = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            handle.removeEventListener('pointercancel', onUp);
            atualizarPayload();
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
    }

    function aplicarGeometria(node, mark) {
        node.style.left = `${mark.x * 100}%`;
        node.style.top = `${mark.y * 100}%`;
        node.style.width = `${mark.w * 100}%`;
        node.style.height = `${mark.h * 100}%`;
    }

    function removerMark(id) {
        state.marks = state.marks.filter(m => m.id !== id);
        state.selectedMarkId = null;
        renderSignatarios();
        renderMarks();
        atualizarPayload();
    }

    /* -------------------------------------------------------- painel da marcação */

    function atualizarPainelMark() {
        const mark = getMark(state.selectedMarkId);
        el.markPanel.hidden = !mark;
        if (!mark) return;

        const info = getPageInfo(mark.page);
        el.markTipo.value = mark.tipo;
        el.markX.value = pct(mark.x);
        el.markY.value = pct(mark.y);
        el.markW.value = pct(mark.w);
        el.markH.value = pct(mark.h);

        const pdf = paraPontosPdf(mark, info);
        el.markMeta.innerHTML = '';
        [
            ['Página', String(mark.page)],
            ['Signatário', (getSigner(mark.signerId) || {}).nome || '—'],
            ['X / Y (pt)', `${pdf.x} / ${pdf.y}`],
            ['L × A (pt)', `${pdf.largura} × ${pdf.altura}`],
            ['Origem', 'inferior-esquerda']
        ].forEach(([chave, valor]) => {
            const dt = document.createElement('dt');
            dt.textContent = chave;
            const dd = document.createElement('dd');
            dd.textContent = valor;
            el.markMeta.append(dt, dd);
        });
    }

    function onCampoMarkChange() {
        const mark = getMark(state.selectedMarkId);
        if (!mark) return;

        const w = clamp((Number(el.markW.value) || 0) / 100, MIN_SIZE, 1);
        const h = clamp((Number(el.markH.value) || 0) / 100, MIN_SIZE, 1);
        mark.w = w;
        mark.h = h;
        mark.x = clamp((Number(el.markX.value) || 0) / 100, 0, 1 - w);
        mark.y = clamp((Number(el.markY.value) || 0) / 100, 0, 1 - h);
        mark.tipo = el.markTipo.value;

        renderMarks();
        atualizarPayload();
    }

    function onTeclado(event) {
        const tag = (event.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

        const mark = getMark(state.selectedMarkId);
        if (!mark) return;

        if (event.key === 'Escape') {
            selecionarMark(null);
            return;
        }

        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            removerMark(mark.id);
            return;
        }

        const passo = event.shiftKey ? 0.01 : 0.002;
        const deltas = {
            ArrowLeft: [-passo, 0], ArrowRight: [passo, 0],
            ArrowUp: [0, -passo], ArrowDown: [0, passo]
        };
        const delta = deltas[event.key];
        if (!delta) return;

        event.preventDefault();
        mark.x = clamp(mark.x + delta[0], 0, 1 - mark.w);
        mark.y = clamp(mark.y + delta[1], 0, 1 - mark.h);
        renderMarks();
        atualizarPayload();
    }

    /* ----------------------------------------------------------------- payload */

    function paraPontosPdf(mark, info) {
        if (!info) return { x: 0, y: 0, largura: 0, altura: 0 };
        return {
            x: round(mark.x * info.widthPt, 2),
            y: round((1 - mark.y - mark.h) * info.heightPt, 2),
            largura: round(mark.w * info.widthPt, 2),
            altura: round(mark.h * info.heightPt, 2)
        };
    }

    function construirPayload() {
        const ordenados = [...state.signatarios].sort((a, b) => {
            if (a.ordem && b.ordem) return a.ordem - b.ordem;
            if (a.ordem) return -1;
            if (b.ordem) return 1;
            return 0;
        });

        return ordenados.map(signer => ({
            data: {
                id: signer.id,
                nome: signer.nome,
                cpf: signer.cpf || null,
                email: signer.email || null,
                ordem: signer.ordem || null
            },
            sign: state.marks
                .filter(m => m.signerId === signer.id)
                .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)
                .map(mark => {
                    const info = getPageInfo(mark.page);
                    return {
                        id: mark.id,
                        tipo: mark.tipo,
                        pagina: mark.page,
                        x: round(mark.x, 5),
                        y: round(mark.y, 5),
                        largura: round(mark.w, 5),
                        altura: round(mark.h, 5),
                        pdf: Object.assign(paraPontosPdf(mark, info), { origem: 'bottom-left', unidade: 'pt' }),
                        pagina_tamanho: {
                            largura: info ? round(info.widthPt, 2) : null,
                            altura: info ? round(info.heightPt, 2) : null,
                            rotacao: info ? info.rotation : 0
                        }
                    };
                })
        }));
    }

    function atualizarPayload() {
        const payload = construirPayload();
        el.output.textContent = JSON.stringify(payload, null, 2);

        const temDados = payload.length > 0;
        el.copyJson.disabled = !temDados;
        el.downloadJson.disabled = !temDados;
        return payload;
    }

    function gerarPayload() {
        const payload = atualizarPayload();
        const semMarcacao = payload.filter(p => p.sign.length === 0).map(p => p.data.nome);

        if (!payload.length) {
            toast('Cadastre ao menos um signatário', true);
            return;
        }
        if (semMarcacao.length) {
            toast(`Sem marcação: ${semMarcacao.join(', ')}`, true);
            return;
        }

        console.log('Payload de signatários:', payload);
        toast(`Payload gerado com ${payload.length} signatário(s)`);
    }

    async function copiarPayload() {
        try {
            await navigator.clipboard.writeText(el.output.textContent);
            toast('JSON copiado');
        } catch (_) {
            toast('Não foi possível copiar', true);
        }
    }

    function baixarPayload() {
        const blob = new Blob([el.output.textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const base = state.fileName.replace(/\.pdf$/i, '') || 'signatarios';

        const link = document.createElement('a');
        link.href = url;
        link.download = `${base}-signatarios.json`;
        link.click();

        URL.revokeObjectURL(url);
        toast('Arquivo baixado');
    }

    /* ------------------------------------------------------------------ eventos */

    function bindDom() {
        el.fileInput = document.getElementById('fileInput');
        el.docInfo = document.getElementById('docInfo');
        el.zoomIn = document.getElementById('zoomIn');
        el.zoomOut = document.getElementById('zoomOut');
        el.zoomValue = document.getElementById('zoomValue');
        el.fitWidth = document.getElementById('fitWidth');
        el.fitPage = document.getElementById('fitPage');
        el.toggleSidebar = document.getElementById('toggleSidebar');
        el.layout = document.querySelector('.layout');
        el.sidebar = document.getElementById('sidebar');
        el.viewer = document.getElementById('viewer');
        el.dropzone = document.getElementById('dropzone');
        el.pagesEl = document.getElementById('pages');
        el.signerForm = document.getElementById('signerForm');
        el.signerNome = document.getElementById('signerNome');
        el.signerCpf = document.getElementById('signerCpf');
        el.signerEmail = document.getElementById('signerEmail');
        el.signerOrdem = document.getElementById('signerOrdem');
        el.signerSubmit = document.getElementById('signerSubmit');
        el.signerCancel = document.getElementById('signerCancel');
        el.signerHint = document.getElementById('signerHint');
        el.signersList = document.getElementById('signersList');
        el.signersEmpty = document.getElementById('signersEmpty');
        el.markPanel = document.getElementById('markPanel');
        el.markTipo = document.getElementById('markTipo');
        el.markX = document.getElementById('markX');
        el.markY = document.getElementById('markY');
        el.markW = document.getElementById('markW');
        el.markH = document.getElementById('markH');
        el.markMeta = document.getElementById('markMeta');
        el.markDelete = document.getElementById('markDelete');
        el.generate = document.getElementById('generate');
        el.copyJson = document.getElementById('copyJson');
        el.downloadJson = document.getElementById('downloadJson');
        el.snapGrid = document.getElementById('snapGrid');
        el.output = document.getElementById('output');
        el.toast = document.getElementById('toast');
    }

    function bindEventos() {
        el.fileInput.addEventListener('change', ev => {
            abrirArquivo(ev.target.files[0]);
            ev.target.value = '';
        });

        ['dragenter', 'dragover'].forEach(tipo => {
            el.viewer.addEventListener(tipo, ev => {
                ev.preventDefault();
                el.viewer.classList.add('is-dragover');
            });
        });

        ['dragleave', 'drop'].forEach(tipo => {
            el.viewer.addEventListener(tipo, ev => {
                ev.preventDefault();
                if (tipo === 'dragleave' && el.viewer.contains(ev.relatedTarget)) return;
                el.viewer.classList.remove('is-dragover');
            });
        });

        el.viewer.addEventListener('drop', ev => {
            const file = ev.dataTransfer && ev.dataTransfer.files[0];
            if (file) abrirArquivo(file);
        });

        el.viewer.addEventListener('pointerdown', ev => {
            if (!ev.target.closest('.mark') && !ev.target.closest('.page__overlay')) {
                selecionarMark(null);
            }
        });

        el.zoomIn.addEventListener('click', () => alterarZoom(1));
        el.zoomOut.addEventListener('click', () => alterarZoom(-1));
        el.fitWidth.addEventListener('click', () => definirModoZoom('fit-width'));
        el.fitPage.addEventListener('click', () => definirModoZoom('fit-page'));

        el.toggleSidebar.addEventListener('click', () => {
            el.layout.classList.toggle('is-collapsed');
            if (state.zoomMode !== 'custom') {
                setTimeout(() => aplicarEscala(calcularEscalaAutomatica()), 240);
            }
        });

        el.signerForm.addEventListener('submit', submitSignatario);
        el.signerCancel.addEventListener('click', resetFormSignatario);
        el.signerCpf.addEventListener('input', ev => {
            ev.target.value = maskCpf(ev.target.value);
            ev.target.setAttribute('aria-invalid', String(Boolean(ev.target.value) && !isCpfValido(ev.target.value)));
        });
        el.signerEmail.addEventListener('blur', ev => {
            ev.target.setAttribute('aria-invalid', String(Boolean(ev.target.value) && !isEmailValido(ev.target.value)));
        });

        [el.markX, el.markY, el.markW, el.markH].forEach(input => {
            input.addEventListener('change', onCampoMarkChange);
        });
        el.markTipo.addEventListener('change', onCampoMarkChange);
        el.markDelete.addEventListener('click', () => {
            if (state.selectedMarkId) removerMark(state.selectedMarkId);
        });

        el.snapGrid.addEventListener('change', ev => { state.snap = ev.target.checked; });
        el.generate.addEventListener('click', gerarPayload);
        el.copyJson.addEventListener('click', copiarPayload);
        el.downloadJson.addEventListener('click', baixarPayload);

        document.addEventListener('keydown', onTeclado);

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (state.pages.length && state.zoomMode !== 'custom') {
                    aplicarEscala(calcularEscalaAutomatica());
                }
            }, 140);
        });
    }

    function init() {
        bindDom();

        if (!PDFJS) {
            el.docInfo.textContent = 'PDF.js não carregou — verifique a conexão';
            toast('Não foi possível carregar o PDF.js', true);
            return;
        }

        PDFJS.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        bindEventos();
        carregarSignatarios();
        renderSignatarios();
        atualizarPayload();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
