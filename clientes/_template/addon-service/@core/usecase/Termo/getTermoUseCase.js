
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const { tipoTermoApi } = require('../../../config');

class getTermoUseCase {

    async listarTermos(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            const response = await apiLegacy.get('/api/admin/termo-responsabilidade?page=0&per_page=100', data.instalacao.chave_api)
            if (!response.status) return { status: false, msg: response.msg || "Não foi possível consultar os termos na API." }
            const termos = (response.data?.data || [])
                .filter((t) => t.ativo && t.tipo_termo === tipoTermoApi.termo_documento)
                .map((t) => ({ id: t.id, titulo_termo: t.titulo_termo }));
            return { status: true, data: termos, msg: "Termos listados com sucesso." }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new getTermoUseCase();
