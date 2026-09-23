const RabbitMqConfig = require("./config");
const dateNow = require('../functions/data/getToday')
const { statusBroker } = require('../../../certs/index');
const getBrokerUsecase = require("../../../@core/usecase/Broker/getBrokerUseCase");
const createBrokerUseCase = require("../../../@core/usecase/Broker/createBrokerUseCase");
const updateBrokerUsecase = require("../../../@core/usecase/Broker/updateBrokerUseCase");
const Broker = require("../../../@core/domain/Broker");
const logs = require('../../../Logs')
const moment = require('moment');


class RabbitMQ extends RabbitMqConfig {

    broker = null;
    tipo_intervalo_tempo = null;
    intervalo_tempo = null;
    ultima_execucao = null;
    proxima_execucao = null;
    configuracao_busca = null;
    static _instance = null;

    constructor() {
        super();
    }

    static getInstance() {
        if (!RabbitMQ._instance) {
            RabbitMQ._instance = new this();
        }
        return RabbitMQ._instance;
        // return new this();
    }

    async consumeMessage({ exchange, routingKeyPattern, queue, callback }) {
        try {
            // console.log(`🔄 Iniciando consumidor para a exchange "${exchange}"...`);

            // Criar canal
            const channel = await this.getConfirmChannel();
            if (!channel || channel.connection.stream.destroyed) {
                throw new Error('❌ Canal não instanciado');
            }
            await channel.prefetch(1);

            await channel.assertExchange(exchange, 'topic', { durable: true });

            // Criar fila (caso não exista)
            await channel.assertQueue(queue, {
                durable: true
            });

            // Ligar a fila à exchange usando o padrão da routing key
            await channel.bindQueue(queue, exchange, routingKeyPattern);

            // console.log(` [*] Aguardando mensagens na fila "${queue}" com routing key "${routingKeyPattern}". Para sair, pressione CTRL+C`);

            // Consumir mensagens
            const { consumerTag } = await channel.consume(queue, async (msg) => {
                if (msg !== null) {
                    try {
                        await callback(msg, channel);
                    } catch (err) {
                        logs.getInstance().error({ error: err, descricaoDoErro: err.message }, 'Erro ao processar mensagem consumida');
                    }
                }
            }, { noAck: false });
            return consumerTag;;
        } catch (error) {
            throw new Error(`Erro ao consumir mensagens: ${error.message}`);
        }
    }

    async publishMessage({ exchange, routingKey, jsonMessage, delayMs }) {
        const objBroker = new Broker({ exchange, key: routingKey, delayMs, message: jsonMessage, status: statusBroker.pending, data_criacao: dateNow() })
        const message = JSON.stringify({ data: jsonMessage, idSystem: objBroker.id, data_envio: dateNow() });
        const msgBuffer = Buffer.from(message);
        objBroker.message = message;
        try {
            const response = await createBrokerUseCase.indexBroker(objBroker)
            if (!response.status) {
                return { status: false, msg: 'Erro ao salvar a mensagem no banco de dados' }
            }
            logs.getInstance().info('📤 Publicando mensagem');
            logs.getInstance().info('📌 Exchange: ' + exchange);
            logs.getInstance().info('🔑 Routing Key: ' + routingKey);

            const channel = await this.getConfirmChannel();

            if (!channel || channel.connection.stream.destroyed) {
                //Aqui tem que marcar como erro a publicacao na table do broker
                throw new Error('❌ Canal não instanciado');
            }

            await channel.prefetch(1);
            await channel.assertExchange(exchange, 'topic', {
                durable: true,
                // exclusive: true, //Alteracao para teste
            });


            const delayQueue = `${routingKey}_delayed`;

            await channel.assertQueue(delayQueue, {
                durable: true,
                arguments: {
                    // 'x-message-ttl': delayMs,
                    'x-dead-letter-exchange': exchange,
                    'x-dead-letter-routing-key': routingKey
                }
            });

            await channel.assertQueue(routingKey, {
                durable: true
            });

            await channel.bindQueue(routingKey, exchange, routingKey);


            await channel.sendToQueue(delayQueue, msgBuffer, {
                persistent: true,
                expiration: `${delayMs}`
            }, (err, _) => {
                if (err) {
                    logs.getInstance().error('❌ Mensagem rejeitada!', err);
                } else {
                    logs.getInstance().info('✔️ Mensagem aceita');
                }
            });

            await channel.waitForConfirms(); // Espera pela confirmação de todas as mensagens
            this.broker = objBroker;
            logs.getInstance().info('🔒 Todas as mensagens foram confirmadas!');
        } catch (error) {
            logs.getInstance().error(error)
            objBroker.status = statusBroker.failed;
            objBroker.data_atualizacao = dateNow();
            await updateBrokerUsecase.indexBroker(objBroker)
            await this.reconnect()
        }
    }

    async rePublishMessage(broker) {
        try {
            logs.getInstance().info('📤 Republicando a mensagem');
            logs.getInstance().info('📌 Exchange: ' + broker.exchange);
            logs.getInstance().info('🔑 Routing Key: ' + broker.routingKey);

            const channel = await this.getConfirmChannel();

            if (!channel || channel.connection.stream.destroyed) {
                //Aqui tem que marcar como erro a republicacao na table do broker
                throw new Error('❌ Canal não instanciado');
            }

            await channel.prefetch(1);
            await channel.assertExchange(broker.exchange, 'topic', {
                durable: true,
                exclusive: true,
            });


            const delayQueue = `${broker.key}_delayed`;

            await channel.assertQueue(delayQueue, {
                durable: true,
                arguments: {
                    // 'x-message-ttl': delayMs,
                    'x-dead-letter-exchange': broker.exchange,
                    'x-dead-letter-routing-key': broker.key
                }
            });

            // await channel.bindQueue(delayQueue, broker.exchange, broker.key); //Pode quebrar

            await channel.assertQueue(broker.key, {
                durable: true
            });

            await channel.bindQueue(broker.key, broker.exchange, broker.key);


            await channel.sendToQueue(delayQueue, broker.message, {
                persistent: true,
                expiration: `${broker.delayMs}`
            }, (err, _) => {
                if (err) {
                    logs.getInstance().error('❌ Mensagem rejeitada!', err);
                } else {
                    logs.getInstance().info('✔️ Mensagem aceita');
                }
            });

            await channel.waitForConfirms(); // Espera pela confirmação de todas as mensagens
            logs.getInstance().info('🔒 Todas as mensagens foram confirmadas!');
            broker.status = statusBroker.pending;
            broker.data_atualizacao = dateNow();
            await updateBrokerUsecase.indexBroker(broker)
        } catch (error) {
            logs.getInstance().error(error)
            broker.status = statusBroker.failed;
            broker.data_atualizacao = dateNow();
            await updateBrokerUsecase.indexBroker(broker)
            await this.reconnect()
        }
    }

    async loadBroker(id) {
        try {
            const broker = await getBrokerUsecase.getBrokerLoad({ id })
            if (!broker.status) throw new Error('❌ Broker não encontrado');
            this.broker = new Broker({
                ...broker.data,
                id: broker.data.broker_id,
                data_criacao: moment(broker.data.data_atualizacao_broker).format('YYYY-MM-DD HH:mm:ss'),
                data_atualizacao: moment(broker.data.data_criacao_broker).format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            logs.getInstance().error(error)
        }
    }

    async finishBroker(knex) {
        try {
            await updateBrokerUsecase.indexBrokerInterno(this.broker, knex)
            console.log('Sucesso ao finalizar o broker e atualizar as configurações de busca!');
        } catch (error) {
            logs.getInstance().error(error)
        }
    }

    async saveBroker(trx) {
        if (trx) {
            // return await updateBrokerUsecase.indexBrokerInterno(this.broker, trx)
            return await updateBrokerUsecase.indexBrokerInterno(this, trx)
        } else return await updateBrokerUsecase.indexBrokerInternoData(this)

    }


}

module.exports = RabbitMQ;