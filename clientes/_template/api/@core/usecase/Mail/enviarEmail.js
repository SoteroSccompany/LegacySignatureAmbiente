
const Mail = require("../../../infrastructure/gateways/Mail/Mailer");
// const CriptClassCrypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const knex = require("../../../infrastructure/db/config/databaseConection")();
const { URLSITE, applicationName, alertaUsuario, eventoAuditoria } = require("../../../certs/index");
const logExeption = require('../Logs/exeption/exeptionMail.js')
require('dotenv/config')
const tampleteBaseEmail = require('../../../infrastructure/gateways/Mail/templates/base/index')
const tampleteBaseOutButton = require('../../../infrastructure/gateways/Mail/templates/baseOutButton/index')
const tampleteSecrete = require('../../../infrastructure/gateways/Mail/templates/secret/index')
const tampleteMensagemLink = require('../../../infrastructure/gateways/Mail/templates/mensagemLink/index')
const domainAlertaUsuario = require('../../../@core/domain/AlertaUsuario')
const LedgerAlertaUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerAlertaUsuario')

class SendMail_usecase {



    async sendMailInvestidorComArquivos(data) {
        try {
            const content = tampleteBaseOutButton({ descricao: data.descricao, title: data.title })
            const resp = await Mail.sendEmailMultipleFile(data.title, data.email, content, data.files || []);
            return resp === true;
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'envio relatorio obra investidor' })
            return false;
        }
    }

    async sendMailInvestidor(data) {
        try {
            const content = tampleteBaseOutButton({ descricao: data.descricao, title: data.title })
            return Mail.sendEmailLinkInvestidores(data.title, data.email, content);
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async sendEmailWithFile(data) {
        try {
            const content = tampleteBaseOutButton({ descricao: data.descricao, title: data.title })
            Mail.sendEmailFile(data.title, data.email, content, data.file);
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }

    async sendEmailWithOutFile(data) {
        try {
            const content = tampleteBaseOutButton({ descricao: data.descricao, title: data.title })
            Mail.sendEmail(data.title, data.email, content);
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }

    async sendEmailSecrete(data) {
        try {
            const content = tampleteSecrete({ title: data.title, secret: data.secret })
            Mail.sendEmail(data.title, data.email, content);
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }

    async sendEmailWithOutFileButton(data) {
        try {
            const content = tampleteBaseEmail({ descricao: data.descricao, title: data.title, link: data.link, nomeLink: data.nomeLink })
            Mail.sendEmail(data.title, data.email, content);
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }

    async sendEmailCreate(data) {
        try {
            const link = URLSITE + '/autenticarEmail/' + data.token;
            var descricao = `Voce foi adicionado ao ${applicationName}! <br />:
                <h3>Confirme seu e-mail no link a baixo: <br />
                Sua Senha: ${data.senha} <br />
                `;
            const titleEmail = `Seja bem-vindo ao ${applicationName}!`
            const nomeLink = 'Clique aqui para confirmar o email';
            const content = tampleteBaseEmail({ link, descricao, title: titleEmail, nomeLink })
            var subject = `Seja bem-vindo ao ${applicationName}!`;
            Mail.sendEmail(subject, data.email, content);
        } catch (err) {
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }


    async sendEmailRecovery(data) {
        try {
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const link = URLSITE + '/recuperarSenha/' + data.token;
            var descricao = `Olá! Voce solicitou uma troca de senha! <br />
             Clique no link a baixo para confirmar a troca de senha: <br />`;
            const titleEmail = `Parece que você perdeu sua senha =(`
            var nomeLink = 'Clique aqui para trocar a senha'
            var subject = "Troca de senha";
            const content = tampleteMensagemLink({ title: titleEmail, descricao, link, nomeLink })
            Mail.sendEmail(subject, data.email, content);
        } catch (err) {
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async enviarEmailMudancaEmail(data) {
        try {
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const link = URLSITE + '/trocarEmail/' + data.token;
            var descricao = `Olá! Voce solicitou uma troca de e-mail! <br />
             Clique no link a baixo para confirmar a troca de e-mail: <br />`;
            const titleEmail = `Parece que você quer trocar de e-mail =(`
            var nomeLink = 'Clique aqui para trocar o e-mail'
            var subject = "Troca de e-mail";
            const content = tampleteMensagemLink({ title: titleEmail, descricao, link, nomeLink })
            Mail.sendEmail(subject, data.antigoEmail, content);
        } catch (err) {
            logExeption({ error: { err }, identifier: 'mudanca de email' })
            return { status: false, msg: 'Expetion error', error: err }
        }

    }

    async sendEmailCredenciaisUsuario(data) {
        try {
            if (!data?.email || !data?.senha_temporaria) {
                return { status: false, msg: 'Dados incompletos para e-mail de credenciais de acesso' }
            }
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            if (data.user_id) {
                const trx = await knex.transaction();
                try {
                    const alerta = new domainAlertaUsuario({
                        user_id: data.user_id,
                        tipo: alertaUsuario.tipos.credenciais_enviadas,
                        titulo: 'Credenciais de acesso enviadas',
                        mensagem: `Credenciais temporárias enviadas para ${data.email}.`,
                        referencia_tipo: alertaUsuario.referencia.usuario,
                        referencia_id: data.id_user || null,
                    });
                    await trx('tab_alerta_usuario').insert(alerta.getAlertaUsuario());
                    const auditoriaAlerta = new LedgerAlertaUsuario(trx);
                    await auditoriaAlerta.GravarAuditoriaCriacao({
                        alerta: alerta.getAlertaUsuario(),
                        tipo_evento: eventoAuditoria.alerta_usuario_criado.label,
                        sequencia: eventoAuditoria.alerta_usuario_criado.sequencia,
                        meta_data: { email_destino: data.email },
                        user_id: data.user_id,
                    });
                    await trx.commit();
                } catch (error) {
                    await trx.rollback();
                    return { status: false, msg: 'Não foi possível registrar a auditoria de credenciais, tente novamente.' }
                }
            }
            const link = URLSITE;
            const descricao = `Foi criada uma conta para você em ${applicationName}.<br /><br />`
                + `E-mail de acesso: <strong>${data.email}</strong><br />`
                + `Senha temporária: <strong>${data.senha_temporaria}</strong><br /><br />`
                + `No primeiro acesso será necessário redefinir a senha e configurar a autenticação de dois fatores.`;
            const titleEmail = `Seja bem-vindo ao ${applicationName}!`;
            const nomeLink = 'Acessar a plataforma';
            const subject = `Seja bem-vindo ao ${applicationName}!`;
            const content = tampleteMensagemLink({ title: titleEmail, descricao, link, nomeLink })
            const enviado = await Mail.sendEmail(subject, data.email, content);
            if (!enviado) return { status: false, msg: 'Falha no envio SMTP das credenciais' }
            return { status: true, msg: 'Credenciais enviadas' }
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'credenciais staging' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async sendEmailConviteSignatario(data) {
        try {
            if (!data?.email || !data?.nome || !data?.documento_id) {
                return { status: false, msg: 'Dados incompletos para e-mail de convite' }
            }
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const isCriarConta = data.tipo === 'criar_conta' && data.senha_temporaria;
            const link = isCriarConta ? URLSITE : `${URLSITE}/assinar/${data.documento_id}`;
            let descricao = `Você foi adicionado como signatário de um documento em ${applicationName}.<br /><br />`
                + `Clique no botão abaixo para acessar a plataforma e realizar o processo de assinatura.`;
            if (isCriarConta) {
                descricao += `<br /><br />Foi criada uma conta para você.<br />`
                    + `E-mail de acesso: <strong>${data.email}</strong><br />`
                    + `Senha temporária: <strong>${data.senha_temporaria}</strong><br /><br />`
                    + `No primeiro acesso será necessário redefinir a senha e configurar a autenticação de dois fatores antes de assinar.`;
            }
            const title = 'Convite para assinar documento';
            const subject = 'Convite para assinar documento';
            const content = tampleteMensagemLink({
                title,
                descricao,
                link,
                nomeLink: 'Acessar para assinar',
                nome: data.nome,
            });
            const enviado = await Mail.sendEmail(subject, data.email, content);
            if (!enviado) return { status: false, msg: 'Falha no envio SMTP do convite' }
            return { status: true, msg: 'Convite enviado' }
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'convite signatario' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async sendEmailBiometriaNaoIdentificada(data) {
        try {
            if (!data?.email || !data?.nome || !data?.documento_id) {
                return { status: false, msg: 'Dados incompletos para e-mail de nova tentativa' }
            }
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const link = `${URLSITE}/assinar/${data.documento_id}`;
            const title = 'Reconhecimento facial não confirmado';
            const subject = 'Reconhecimento facial não confirmado';
            const descricao = `Não foi possível confirmar o reconhecimento facial da sua assinatura em ${applicationName}.<br /><br />`
                + `Acesse o link abaixo para enviar uma nova foto.`;
            const content = tampleteMensagemLink({
                title,
                descricao,
                link,
                nomeLink: 'Tentar novamente',
                nome: data.nome,
            });
            const enviado = await Mail.sendEmail(subject, data.email, content);
            if (!enviado) return { status: false, msg: 'Falha no envio SMTP da nova tentativa' }
            return { status: true, msg: 'E-mail de nova tentativa enviado' }
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'biometria nao identificada' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async sendEmailDocumentoCancelado(data) {
        try {
            if (!data?.email || !data?.nome || !data?.documento_id) {
                return { status: false, msg: 'Dados incompletos para e-mail de cancelamento' }
            }
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const title = 'Documento cancelado';
            const subject = 'Documento cancelado';
            const descricao = `O documento em que você era signatário em ${applicationName} foi cancelado pelo solicitante.<br /><br />`
                + `Este documento não seguirá para assinatura. Nenhuma ação é necessária de sua parte.`;
            const content = tampleteMensagemLink({
                title,
                descricao,
                link: URLSITE,
                nomeLink: 'Acessar a plataforma',
                nome: data.nome,
            });
            const enviado = await Mail.sendEmail(subject, data.email, content);
            if (!enviado) return { status: false, msg: 'Falha no envio SMTP do cancelamento' }
            return { status: true, msg: 'E-mail de cancelamento enviado' }
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'cancelamento documento' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

    async sendEmailDocumentoAssinado(data) {
        try {
            if (!data?.email || !data?.nome || !data?.documento_id || !data?.pdfBuffer) {
                return { status: false, msg: 'Dados incompletos para e-mail do documento assinado' }
            }
            if (!URLSITE) return { status: false, msg: 'URL da plataforma não configurada.' }
            const nomeDoc = data.documento_nome || 'documento';
            const title = 'Documento assinado';
            const subject = 'Documento assinado — PDF disponível';
            const descricao = `O documento <strong>${nomeDoc}</strong> foi assinado por todos os signatários em ${applicationName}.<br /><br />`
                + `O PDF assinado segue em anexo neste e-mail. Você também pode acessá-lo pelo painel da plataforma.`;
            const content = tampleteMensagemLink({
                title,
                descricao,
                link: URLSITE,
                nomeLink: 'Acessar a plataforma',
                nome: data.nome,
            });
            const nomeArquivo = String(nomeDoc).replace(/[^\w.\-áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ ]+/gi, '_').substring(0, 80);
            const enviado = await Mail.sendEmailFile(subject, data.email, content, {
                nomeArquivo: `${nomeArquivo || 'documento'}.pdf`,
                content: data.pdfBuffer,
            });
            if (!enviado) return { status: false, msg: 'Falha no envio SMTP do documento assinado' }
            return { status: true, msg: 'E-mail do documento assinado enviado' }
        } catch (err) {
            console.log(err)
            logExeption({ error: { err }, identifier: 'documento assinado email' })
            return { status: false, msg: 'Expetion error', error: err }
        }
    }

}

module.exports = new SendMail_usecase();

