const domainAlertaUsuario = require('../../../../@core/domain/AlertaUsuario');
const LedgerAlertaUsuario = require('../AuditoriaAlteracao/LadgerAlertaUsuario');
const Mail = require('../../Mail/Mailer');
const tampleteMensagemLink = require('../../Mail/templates/mensagemLink/index');
const { eventoAuditoria, applicationName, URLSITE } = require('../../../../certs');

class Alerta {

    #trx;
    #emails;

    constructor(trx) {
        if (!trx) {
            throw new Error('Alerta exige uma transação knex');
        }
        this.#trx = trx;
        this.#emails = [];
    }

    #normalizarDestinatarios({ user_id, user_ids }) {
        const ids = [];
        if (user_id) ids.push(user_id);
        if (Array.isArray(user_ids)) {
            for (const item of user_ids) {
                if (typeof item === 'string') ids.push(item);
                else if (item?.id) ids.push(item.id);
            }
        }
        return [...new Set(ids.filter(Boolean))];
    }

    async criar({ tipo, titulo, mensagem, referencia_tipo, referencia_id, user_id, user_ids, meta_dados }) {
        if (!tipo || typeof tipo !== 'string') throw new ErrorAlerta('tipo é obrigatório');
        if (!titulo || typeof titulo !== 'string') throw new ErrorAlerta('titulo é obrigatório');
        const texto = (mensagem && typeof mensagem === 'string') ? mensagem : titulo;
        const destinatarios = this.#normalizarDestinatarios({ user_id, user_ids });
        if (destinatarios.length === 0) throw new ErrorAlerta('user_id ou user_ids é obrigatório');
        const usuarios = await this.#trx('tab_usuarios')
            .whereIn('id', destinatarios)
            .andWhere('deletado', false)
            .select('id', 'email');
        if (usuarios.length !== destinatarios.length) throw new ErrorAlerta('Um ou mais destinatários não foram encontrados.');
        const alertas = [];
        for (const usuario of usuarios) {
            const alerta = new domainAlertaUsuario({
                user_id: usuario.id,
                tipo,
                titulo,
                mensagem: texto,
                referencia_tipo: referencia_tipo || null,
                referencia_id: referencia_id || null,
                meta_dados: meta_dados || null,
            });
            const registro = alerta.getAlertaUsuario();
            await this.#trx('tab_alerta_usuario').insert({
                ...registro,
                meta_dados: registro.meta_dados && typeof registro.meta_dados === 'object'
                    ? JSON.stringify(registro.meta_dados)
                    : registro.meta_dados,
            });
            const auditoriaAlerta = new LedgerAlertaUsuario(this.#trx);
            await auditoriaAlerta.GravarAuditoriaCriacao({
                alerta: registro,
                tipo_evento: eventoAuditoria.alerta_usuario_criado.label,
                sequencia: eventoAuditoria.alerta_usuario_criado.sequencia,
                meta_data: {
                    tipo,
                    referencia_tipo: referencia_tipo || null,
                    referencia_id: referencia_id || null,
                },
                user_id: usuario.id,
            });
            if (usuario.email) {
                this.#emails.push({
                    email: usuario.email,
                    titulo,
                    mensagem: texto,
                });
            }
            alertas.push(registro);
        }
        return { status: true, data: alertas };
    }

    async enviarEmails() {
        if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
        const enviados = [];
        const falhas = [];
        for (const item of this.#emails) {
            const content = tampleteMensagemLink({
                title: item.titulo,
                descricao: item.mensagem,
                link: URLSITE,
                nomeLink: 'Acessar a plataforma',
            });
            const enviado = await Mail.sendEmail(`${applicationName} — ${item.titulo}`, item.email, content);
            if (enviado) enviados.push(item.email);
            else falhas.push(item.email);
        }
        this.#emails = [];
        if (falhas.length > 0) {
            return {
                status: false,
                msg: 'Um ou mais e-mails de alerta não puderam ser enviados.',
                enviados,
                falhas,
            };
        }
        return { status: true, enviados, falhas };
    }
}

module.exports = Alerta;

class ErrorAlerta extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorAlerta';
    }
}
