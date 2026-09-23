
const knex = require('../../../infrastructure/db/config/databaseConection')();
const logExeption = require('../Logs/exeption/exeptionAlertaUsuario');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');

class listAlertasUsuarioUseCase {

    async indexAlertas(data) {
        try {
            if (!data.user_id) return { status: false, msg: 'Usuário não autenticado.' }
            const limit = Number(data.limit) > 0 ? Math.min(Number(data.limit), 100) : 50;
            const offset = Number(data.offset) >= 0 ? Number(data.offset) : 0;
            const query = knex('tab_alerta_usuario')
                .select(
                    'id',
                    'tipo',
                    'titulo',
                    'mensagem',
                    'referencia_tipo',
                    'referencia_id',
                    'evento_id',
                    'meta_dados',
                    'lido',
                    'criado_em'
                )
                .where('user_id', data.user_id)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .limit(limit)
                .offset(offset);
            const filtroLido = (data.lido === true || data.lido === false || data.lido === 'true' || data.lido === 'false');
            if (filtroLido) {
                query.andWhere('lido', data.lido === true || data.lido === 'true');
            }
            const totalQuery = knex('tab_alerta_usuario')
                .count({ total: 'id' })
                .where('user_id', data.user_id)
                .andWhere('deletado', false);
            if (filtroLido) {
                totalQuery.andWhere('lido', data.lido === true || data.lido === 'true');
            }
            const totalRow = await totalQuery.first();
            const rows = await query;
            const dataMapped = rows.map((row) => ({
                ...row,
                meta_dados: typeof row.meta_dados === 'string' ? JSON.parse(row.meta_dados) : row.meta_dados,
            }));
            return {
                status: true,
                msg: 'Alertas carregados com sucesso.',
                data: dataMapped,
                paginacao: { total: Number(totalRow.total), limit, offset },
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
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case AlertaUsuario - listAlertasUsuarioUseCase - indexAlertas',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async marcarLido(data) {
        try {
            if (!data.user_id) return { status: false, msg: 'Usuário não autenticado.' }
            if (!data.id) return { status: false, msg: 'Id não pode ser vazio.' }
            const alerta = await knex('tab_alerta_usuario')
                .select('id', 'lido')
                .where('id', data.id)
                .andWhere('user_id', data.user_id)
                .andWhere('deletado', false)
                .first();
            if (!alerta) return { status: false, msg: 'Alerta não encontrado.' }
            if (alerta.lido) return { status: true, msg: 'Alerta já estava marcado como lido.' }
            await knex('tab_alerta_usuario')
                .update({ lido: true })
                .where('id', data.id)
                .andWhere('user_id', data.user_id);
            return { status: true, msg: 'Alerta marcado como lido.' }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case AlertaUsuario - listAlertasUsuarioUseCase - marcarLido',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new listAlertasUsuarioUseCase();
