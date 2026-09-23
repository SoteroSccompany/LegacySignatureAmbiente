
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');

class ObrasController extends APIUAU {

    constructor() {
        super();
    }

    async GetObras(isRetry = false) {
        try {
            const response = await this.api.post(`/Obras/ObterObrasAtivas`);
            return { status: true, data: this.OutputMapper(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    return { status: true, exit: false, msg: 'Obra não encontrada' }
                }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetObras(true);
                }
                if (err.response.status === 400 || err.response.status === 500 || err.response.status === 403) {
                    return { status: false, msg: err.response.data.message || 'Erro ao conectar com a API UAU!' }
                }
            }
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ err, created_at: dateNowFunction(), updated_at: dateNowFunction(), isDeleted: false }, "Erro ao realizar a busca na api uau")
            return {
                status: false, msg: 'Erro ao conectar com a API UAU!'
            }

        }
    }

    async GetObraById(data, isRetry = false) {
        try {
            const response = await this.api.post(`/Obras/ConsultarObraPorChave`, { empresa: data.empresa, obra: data.obra });
            if (response.data.length === 0) return { status: false, msg: 'Obra não encontrada' }
            if (response.data.length === 1) return { status: false, msg: 'Obra não localizada' }
            return { status: true, data: this.normalizeData(response.data[1]) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    return { status: true, exit: false, msg: 'Obra não encontrada' }
                }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetObraById(data, true);
                }
                if (err.response.status === 400 || err.response.status === 500 || err.response.status === 403) {
                    // console.log(err.response)
                    return { status: false, msg: err.response.data.message || 'Erro ao conectar com a API UAU!' }
                }
            }
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ err, created_at: dateNowFunction(), updated_at: dateNowFunction(), isDeleted: false }, "Erro ao realizar a busca na api uau")
            return {
                status: false, msg: 'Erro ao conectar com a API UAU!'
            }

        }
    }

    normalizeData(item) {
        return {
            codigo_obra: item.cod_obr,
            empresa: item.Empresa_obr,
            // nome_obra: item.Descr_obr,
            // descricao: item.Descr_obr,
            data_inicio: item.dtini_obr,
            data_fim_previsto: item.dtfim_obr,
            data_cadastro: item.DataCad_obr
        }
    }

    OutputMapper(data) {
        return data.map(item => {
            return {
                codigo_obra: item.Cod_obr,
                empresa: item.Empresa_obr,
                nome_obra: item.Descr_obr,
                descricao: item.Descr_obr,
                data_inicio: item.DtIni_obr,
                data_fim_previsto: item.Dtfim_obr,
                data_cadastro: item.DataCad_obr
            }
        });
    }

}


module.exports = ObrasController;