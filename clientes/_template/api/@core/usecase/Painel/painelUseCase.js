
const knex = require('../../../infrastructure/db/config/databaseConection')();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const logExeption = require('../Logs/exeption/exeptionDocumentos');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio');
const { roles, buckets, statusSignatario, statusSolicitacao, eventoAuditoria } = require('../../../certs/index.js');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { mascararCpf } = require('../../../infrastructure/gateways/PdfSign/aplicarAssinaturaPdf');
const bucketGateway = require('../../../infrastructure/gateways/Bucket');
const urlPublicaBucket = require('../../../infrastructure/gateways/Bucket/helpers/urlPublica');

class painelUseCase {

    async listarSolicitacoes(data) {
        try {
            if (!data.user_id) return { status: false, msg: 'Sessão inválida.' }
            const checkUser = await this.#getUsuario(data.user_id);
            if (!checkUser.status) return checkUser;
            const user = checkUser.user;
            const limit = Math.min(Number(data.limit) || 20, 100);
            const offset = Number(data.offset) || 0;

            const base = knex('tab_solicitacao_documento as s')
                .leftJoin('tab_documentos as d', 'd.id', 's.documento_id')
                .leftJoin('tab_usuarios as u', 'u.id', 's.user_id');
            if (user.role === roles.user) {
                base.whereExists(function () {
                    this.select(knex.raw('1'))
                        .from('tab_signatarios as sg')
                        .whereRaw('sg.documento_id = s.documento_id')
                        .andWhere('sg.user_id', data.user_id)
                        .andWhere('sg.deletado', false);
                });
            } else if (user.role !== roles.admin) {
                base.where('s.user_id', data.user_id);
            }
            if (data.status) base.andWhere('s.status', data.status);

            const totalRow = await base.clone().count({ total: 's.id' }).first();
            const rows = await base.clone()
                .select(
                    's.id', 's.status', 's.erro_msg', 's.user_id', 's.data_criacao', 's.data_atualizacao',
                    'u.email as solicitante_email',
                    'd.id as documento_id', 'd.nome_documento', 'd.documento_nome',
                    'd.status as documento_status', 'd.hash_original', 'd.hash_final',
                )
                .orderBy('s.data_criacao', 'desc')
                .limit(limit)
                .offset(offset);

            const documentoIds = rows.map((r) => r.documento_id).filter(Boolean);
            let contagens = [];
            if (documentoIds.length > 0) {
                contagens = await knex('tab_signatarios')
                    .select('documento_id')
                    .count({ total: 'id' })
                    .sum({ assinados: knex.raw('CASE WHEN status = ? THEN 1 ELSE 0 END', [statusSignatario.assinado]) })
                    .whereIn('documento_id', documentoIds)
                    .andWhere('deletado', false)
                    .groupBy('documento_id');
            }
            const contagemPorDocumento = {};
            for (const c of contagens) {
                contagemPorDocumento[c.documento_id] = { total: Number(c.total), assinados: Number(c.assinados) };
            }

            const lista = rows.map((r) => ({
                id: r.id,
                status: r.status,
                erro_msg: r.erro_msg,
                user_id: r.user_id,
                solicitante_email: r.solicitante_email,
                data_criacao: r.data_criacao,
                data_atualizacao: r.data_atualizacao,
                documento: r.documento_id ? {
                    id: r.documento_id,
                    nome_documento: r.nome_documento,
                    documento_nome: r.documento_nome,
                    status: r.documento_status,
                    hash_original: r.hash_original,
                    hash_final: r.hash_final,
                } : null,
                signatarios: contagemPorDocumento[r.documento_id] || { total: 0, assinados: 0 },
            }));

            return {
                status: true,
                msg: 'Solicitações carregadas',
                data: lista,
                paginacao: { total: Number(totalRow.total), limit, offset },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'listarSolicitacoes');
        }
    }

    async detalheSolicitacao(data) {
        try {
            if (!data.user_id || !data.id) return { status: false, msg: 'Sessão inválida.' }
            const checkUser = await this.#getUsuario(data.user_id);
            if (!checkUser.status) return checkUser;
            const user = checkUser.user;

            const solicitacao = await knex('tab_solicitacao_documento')
                .select('id', 'user_id', 'status', 'erro_msg', 'object_name', 'documento_id', 'meta_dados', 'data_criacao', 'data_atualizacao')
                .where('id', data.id)
                .first();
            if (!solicitacao) return { status: false, msg: 'Solicitação não encontrada.' }
            if (user.role === roles.user) {
                const signatario = solicitacao.documento_id
                    ? await knex('tab_signatarios')
                        .select('id')
                        .where('documento_id', solicitacao.documento_id)
                        .andWhere('user_id', data.user_id)
                        .andWhere('deletado', false)
                        .first()
                    : null;
                if (!signatario) return { status: false, msg: 'Solicitação não encontrada.' }
            } else if (user.role !== roles.admin && solicitacao.user_id !== data.user_id) {
                return { status: false, msg: 'Solicitação não encontrada.' }
            }

            let documento = null;
            let signatarios = [];
            if (solicitacao.documento_id) {
                documento = await knex('tab_documentos')
                    .select('id', 'nome_documento', 'documento_nome', 'status', 'hash_original', 'hash_final', 'hash_final_em', 'criado_em')
                    .where('id', solicitacao.documento_id)
                    .first();

                const rows = await knex('tab_signatarios as sg')
                    .leftJoin('tab_usuarios as u', 'u.id', 'sg.user_id')
                    .leftJoin('tab_perfil_usuario as p', 'p.id', 'sg.perfil_id')
                    .select(
                        'sg.id', 'sg.ordem', 'sg.status', 'sg.modo_visual', 'sg.assinado_em',
                        'sg.hash_pdf_apos', 'sg.data_criacao',
                        'u.email', 'p.nome', 'p.cpf',
                    )
                    .where('sg.documento_id', solicitacao.documento_id)
                    .andWhere('sg.deletado', false)
                    .orderBy([{ column: 'sg.ordem', order: 'asc' }, { column: 'sg.data_criacao', order: 'asc' }]);

                const sha = new SHA(process.env.SHA);
                const signatarioIds = rows.map((r) => r.id);
                let demarcacoes = [];
                if (signatarioIds.length > 0) {
                    demarcacoes = await knex('tab_demarcacoes_assinatura')
                        .select('id', 'signatario_id', 'tipo', 'pagina', 'x', 'y', 'largura', 'altura')
                        .whereIn('signatario_id', signatarioIds)
                        .andWhere('deletado', false);
                }
                signatarios = rows.map((r) => {
                    let cpfPlain = '';
                    try {
                        cpfPlain = sha.decrypt(r.cpf);
                    } catch {
                        cpfPlain = '';
                    }
                    return {
                        id: r.id,
                        nome: r.nome,
                        email: r.email,
                        cpf_mascarado: mascararCpf(cpfPlain),
                        ordem: r.ordem,
                        status: r.status,
                        modo_visual: r.modo_visual,
                        assinado_em: r.assinado_em,
                        hash_pdf_apos: r.hash_pdf_apos,
                        demarcacoes: demarcacoes.filter((d) => d.signatario_id === r.id),
                    };
                });
            }

            const metaDados = typeof solicitacao.meta_dados === 'string' ? JSON.parse(solicitacao.meta_dados) : solicitacao.meta_dados;

            const nomesPorSignatario = {};
            for (const s of signatarios) nomesPorSignatario[s.id] = s.nome || s.email;
            const elos = await knex('tab_auditoria_ledger')
                .select('id', 'tipo_evento', 'criado_em', 'objeto_id', 'sequencia')
                .where('solicitacao_id', solicitacao.id)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'asc')
                .orderBy('sequencia', 'asc');
            const rotulos = {};
            rotulos[eventoAuditoria.solicitacao_criada.label] = { label: 'Solicitação', titulo: 'Solicitação criada', descricao: 'Preparação do documento iniciada.' };
            rotulos[eventoAuditoria.documento_recebido.label] = { label: 'Documento', titulo: 'Documento recebido', descricao: 'O arquivo foi conferido e o hash original gravado.' };
            rotulos[eventoAuditoria.upload_concluido_processado.label] = { label: 'Documento', titulo: 'Hash processado', descricao: 'Upload concluído e hash do arquivo processado.' };
            rotulos[eventoAuditoria.erro_hash_inicial.label] = { label: 'Documento', titulo: 'Falha no hash', descricao: solicitacao.erro_msg || 'O hash inicial do arquivo não foi processado.', erro: true };
            rotulos[eventoAuditoria.signatario_adicionado.label] = { label: 'Signatário', titulo: 'Signatário adicionado', descricao: 'Signatário incluído no documento.' };
            rotulos[eventoAuditoria.documento_pronto_assinatura.label] = { label: 'Assinatura', titulo: 'Pronto para assinatura', descricao: 'O documento está aguardando os signatários.' };
            rotulos[eventoAuditoria.evento_email_enviado.label] = { label: 'Convite', titulo: 'Convite enviado', descricao: 'O e-mail de convite foi enviado.' };
            rotulos[eventoAuditoria.evento_email_falha.label] = { label: 'Convite', titulo: 'Falha no convite', descricao: 'O e-mail de convite não foi enviado.', erro: true };
            rotulos[eventoAuditoria.aceite_termo_registrado.label] = { label: 'Assinatura', titulo: 'Termo aceito', descricao: 'O termo de responsabilidade foi aceito.' };
            rotulos[eventoAuditoria.sessao_assinatura_confirmada.label] = { label: 'Assinatura', titulo: 'Sessão confirmada', descricao: 'A autenticação da assinatura foi confirmada.' };
            rotulos[eventoAuditoria.biometria_validada.label] = { label: 'Biometria', titulo: 'Biometria validada', descricao: 'O reconhecimento facial foi confirmado.' };
            rotulos[eventoAuditoria.biometria_negada.label] = { label: 'Biometria', titulo: 'Biometria não conferiu', descricao: 'O reconhecimento facial foi recusado.', erro: true };
            rotulos[eventoAuditoria.assinatura_solicitada.label] = { label: 'Assinatura', titulo: 'Assinatura solicitada', descricao: 'A assinatura entrou na fila de processamento.' };
            rotulos[eventoAuditoria.assinatura_aplicada.label] = { label: 'Assinatura', titulo: 'Assinatura aplicada', descricao: 'A assinatura foi aplicada no documento.' };
            rotulos[eventoAuditoria.documento_estampa_aplicada.label] = { label: 'Assinatura', titulo: 'Estampa aplicada', descricao: 'A estampa visual foi aplicada no PDF.' };
            rotulos[eventoAuditoria.folha_auditoria_gerada.label] = { label: 'Documento', titulo: 'Folha de auditoria', descricao: 'A folha de auditoria foi gerada.' };
            rotulos[eventoAuditoria.documento_selado.label] = { label: 'Documento', titulo: 'Documento selado', descricao: 'O PDF foi selado no vault.' };
            rotulos[eventoAuditoria.documento_assinatura_finalizada.label] = { label: 'Documento', titulo: 'Documento assinado', descricao: 'Todas as assinaturas foram concluídas.' };
            rotulos[eventoAuditoria.documento_cancelado.label] = { label: 'Documento', titulo: 'Documento cancelado', descricao: 'O documento foi cancelado.', erro: true };
            rotulos[eventoAuditoria.solicitacao_cancelada.label] = { label: 'Solicitação', titulo: 'Solicitação cancelada', descricao: 'A solicitação foi cancelada.', erro: true };
            const timeline = [];
            for (const elo of elos) {
                const rotulo = rotulos[elo.tipo_evento];
                if (!rotulo) continue;
                const nome = nomesPorSignatario[elo.objeto_id] || null;
                timeline.push({
                    id: elo.id,
                    label: rotulo.label,
                    titulo: rotulo.titulo,
                    descricao: nome ? `${nome}. ${rotulo.descricao}` : rotulo.descricao,
                    em: elo.criado_em,
                    erro: rotulo.erro === true,
                });
            }
            if (timeline.length === 0) {
                timeline.push({
                    id: solicitacao.id,
                    label: 'Solicitação',
                    titulo: 'Solicitação criada',
                    descricao: 'Preparação do documento iniciada.',
                    em: solicitacao.data_criacao,
                    erro: solicitacao.status === statusSolicitacao.erro_hash_inicial,
                });
            }

            return {
                status: true,
                msg: 'Detalhe da solicitação',
                data: {
                    solicitacao: {
                        id: solicitacao.id,
                        user_id: solicitacao.user_id,
                        status: solicitacao.status,
                        erro_msg: solicitacao.erro_msg,
                        object_name: solicitacao.object_name,
                        meta_dados: metaDados,
                        data_criacao: solicitacao.data_criacao,
                        data_atualizacao: solicitacao.data_atualizacao,
                    },
                    documento,
                    signatarios,
                    timeline,
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'detalheSolicitacao');
        }
    }

    async listarContratos(data) {
        try {
            if (!data.user_id) return { status: false, msg: 'Sessão inválida.' }
            const limit = Math.min(Number(data.limit) || 20, 100);
            const offset = Number(data.offset) || 0;

            const base = knex('tab_signatarios as sg')
                .innerJoin('tab_documentos as d', 'd.id', 'sg.documento_id')
                .leftJoin('tab_solicitacao_documento as s', 's.documento_id', 'd.id')
                .leftJoin('tab_usuarios as u', 'u.id', 's.user_id')
                .where('sg.user_id', data.user_id)
                .andWhere('sg.deletado', false);

            const totalRow = await base.clone().count({ total: 'sg.id' }).first();
            const rows = await base.clone()
                .select(
                    'sg.id as signatario_id', 'sg.status as signatario_status', 'sg.ordem',
                    'sg.modo_visual', 'sg.assinado_em',
                    'd.id as documento_id', 'd.nome_documento', 'd.documento_nome',
                    'd.status as documento_status', 'd.criado_em',
                    's.id as solicitacao_id', 'u.email as solicitante_email',
                )
                .orderBy('d.criado_em', 'desc')
                .limit(limit)
                .offset(offset);

            const lista = rows.map((r) => ({
                signatario_id: r.signatario_id,
                signatario_status: r.signatario_status,
                ordem: r.ordem,
                modo_visual: r.modo_visual,
                assinado_em: r.assinado_em,
                solicitacao_id: r.solicitacao_id,
                solicitante_email: r.solicitante_email,
                documento: {
                    id: r.documento_id,
                    nome_documento: r.nome_documento,
                    documento_nome: r.documento_nome,
                    status: r.documento_status,
                    criado_em: r.criado_em,
                },
            }));

            return {
                status: true,
                msg: 'Contratos carregados',
                data: lista,
                paginacao: { total: Number(totalRow.total), limit, offset },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'listarContratos');
        }
    }

    async getDownloadDocumento(data) {
        try {
            if (!data.user_id || !data.documento_id) return { status: false, msg: 'Sessão inválida.' }
            const checkUser = await this.#getUsuario(data.user_id);
            if (!checkUser.status) return checkUser;
            const user = checkUser.user;

            const documento = await knex('tab_documentos')
                .select('id', 'documento_nome', 'nome_documento', 'status', 'bucket_wip_path')
                .where('id', data.documento_id)
                .first();
            if (!documento) return { status: false, msg: 'Documento não encontrado.' }

            if (user.role !== roles.admin) {
                const dono = await knex('tab_solicitacao_documento')
                    .select('id')
                    .where('documento_id', data.documento_id)
                    .andWhere('user_id', data.user_id)
                    .first();
                const signatario = await knex('tab_signatarios')
                    .select('id')
                    .where('documento_id', data.documento_id)
                    .andWhere('user_id', data.user_id)
                    .andWhere('deletado', false)
                    .first();
                if (!dono && !signatario) return { status: false, msg: 'Documento não encontrado.' }
            }

            const url = await bucketGateway.Wip().urlDownloadGet({
                objectName: documento.bucket_wip_path,
                expiresInSeconds: buckets.temp_url_expiration * 10,
            });
            if (!url.status) return { status: false, msg: url.msg }

            return {
                status: true,
                msg: 'URL de visualização gerada',
                data: {
                    documento: {
                        id: documento.id,
                        nome_documento: documento.nome_documento,
                        documento_nome: documento.documento_nome,
                        status: documento.status,
                    },
                    url: urlPublicaBucket(url.data.url),
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'getDownloadDocumento');
        }
    }

    // Busca leve p/ preencher signatário no painel (gerente). CPF em claro —
    // o POST de signatários já exige os dígitos; cifrado no MySQL via AES.
    async buscarUsuariosParaSignatario(data) {
        try {
            if (!data.user_id) return { status: false, msg: 'Sessão inválida.' }
            const checkUser = await this.#getUsuario(data.user_id);
            if (!checkUser.status) return checkUser;
            const termo = String(data.q || '').trim();
            if (termo.length < 2) return { status: false, msg: 'Informe ao menos 2 caracteres para buscar.' }
            const limit = Math.min(Number(data.limit) || 10, 20);
            const digitos = termo.replace(/\D/g, '');
            const sha = new SHA(process.env.SHA);

            let query = knex('tab_perfil_usuario as p')
                .innerJoin('tab_usuarios as u', 'u.id', 'p.user_id')
                .select('p.id', 'p.user_id', 'p.nome', 'p.cpf', 'p.telefone', 'u.email')
                .where('p.deletado', false)
                .andWhere('u.deletado', false)
                .andWhere('u.bloqueado', false);

            if (digitos.length === 11) {
                query = query.andWhere('p.cpf_bindex', sha.generateBlindIndex(digitos));
            } else {
                const like = `%${termo}%`;
                query = query.andWhere(function () {
                    this.where('p.nome', 'like', like).orWhere('u.email', 'like', like);
                });
            }

            const rows = await query.orderBy('p.nome', 'asc').limit(limit);
            const lista = rows.map((r) => {
                let cpf = '';
                try { cpf = String(sha.decrypt(r.cpf) || '').replace(/\D/g, ''); } catch (_) { cpf = ''; }
                let telefone = '';
                try { telefone = String(sha.decrypt(r.telefone) || '').replace(/\D/g, ''); } catch (_) { telefone = ''; }
                if (!telefone) {
                    const bruto = String(r.telefone || '').replace(/\D/g, '');
                    if (bruto.length === 10 || bruto.length === 11) telefone = bruto;
                }
                return {
                    id: r.id,
                    user_id: r.user_id,
                    nome: r.nome || '',
                    email: r.email || '',
                    cpf,
                    telefone,
                };
            });
            return { status: true, msg: 'Usuários encontrados', data: lista }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'buscarUsuariosParaSignatario');
        }
    }

    async #getUsuario(user_id) {
        const checkUser = await repositorioUsuario.getById({ id: user_id });
        if (!checkUser.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        if (!checkUser.exit) return { status: false, revokeLogin: true, msg: 'Usuário não encontrado.' }
        return { status: true, user: checkUser.data[0] }
    }

    #erro(err, metodo) {
        let lineError = '0';
        let fileName = '0';
        const stackFrames = ErrorStackParser.parse(err);
        if (stackFrames.length > 0) {
            lineError = stackFrames[0].lineNumber;
            fileName = stackFrames[0].fileName;
        }
        logExeption({
            descricaoDoErro: `Exeption estourada. use case Painel - ${metodo}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        });
        return { status: false, msg: 'Erro interno do servidor, log gerado' }
    }

}

module.exports = new painelUseCase();
