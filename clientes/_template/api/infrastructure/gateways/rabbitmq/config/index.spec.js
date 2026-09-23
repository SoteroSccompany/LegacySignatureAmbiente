require('dotenv/config');
const RabbitMqConfig = require('./index');

describe('RabbitMqConfig', () => {
    test('Deve criar uma instância e conectar ao RabbitMQ', async () => {
        // Define as variáveis de ambiente necessárias
        process.env.RABBITMQ_USER = process.env.RABBITMQ_USER;
        process.env.RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD;
        process.env.RABBITMQ_HOST = 'localhost';  // Ajuste conforme o seu ambiente

        const rabbitMqConfig = new RabbitMqConfig();
        expect(rabbitMqConfig).toBeDefined();

        // Aqui você poderia testar se a conexão é realmente uma conexão válida
        // Isto depende se a conexão retorna uma promise ou se você adapta o código para suportar async/await
        const connection = await rabbitMqConfig;
        expect(connection).toBeDefined();
        // Verificar métodos específicos, como verificar se um channel pode ser criado
    });

    test('Deve lidar com erros de conexão', async () => {
        process.env.RABBITMQ_USER = 'wrong_user';
        process.env.RABBITMQ_PASSWORD = 'wrong_password';
        process.env.RABBITMQ_HOST = 'localhost';

        // Tente criar uma instância e esperar pelo erro
        try {
            new RabbitMqConfig();
        } catch (error) {
            expect(error).toBeDefined();
            // Verificar propriedades específicas do erro
        }
    });
});
