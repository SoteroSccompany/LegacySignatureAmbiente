

const axios = require('axios');

module.exports = async (cep) => {
    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)
        if (response.data.erro) return { status: false, msg: "CEP não encontrado." };
        return { status: true, data: response.data, msg: "CEP encontrado com sucesso." };
    } catch (err) {
        return { status: false, msg: `Erro ao buscar CEP. Entrar em contato com o suporte - ${err.response.status}` };
    }
}