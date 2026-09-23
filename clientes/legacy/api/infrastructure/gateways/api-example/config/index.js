require('dotenv/config');
const axios = require('axios');
const Cache = require('../../Cache');
const logs = require('../../../../Logs');
const { redis } = require('../../../../certs/index');

class APIUAU extends Cache {

    static #instance;
    #api = null;

    constructor() {
        super();
        this.validate();
    }

    validate() {
        if (this.#api === null) {
            const headers = {
                'Content-Type': 'application/json',
                'X-INTEGRATION-Authorization': process.env.KEY_API_UAU,
                'Accept': 'application/json',
            }
            this.#api = axios.create({
                baseURL: `${process.env.API_UAU_HOST}:${process.env.API_UAU_PORT}${process.env.API_UAU_SUFIXO}`,
                headers: headers
            });
        }
    }

    static getInstance() {
        return new APIUAU();
    }

    get api() {
        this.validate();
        return this.#api;
    }

    async Load(refresh = false) {
        try {
            const authorization = await this.getCache({ key: 'api_uau_authorization' });
            if (!authorization) {
                const response = await this.#api.post('/Autenticador/AutenticarUsuario', this.PayloadLogin());
                await this.setCache({ key: 'api_uau_authorization', value: response.data, expiration: redis.timeDefault }); // 2 horas
                this.#api.defaults.headers['Authorization'] = response.data;
            } else {
                if (refresh) {
                    const response = await this.#api.post('/Autenticador/AutenticarUsuario', this.PayloadLogin());
                    await this.setCache({ key: 'api_uau_authorization', value: response.data, expiration: redis.timeDefault }); // 2 horas
                    this.#api.defaults.headers['Authorization'] = response.data;
                }
                this.#api.defaults.headers['Authorization'] = authorization;
            }
        } catch (error) {
            if (error.status && error.status === 401) {
                logs.getInstance().fatal({ error, created_at: new Date(), updated_at: new Date(), isDeleted: false }, "Erro de autenticação na API UAU")
                return { status: false, msg: 'Erro de autenticação na API UAU!' }
            }
            logs.getInstance().error({ error, created_at: new Date(), updated_at: new Date(), isDeleted: false }, "Erro ao carregar a API UAU")
            throw new Error('Erro ao carregar a API UAU!');
        }

    }

    PayloadLogin() {
        return {
            "Login": process.env.API_UAU_USUARIO,
            "Senha": process.env.API_UAU_SENHA,
            "UsuarioUAUSite": process.env.API_UAU_USUARIO_SITE
        }
    }

}


module.exports = APIUAU;