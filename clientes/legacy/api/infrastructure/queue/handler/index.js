const moment = require('moment');
const RabbitMQ = require('../../gateways/rabbitmq/custom/publish');
const { statusAplication, statusApp, rabbitMQ: Rabbit } = require('../../../certs/index');
const logs = require('../../../Logs');
const ProcessarHashInicial = require('./ProcessarHashInicial');
const AplicarAssinatura = require('./AplicarAssinatura');
const DistribuirConviteSignatario = require('./DistribuirConviteSignatario');
const ProcessarBiometria = require('./ProcessarBiometria');
const SelarDocumentoVault = require('./SelarDocumentoVault');
const NotificarCancelamentoDocumento = require('./NotificarCancelamentoDocumento');
const EnviarDocumentoAssinadoSignatarios = require('./EnviarDocumentoAssinadoSignatarios');
const knex = require('../../db/config/databaseConection')();


async function safeChannelAck(channel, msg) {
    try {
        await channel.ack(msg);
    } catch (e) {
        logs.getInstance().warn({ err: e }, 'ack ignorado (canal fechado)');
    }
}

async function safeChannelNack(channel, msg, allUpTo, requeue) {
    try {
        await channel.nack(msg, allUpTo, requeue);
    } catch (e) {
        logs.getInstance().warn({ err: e }, 'nack ignorado (canal fechado)');
    }
}


const handlerHashInicial = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const hashInicial = new ProcessarHashInicial(rabbit, knex);
        await hashInicial.processar();
        if (hashInicial.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.processarhashinicial.routingKey,
                delayMs: hashInicial.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerHashInicial): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerHashInicial")
    }
}

const handlerAplicarAssinatura = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const aplicar = new AplicarAssinatura(rabbit, knex);
        await aplicar.processar();
        if (aplicar.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.aplicarassinatura.routingKey,
                delayMs: aplicar.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerAplicarAssinatura): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerAplicarAssinatura")
    }
}

const handlerDistribuirConviteSignatario = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const convite = new DistribuirConviteSignatario(rabbit, knex);
        await convite.processar();
        if (convite.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.distribuirconvitesignatario.routingKey,
                delayMs: convite.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerDistribuirConviteSignatario): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerDistribuirConviteSignatario")
    }
}

const handlerProcessarBiometria = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const biometria = new ProcessarBiometria(rabbit, knex);
        await biometria.processar();
        if (biometria.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.processar_biometria.routingKey,
                delayMs: biometria.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerProcessarBiometria): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerProcessarBiometria")
    }
}

const handlerSelarDocumentoVault = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const selarVault = new SelarDocumentoVault(rabbit, knex);
        await selarVault.processar();
        if (selarVault.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.selardocumentovault.routingKey,
                delayMs: selarVault.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerSelarDocumentoVault): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerSelarDocumentoVault")
    }
}
const handlerNotificarCancelamentoDocumento = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const notificar = new NotificarCancelamentoDocumento(rabbit, knex);
        await notificar.processar();
        if (notificar.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.notificarcancelamentodocumento.routingKey,
                delayMs: notificar.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerNotificarCancelamentoDocumento): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerNotificarCancelamentoDocumento")
    }
}

const handlerEnviarDocumentoAssinadoSignatarios = async (msg, channel) => {
    try {
        const rabbit = RabbitMQ.getInstance();
        const jsonData = JSON.parse(msg.content.toString());
        await rabbit.loadBroker(jsonData.idSystem)
        rabbit.broker.message = jsonData;
        const enviar = new EnviarDocumentoAssinadoSignatarios(rabbit, knex);
        await enviar.processar();
        if (enviar.reprocessar) {
            await rabbit.publishMessageChildren({
                exchange: Rabbit.exchanges.assinatura,
                routingKey: Rabbit.queues.enviardocumentoassinadosignatarios.routingKey,
                delayMs: enviar.delayMs
            });
            await safeChannelAck(channel, msg);
            return;
        }
        logs.getInstance().info(`Mensagem processada com sucesso (handlerEnviarDocumentoAssinadoSignatarios): ${msg.content.toString()}`);
        await safeChannelAck(channel, msg);
    } catch (error) {
        if (statusAplication.status !== statusApp.prod) {
            await safeChannelNack(channel, msg, false, true);
        } else {
            await safeChannelNack(channel, msg, false, false);
        }
        logs.getInstance().error(error, "Erro no consumidor handlerEnviarDocumentoAssinadoSignatarios")
    }
}



module.exports = {
    handlerHashInicial,
    handlerAplicarAssinatura,
    handlerDistribuirConviteSignatario,
    handlerProcessarBiometria,
    handlerSelarDocumentoVault,
    handlerNotificarCancelamentoDocumento,
    handlerEnviarDocumentoAssinadoSignatarios
}