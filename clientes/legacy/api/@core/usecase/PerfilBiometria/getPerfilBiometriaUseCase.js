

const repository = require('../../../infrastructure/db/services/PerfilBiometriaRepository');
const repositoryPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository.js');
const domain = require('../../domain/PerfilBiometria');
const logExeption = require('../Logs/exeption/exeptionPerfilBiometria');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { historico, etapas_perfil_usuario, status_perfil_usuario, roles } = require('../../../certs');
const bucketGateway = require('../../../infrastructure/gateways/Bucket/index.js');
const GetUserUsecase = require('../Usuario/getUsuario');


class getPerfilBiometriaUseCase {

    async getPerfilBiometria() {
        try {
            const response = await repository.getPerfilBiometria()
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - getPerfilBiometriaUseCase -getPerfilBiometria', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilBiometriaFotoAprovacao(data) {
        try {
            // Único admin aprovando a própria biometria: exige que ele seja mesmo admin
            // e que não exista um segundo admin que devesse aprovar em seu lugar.
            if (data.user_id === data.usuario_id) {
                const checkAprovador = await GetUserUsecase.getById({ id: data.user_id });
                if (!checkAprovador.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
                if (checkAprovador.user.role !== roles.admin) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                const checkAdmins = await GetUserUsecase.getAllAdmin();
                if (!checkAdmins.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
                if (checkAdmins.data.length !== 1) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                if (checkAdmins.data[0].id !== data.user_id) return { status: false, msg: "Não é possível aprovar a própria biometria." }
            }
            const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.usuario_id })
            if (!checkPerfil.status || !checkPerfil.exit) return { status: false, msg: 'Não existe perfil de usuário cadastrado para este usuário' }
            const perfil = checkPerfil.data
            const checkPerfilBiometria = await repository.getPerfilBiometriaByPerfilId({ perfil_id: perfil.id })
            if (!checkPerfilBiometria.status || !checkPerfilBiometria.exit) return { status: false, msg: 'Não existe perfil biometrico cadastrado para este usuário' }
            const biometria = checkPerfilBiometria.data
            if (perfil.status === status_perfil_usuario.aprovado) return { status: false, msg: 'Perfil de usuário já aprovado, não é possível aprovar novamente' }
            if (perfil.etapa !== etapas_perfil_usuario.facial) return { status: false, msg: 'Perfil de usuário não está na etapa de aprovação biometrica' }
            if (!biometria.bucket_wip_path) return { status: false, msg: 'Foto de referência não disponível para aprovação.' }
            const bucket = bucketGateway.Wip();
            const checkArquivo = await bucket.obterArquivoBase64({ objectName: biometria.bucket_wip_path });
            if (!checkArquivo.status) return { status: false, msg: checkArquivo.msg };
            return {
                status: true,
                object: biometria,
                url: checkArquivo.data.image_base64,
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - getPerfilBiometriaUseCase -getPerfilBiometria', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


    async getMinhaBiometria(data) {
        try {
            const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.user_id })
            if (!checkPerfil.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPerfil.exit) return { status: false, msg: "Complete seu cadastro de perfil." }
            const checkBiometria = await repository.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfil.data.id })
            if (!checkBiometria.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkBiometria.exit) return { status: true, exit: false, data: null }
            const biometria = checkBiometria.data
            return {
                status: true,
                exit: true,
                data: {
                    data_criacao: biometria.data_criacao,
                    aprovado_em: biometria.aprovado_em,
                    aprovado: !!biometria.aprovado_por,
                },
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - getPerfilBiometriaUseCase - getMinhaBiometria', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPendentesAprovacao() {
        try {
            const response = await repository.getPendentesAprovacao()
            if (!response.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            return { status: true, data: response.data, msg: response.msg }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - getPerfilBiometriaUseCase - getPendentesAprovacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilBiometriaById(data) {
        try {
            const response = await repository.getPerfilBiometriaById(data)
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - getPerfilBiometriaUseCase - getPerfilBiometriaById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilBiometriaByQuery(data) {
        try {
            const response = await repository.getPerfilBiometriaByQuery(data)
            if (response.status) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria- getPerfilBiometriaUseCase - getPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilBiometriaByQueryIdHistorico(data, id) {
        try {
            const response = await repository.getPerfilBiometriaByQueryIdHistorico(data, "objeto_id", id)
            if (response.status) {
                response.data.forEach(item => {
                    item.transformacao = historico.trnasformcao.create.value === item.transformacao ? historico.trnasformcao.create.label :
                        historico.trnasformcao.update.value === item.transformacao ? historico.trnasformcao.update.label :
                            historico.trnasformcao.delete.value === item.transformacao ? historico.trnasformcao.delete.label : item.transformacao;
                    item.dado_atual = JSON.parse(item.dado_atual);
                    item.dado_antigo = JSON.parse(item.dado_antigo);
                });
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria- getPerfilBiometriaUseCase - getPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new getPerfilBiometriaUseCase();

