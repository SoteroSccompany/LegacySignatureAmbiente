
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const domain = require('../../../../@core/domain/Empreendimentos');

class EmpresasController extends APIUAU {

    constructor() {
        super();
    }

    async GetEmpresas(isRetry = false) {
        try {
            await this.Load();
            const response = await this.api.post(`/Empresa/ObterEmpresasAtivas`);
            return { status: true, data: this.OutputMapper(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    return { status: true, exit: false, msg: 'Obra não encontrada' }
                }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetEmpresas(true);
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

    async GetEmpresaById(id, isRetry = false) {
        try {
            const response = await this.api.post(`/Empresa/ConsultarEmpresa`, { codigoEmpresa: id });
            if (!response.data || !response.data[0] || !response.data[0].MyTable || response.data[0].MyTable.length < 2) return { status: false, msg: 'Resposta da API UAU em formato inesperado, tente novamente em instantes' }
            const empresa = response.data[0].MyTable[1];
            if (empresa.Codigo_emp !== parseInt(id)) return { status: false, msg: 'Empreendimento referência não encontrado na API UAU, verifique o ID e tente novamente' }
            return { status: true, data: this.normalizeData(empresa) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    return { status: true, exit: false, msg: 'Obra não encontrada' }
                }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetEmpresaById(id, true);
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

    normalizeData(data) {
        return new domain({
            nome_empreendimento: data.Desc_emp,
            codigo_empreendimento: data.Codigo_emp,
            empreendimento_referencia: data.Codigo_emp,
            data_criacao: new Date()
        })
    }

    OutputMapper(data) {
        return data.map(item => new domain({
            nome_empreendimento: item.Desc_emp,
            codigo_empreendimento: item.Codigo_emp,
            empreendimento_referencia: item.Codigo_emp,
            data_criacao: new Date()
        }))
    }

}


module.exports = EmpresasController;