const RabbitMQ = require("../..");
const dateNow = require("../../../functions/data/getToday"); //Remove para gerar o erro de republicacao.
const logs = require("../../../../../Logs");
const { parseBrokerMessageEnvelope } = require("../../../functions/brokerMessageEnvelope");



class CustomPublisherRabbitMQ extends RabbitMQ {

    static _instance = null;

    constructor() {
        super();
    }


    static getInstance() {
        if (!CustomPublisherRabbitMQ._instance) {
            CustomPublisherRabbitMQ._instance = new CustomPublisherRabbitMQ();
        }
        return CustomPublisherRabbitMQ._instance;
    }



    async publishMessageChildren({ exchange, routingKey, delayMs }) {
        const messageJson = parseBrokerMessageEnvelope(this.broker.message);
        messageJson.data_envio = dateNow();
        this.broker.message = JSON.stringify(messageJson);
        await this.saveBroker();
        const msgBuffer = Buffer.from(this.broker.message);

        try {
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
            logs.getInstance().info('🔒 Todas as mensagens foram confirmadas!');
        } catch (error) {
            logs.getInstance().error(error)
            await this.reconnect()
        }
    }

}



module.exports = CustomPublisherRabbitMQ;