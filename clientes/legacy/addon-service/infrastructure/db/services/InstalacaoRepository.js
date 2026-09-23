
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class InstalacaoRepository {

    async createInstalacao(data) {
        try {
            await knex('tab_instalacao').insert(data)
            return { status: true, msg: "Instalação criada com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - createInstalacao')
            return { status: false, error: error, msg: "Não foi possivel criar a instalação!" }
        }
    }

    async getInstalacaoById(data) {
        try {
            const response = await knex('tab_instalacao').select('*').where('id', data.id).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Instalação encontrada com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Instalação não encontrada!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - getInstalacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar a instalação!" }
        }
    }

    async getInstalacaoByCredencialHash(data) {
        try {
            const response = await knex('tab_instalacao').select('*').where('credencial_hash', data.credencial_hash).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Instalação encontrada com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Instalação não encontrada!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - getInstalacaoByCredencialHash')
            return { status: false, error: error, msg: "Não foi possivel buscar a instalação!" }
        }
    }

    async getInstalacaoAtivaByEmail(data) {
        try {
            const response = await knex('tab_instalacao').select('*')
                .where('email_usuario', data.email_usuario)
                .andWhere('status', 'ATIVA')
                .andWhere('deletado', false)
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Instalação encontrada com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Instalação não encontrada!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - getInstalacaoAtivaByEmail')
            return { status: false, error: error, msg: "Não foi possivel buscar a instalação!" }
        }
    }

    // Uma instalação ativa por e-mail: emitir/vincular de novo para a mesma conta
    // Google revoga a anterior, no mesmo espírito da lsak_ (uma ativa por user_id).
    async revogarInstalacoesAtivasByEmail(data) {
        try {
            await knex('tab_instalacao').update({ status: 'REVOGADA', data_atualizacao: dateNow() })
                .where('email_usuario', data.email_usuario)
                .andWhere('status', 'ATIVA')
                .andWhere('deletado', false)
            return { status: true, msg: "Instalações ativas revogadas com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - revogarInstalacoesAtivasByEmail')
            return { status: false, error: error, msg: "Não foi possivel revogar as instalações ativas!" }
        }
    }

    async getInstalacoes() {
        try {
            const response = await knex('tab_instalacao')
                .select('id', 'nome', 'chave_api_prefixo', 'email_usuario', 'chave_admin', 'escopo', 'credencial_prefixo', 'pasta_raiz_drive', 'status', 'ultimo_uso', 'data_criacao', 'data_atualizacao')
                .where('deletado', false).orderBy('data_criacao', 'desc')
            return { status: true, exit: response.length > 0, data: response, msg: "Instalações listadas com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - getInstalacoes')
            return { status: false, error: error, msg: "Não foi possivel listar as instalações!" }
        }
    }

    async updateInstalacao(data) {
        try {
            const check = await this.getInstalacaoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_instalacao').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Instalação atualizada com sucesso!" }
            } else {
                return { status: false, msg: "Instalação não encontrada!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - updateInstalacao')
            return { status: false, error: error, msg: "Não foi possivel atualizar a instalação!" }
        }
    }

    async updateUltimoUso(data) {
        try {
            await knex('tab_instalacao').update({ ultimo_uso: data.ultimo_uso, data_atualizacao: data.ultimo_uso }).where('id', data.id)
            return { status: true, msg: "Último uso atualizado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no InstalacaoRepository - updateUltimoUso')
            return { status: false, error: error, msg: "Não foi possivel atualizar o último uso!" }
        }
    }

}

module.exports = new InstalacaoRepository();
