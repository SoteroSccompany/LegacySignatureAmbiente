
const repositorioEvento = require('../../../infrastructure/db/services/EventoRastreioRepository');
const domainEvento = require('../../domain/EventoRastreio');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const { eventoRastreio, urlSite } = require('../../../config');
const logs = require('../../../Logs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class createUsuarioAddonUseCase {

    async indexUsuario(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            if (!data.instalacao.chave_admin) return { status: false, msg: "A chave vinculada não é de administrador. Somente chaves de admin criam usuários." }
            if (!data.email || !EMAIL_REGEX.test(data.email.trim())) return { status: false, msg: "E-mail inválido." }
            if (isNaN(data.role)) return { status: false, msg: "Role não pode ser vazio." }
            const role = parseInt(data.role);
            if (role !== 0 && role !== 1) return { status: false, msg: "Permissão inválida. O Addon cadastra apenas admin ou gerente." }
            const response = await apiLegacy.post('/api/admin/user/create', { email: data.email.trim(), role }, data.instalacao.chave_api)
            if (!response.status) return { status: false, msg: response.msg || "A API recusou a criação do usuário." }
            await repositorioEvento.createEvento(new domainEvento({
                instalacao_id: data.instalacao.id,
                tipo_evento: eventoRastreio.usuario_criado,
                meta_dados: { email: data.email.trim(), role },
            }).getEventoRastreio());
            // A identidade (senha, 2FA, perfil, biometria, termo) é concluída no site — o e-mail da API já aponta para lá.
            return { status: true, msg: response.msg || "Usuário criado. As orientações foram enviadas por e-mail.", data: { site: urlSite } }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no createUsuarioAddonUseCase - indexUsuario')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async listarUsuarios(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            if (!data.instalacao.chave_admin) return { status: false, msg: "A chave vinculada não é de administrador." }
            const response = await apiLegacy.get(`/api/admin/user?page=${data.page || 0}&per_page=${data.per_page || 100}`, data.instalacao.chave_api)
            if (!response.status) return { status: false, msg: response.msg || "A API recusou a listagem de usuários." }
            return { status: true, data: response.data?.data || [], msg: "Usuários listados com sucesso." }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new createUsuarioAddonUseCase();
