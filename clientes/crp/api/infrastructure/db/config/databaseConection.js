require("dotenv/config");

// Singleton: Armazena a instância única do Knex
let knexInstance = null;

function conect() {
    // Se já existe uma instância, retorna ela (evita múltiplas conexões)
    if (knexInstance) {
        return knexInstance;
    }

    // Cria a instância única do Knex
    knexInstance = require("knex")({
        client: process.env.DB_CLIENT,
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT
        },
        pool: {
            min: 2,
            max: 16,
            // Tempo máximo que uma conexão pode ficar idle antes de ser destruída (30 segundos)
            idleTimeoutMillis: 30000,
            // Tempo máximo de vida de uma conexão (30 minutos)
            acquireTimeoutMillis: 30000,
            // Criar conexões sob demanda
            createTimeoutMillis: 3000,
            // Destruir conexões quando não estão em uso
            destroyTimeoutMillis: 5000,
            // Propaga erros de criação de conexão
            propagateCreateError: false
        },
        // debug: true,
    });

    // Registrando o evento de consulta
    // knexInstance.on('query', query => {
    //     console.log('SQL Query:', query.sql);
    // });

    // // Registrando o evento de erro de consulta
    // knexInstance.on('query-error', error => {
    //     console.error('SQL Query Error:', error);
    // });


    process.on('SIGINT', async () => {// Processo quando tem um cntrl + c
        if (knexInstance) {
            await knexInstance.destroy();
            console.log('Pool de conexões MySQL encerrado.');
            process.exit(0);
        }
    });

    process.on('SIGTERM', async () => { //Quando tem um processo sendo encerrado por kill ou algo do tipo.
        if (knexInstance) {
            await knexInstance.destroy();
            console.log('Pool de conexões MySQL encerrado.');
            process.exit(0);
        }
    });

    return knexInstance;
}

module.exports = conect;
