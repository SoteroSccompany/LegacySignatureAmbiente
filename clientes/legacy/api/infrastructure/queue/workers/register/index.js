const path = require('path');
const logs = require('../../../../Logs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const RabbitMQ = require("../../../gateways/rabbitmq/index");
const {
    handlerHashInicial,
    handlerAplicarAssinatura,
    handlerDistribuirConviteSignatario,
    handlerProcessarBiometria,
    handlerSelarDocumentoVault,
    handlerNotificarCancelamentoDocumento,
    handlerEnviarDocumentoAssinadoSignatarios
} = require('../../handler/index');
const { rabbitMQ: Rabbit } = require('../../../../certs/index');




class RabbitMQConsumer {
    static instance = null;

    constructor() {
        if (!RabbitMQConsumer.instance) {
            this.isConsuming = false;
            this.reconnecting = false;
            this.retryCount = 0;
            this.consumerTag = null;
            this.consumerChannel = null;
            RabbitMQConsumer.instance = this;
        }
        return RabbitMQConsumer.instance;
    }

    async startConsuming() {
        try {
            if (this.isConsuming) return;

            await this.cancelarConsumerAtivo();

            console.log("🚀 Iniciando consumidor de mensagens...");
            const rabbitMQ = RabbitMQ.getInstance();
            if (!rabbitMQ) {
                console.error("❌ RabbitMQ não instanciado.");
                return await this.restartConsumer();
            }

            const channel = await rabbitMQ.getConfirmChannel();
            if (!channel) {
                console.error("❌ Falha ao obter canal de confirmação.");
                return await this.restartConsumer();
            }
            this.consumerChannel = channel;

            const connection = await rabbitMQ.getConnection();
            if (!connection) {
                console.error("❌ Falha ao obter conexão.");
                return await this.restartConsumer();
            }
            this.reconnecting = false;


            const fila = this.MountConsumer(process.env.QUEUE_NAME);
            if (!fila) {
                console.error("❌ Configuração da fila falhou.");
                return await this.restartConsumer();
            }

            this.consumerTag = await rabbitMQ.consumeMessage(fila);
            this.isConsuming = true;


            // Remover listeners antigos
            channel.removeAllListeners?.("close");
            connection.removeAllListeners?.("close");
            connection.removeAllListeners?.("error");

            // Adicionar listeners para reconectar em caso de falha
            channel.on("close", async () => {
                console.error("🔴 5651Canal fechado! Reiniciando consumidor...");
                this.isConsuming = false;
                return await this.restartConsumer();
            });
            this.reconnecting = false;
            this.retryCount = 0;
            console.log("✅ Consumidor de mensagens pronto!");
        } catch (error) {
            console.error("❌ Erro no consumo de mensagens:", error);
            return await this.restartConsumer();
        }
    }

    async restartConsumer() {
        if (this.reconnecting) return;
        this.reconnecting = true;

        this.isConsuming = false;
        await this.cancelarConsumerAtivo();
        const rabbitMQ = RabbitMQ.getInstance();
        rabbitMQ.resetChannels();


        if (this.retryCount === 0) {
            console.log("⚡ Tentando reconectar imediatamente...");
            this.retryCount++;
            setImmediate(() => this.startConsuming());
        } else {
            const retryDelay = Math.min(5000 * this.retryCount, 60000); // Máximo de 60 segundos
            console.log(`🔄 Tentando 654654  reconectar em ${retryDelay / 1000} segundos...`);
            this.retryCount++;
            setTimeout(() => this.startConsuming(), retryDelay);
        }
    }

    async cancelarConsumerAtivo() {
        if (!this.consumerTag || !this.consumerChannel) return;
        try {
            await this.consumerChannel.cancel(this.consumerTag);
        } catch (error) {
            logs.getInstance().warn({ err: error }, 'Falha ao cancelar consumer anterior');
        } finally {
            this.consumerTag = null;
            this.consumerChannel = null;
        }
    }


    MountConsumer(fila) {
        switch (fila) {
            case 'processarhashinicial':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.processarhashinicial.routingKey,
                    queue: Rabbit.queues.processarhashinicial.name,
                    callback: handlerHashInicial
                }
            case 'aplicarassinatura':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.aplicarassinatura.routingKey,
                    queue: Rabbit.queues.aplicarassinatura.name,
                    callback: handlerAplicarAssinatura
                }
            case 'distribuirconvitesignatario':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.distribuirconvitesignatario.routingKey,
                    queue: Rabbit.queues.distribuirconvitesignatario.name,
                    callback: handlerDistribuirConviteSignatario
                }
            case 'processarbiometria':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.processar_biometria.routingKey,
                    queue: Rabbit.queues.processar_biometria.name,
                    callback: handlerProcessarBiometria
                }
            case 'selardocumentovault':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.selardocumentovault.routingKey,
                    queue: Rabbit.queues.selardocumentovault.name,
                    callback: handlerSelarDocumentoVault
                }
            case 'notificarcancelamentodocumento':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.notificarcancelamentodocumento.routingKey,
                    queue: Rabbit.queues.notificarcancelamentodocumento.name,
                    callback: handlerNotificarCancelamentoDocumento
                }
            case 'enviardocumentoassinadosignatarios':
                return {
                    exchange: Rabbit.exchanges.assinatura,
                    routingKey: Rabbit.queues.enviardocumentoassinadosignatarios.routingKey,
                    queue: Rabbit.queues.enviardocumentoassinadosignatarios.name,
                    callback: handlerEnviarDocumentoAssinadoSignatarios
                }
            default:
                console.error("Fila desconhecida:", fila);
                return null;

        }

    }
}

// Capturar eventos globais para evitar que o Node.js morra
// process.on('uncaughtException', (error) => {
//     console.error("⚠️ Erro não tratado:", error);
// });

// process.on('unhandledRejection', (reason, promise) => {
//     console.error("⚠️ Rejeição de promessa não tratada:", reason);
//     console.error("  ↳ Promessa:", promise);
// });

// 🚀 Iniciar consumidor usando a classe Singleton
const consumer = new RabbitMQConsumer();
consumer.startConsuming().catch(err => console.error("Erro ao consumir mensagens:", err));
