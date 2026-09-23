// Import the RabbitMQ class
const RabbitMQ = require('./index');
const path = require('path');
// const moment = require('moment');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function testRabbitMQ() {
    const rabbitMQ = RabbitMQ.getInstance();

    // Defina o nome da fila
    // const queueName = 'process.env.RABBITMQ_QUEUE';

    // // Função callback que será chamada quando uma mensagem for consumida
    // function handleMessage(msg) {
    //     console.log("Received message:", msg.content.toString());
    //     // Aqui você poderia adicionar mais lógica de processamento de mensagem
    // }

    // // Consumir mensagens
    // await rabbitMQ.consumeMessage({ queue: queueName, callback: handleMessage });

    // Publicar uma mensagem
    const message = {
        text: 'Teste de mensagem nao recebida -> nack'

    }

    await rabbitMQ.publishMessage({
        exchange: 'assinaturas',
        routingKey: 'fatura.gerar',
        jsonMessage: message,
        delayMs: 15000, //15 segundos
    });

    // await rabbitMQ.publishMessageSchenduled({ queue: queueName, message: message, timems: 60000 });

    console.log('Mensagem publicada com sucesso! Exchange: assinaturas, routing key: fatura.gerar');
}

testRabbitMQ()
    .catch(error => {
        console.error('Error in RabbitMQ test:', error);
    });
