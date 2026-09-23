const getBrokerUsecase = require('../../../../@core/usecase/Broker/getBrokerUseCase');
const Broker = require('../../../../@core/domain/Broker');
// const updateBrokerUsecase = require("../../../@core/usecase/Broker/updateBrokerUseCase");
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../functions/data/getToday');
const logExeption = require('../../../../@core/usecase/Logs/exeption/exeptionBroker');
// const RabbitMQ = require('../../gateways/rabbitmq');
const logs = require('../../../../Logs');

let isProcessing = false;


const RepublisherMessagesRabbitMq = async (rabbitMQ) => {
    // return new Promise(async (resolve, reject) => {
    //     try {
    //         if (isProcessing) return resolve();
    //         isProcessing = true;
    //         logs.getInstance().info('🔄 Iniciando republisher de mensagens...');

    //         const brokersDb = await getBrokerUsecase.getBrokerFailed();
    //         if (!brokersDb.status && !brokersDb.response.status) {
    //             throw new Error('Erro ao buscar brokers');
    //         }
    //         if (!brokersDb.status && brokersDb.response.status) return resolve();

    //         const brokers = brokersDb.data.map(broker => new Broker(broker));

    //         for (const item of brokers) {
    //             await rabbitMQ.rePublishMessage(item);
    //         }

    //         isProcessing = false;
    //         resolve(); // Finaliza a Promise com sucesso
    //     } catch (err) {
    //         isProcessing = false;
    //         console.error(err);
    //         let lineError = '0';
    //         let fileName = '0';
    //         const stackFrames = ErrorStackParser.parse(err);
    //         if (stackFrames.length > 0) {
    //             lineError = stackFrames[0].lineNumber;
    //             fileName = stackFrames[0].fileName;
    //         }
    //         logs.getInstance().error({
    //             descricaoDoErro: `${err.message}`,
    //             linhaDoErro: lineError,
    //             nomeDoArquivo: fileName,
    //             data_criacao: dateNow(),
    //             data_atualizacao: dateNow(),
    //             deletado: false
    //         }, "Exeption estourada RepublisherMessagesRabbitMq");
    //         reject(new Error('Erro interno do servidor, log gerado'));
    //     }
    // });
};




// const RepublisherMessagesRabbitMq = async (rabbitMQ) => {
//     try {
//         if (isProcessing) return;
//         isProcessing = true;
//         console.log('🔄 Iniciando republisher de mensagens...');
//         const brokersDb = await getBrokerUsecase.getBrokerFailed();
//         if (!brokersDb.status && !brokersDb.response.status) {
//             throw new Error('Erro ao buscar brokers');
//         }
//         if (!brokersDb.status && brokersDb.response.status) return;
//         const brokers = brokersDb.data.map(broker => {
//             const brokerObj = new Broker(broker);
//             return brokerObj;
//         });
//         for await (const item of brokers) {
//             await rabbitMQ.rePublishMessage(item)
//         }
//         isProcessing = false;
//     } catch (err) {
//         isProcessing = false;
//         console.log(err)
//         let lineError = '0';
//         let fileName = '0';
//         const stackFrames = ErrorStackParser.parse(err);
//         if (stackFrames.length > 0) {
//             lineError = stackFrames[0].lineNumber;
//             fileName = stackFrames[0].fileName;
//         }
//         logExeption({ descricaoDoErro: 'Exeption estourada RepublisherMessagesRabbitMq', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
//         return { status: false, msg: 'Erro interno do servidor, log gerado' }
//     }
// }


module.exports = RepublisherMessagesRabbitMq;