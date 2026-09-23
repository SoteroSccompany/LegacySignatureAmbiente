const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const amqp = require('amqplib');
const dateNow = require('../../functions/data/getToday')


const logs = require('../../../../Logs');

const RepublisherMessagesRabbitMq = require('../republisher')

class RabbitMqConfig {

    static #instance = null;
    #connection = null;
    #retryCount = 0;
    #error = null;
    #channel = null;
    #confirmChannel = null;
    #isReconnecting = false;

    resetChannels() {
        this.#channel = null;
        this.#confirmChannel = null;
    }

    async initConnection() {
        if (this.#connection) {
            return this.#connection; // Retorna a conexão existente se já estiver inicializada
        }
        try {
            const vhost = process.env.RABBITMQ_VHOST || '/';
            const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}/${encodeURIComponent(vhost)}`;
            this.#connection = await amqp.connect(url);
            //console.log("✅ Conectado ao RabbitMQ com sucesso!");

            // Em caso de erro na conexão, capturar para reinicializar
            this.#connection.on("error", (err) => {
                console.error("❌ Erro na conexão com RabbitMQ:", err.message);
                logs.getInstance().error({
                    error: err,
                    message: err.message,
                    linhaDoErro: "41",
                    nomeDoArquivo: "RabbitMqConfig.js",
                    data_criacao: dateNow(),
                    data_atualizacao: dateNow(),
                    deletado: false,
                }, "Erro na conexão com RabbitMQ");
                this.#connection = null; // Resetar conexão para reestabelecê-la depois
                this.reconnect(); // Tentar reconectar
            });

            this.#connection.on("close", async () => {
                console.error("🔴 Conexão com RabbitMQ fechada! Tentando reconectar... *******");
                this.#connection = null; // Resetar conexão para reestabelecê-la depois
                await this.reconnect();
            });
            //Aqui tem que mandar algo para processar as publicacoes que falharam em quanto o brokers estava fora do ar.
            if (this.#retryCount > 0) {
                RepublisherMessagesRabbitMq(this).catch(err => logs.getInstance().error(err, "Erro ao republicar mensagens:"));
                console.log('Deve configurar o republisher aqui')
            }
            this.#isReconnecting = false; // Resetar flag de reconexão
            this.#retryCount = 0; // Resetar contagem de tentativas
            this.#error = null; // Resetar erro
            return this.#connection;
        } catch (error) {

            this.#error = error;
            this.reconnect(); // Tentar reconectar
        }
    }

    async reconnect() {
        if (this.#isReconnecting) return;
        this.#isReconnecting = true;
        try {
            if (this.#retryCount > process.env.MAXRETRY_RABBITMQ) {
                logs.getInstance().error({
                    error: this.#error,
                    message: this.#error.message,
                    linhaDoErro: "51",
                    nomeDoArquivo: "rabbitmq.config.index.js",
                    data_criacao: dateNow(),
                    data_atualizacao: dateNow(),
                    deletado: false,
                }, "Erro ao conectar ao RabbitMQ");
                const thiretyMinutes = 1800000;
                this.#connection = null;
                this.#channel = null;
                this.#confirmChannel = null;
                this.#retryCount = 0;

                setTimeout(async () => {
                    await this.initConnection();
                }, thiretyMinutes);
                return;
            }
            this.#channel = null;
            this.#connection = null;
            this.#confirmChannel = null;

            if (this.#retryCount === 0) {
                //console.log("🔄 Tentando reconectar ao RabbitMQ...");
                this.#retryCount++;
                await this.initConnection();
                return;
            }
            const delay = Math.min(5000 * (this.#retryCount + 1), 30000); // Máx. 30 segundos
            //console.log(`🔄 Tentando reconectar ao RabbitMQ em ${delay / 1000} segundos...`);
            this.#retryCount++;
            setTimeout(async () => {
                await this.initConnection();
            }, delay);

        } finally {
            this.#isReconnecting = false; // Resetar flag de reconexão
        }
    }

    async getChannel() {
        if (!this.#channel) {
            const connection = await this.initConnection();
            if (!connection) return null;
            this.#channel = await connection.createChannel();
        }
        return this.#channel;
    }

    async getConfirmChannel() {
        if (!this.#confirmChannel) {
            const connection = await this.initConnection();
            if (!connection) return null;
            this.#confirmChannel = await connection.createConfirmChannel();
        }
        return this.#confirmChannel;
    }


    /**
     * Retorna a conexão ativa
     */
    async getConnection() {
        if (this.#connection?.connection?.stream?.destroyed) {
            this.#connection = null;
            return this.#connection;
        }
        return this.initConnection();
    }

    /**
     * Método estático para garantir a instância única
     */
    static getInstance() {
        if (!RabbitMqConfig.#instance) {
            RabbitMqConfig.#instance = new this();
        }
        return RabbitMqConfig.#instance;
    }

}

module.exports = RabbitMqConfig