require('dotenv').config();
const logs = require('../../Logs')
class ApplicationController {





    async getCsrf(req, res) {
        try {
            if (req.session && req.session.csrf) {
                req.session.touch();
                return res.status(200).json({ status: true, csrfToken: req.session.csrf, msg: "Token existente" });
            }
            if (req.session) {
                req.session.csrf = req.csrfToken();
                return req.session.save((err) => {
                    if (err) {
                        return res.status(500).json({ status: false, msg: "Erro ao salvar sessão" });
                    }
                    return res.status(200).json({
                        csrfToken: req.session.csrf,
                        status: true,
                        msg: "Token novo com sessão persistida"
                    });
                });
            }
            return req.session.regenerate((err) => {
                if (err) {
                    return res.status(500).json({ status: false, msg: 'Erro ao regenerar sessão' });
                }

                req.session.csrf = req.csrfToken();

                req.session.save((err) => {
                    if (err) {
                        return res.status(500).json({ status: false, msg: "Erro ao salvar nova sessão" });
                    }

                    return res.status(200).json({
                        csrfToken: req.session.csrf,
                        status: true,
                        msg: "Nova sessão gerada com CSRF"
                    });
                });
            });

        } catch (err) {
            console.error('Erro interno:', err);
            return res.status(500).json({ status: false, msg: "Erro interno", error: err.message });
        }
    }



    async healthCheck(req, res) {
        try {

            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                service: process.env.APLICATION_NAME || 'api',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.STATUSAPLICATION || 'development',
                checks: {}
            };

            // Métricas do servidor
            const serverMetrics = {
                status: 'healthy',
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024),
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    unit: 'MB'
                },
                cpu: {
                    usage: process.cpuUsage(),
                    uptime: process.uptime(),
                    uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`
                },
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            };
            healthStatus.checks.server = serverMetrics;

            // Verificação do Banco de Dados (MySQL)
            const knex = require('../db/config/databaseConection')();
            const startTime = Date.now();
            try {
                await knex.raw('SELECT 1 as health');
                const responseTime = Date.now() - startTime;

                // 2. Obter informações do banco (VERSION(), DATABASE(), CONNECTION_ID())
                const [dbInfoResults] = await knex.raw('SELECT VERSION() as version, DATABASE() as `database`, CONNECTION_ID() as connection_id');
                const dbInfo = dbInfoResults[0];

                // 3. Obter estatísticas do banco (Threads_connected)
                const [dbStatsResults] = await knex.raw('SHOW STATUS LIKE "Threads_connected"');

                // Acessa o valor do status Threads_connected
                const connectionsValue = dbStatsResults.find(s => s.Variable_name === 'Threads_connected')?.Value;

                healthStatus.checks.database = {
                    status: 'healthy',
                    responseTime: `${responseTime}ms`,
                    // Usa o resultado extraído da variável dbInfo
                    version: dbInfo?.version || 'unknown',
                    database: dbInfo?.database || process.env.DB_DATABASE || 'unknown',
                    connectionId: dbInfo?.connection_id || 'unknown',
                    connections: connectionsValue || 'unknown',
                    host: process.env.DB_HOST || 'unknown',
                    port: process.env.DB_PORT || 'unknown'
                };

            } catch (error) {
                healthStatus.status = 'unhealthy';
                healthStatus.checks.database = {
                    status: 'unhealthy',
                    error: error.message,
                    host: process.env.DB_HOST,
                    port: process.env.DB_PORT
                };
            }

            // Verificação do Redis
            try {
                const redis = require('../gateways/Redis');
                const startTime = Date.now();
                const pong = await redis.ping();
                const responseTime = Date.now() - startTime;

                if (pong === 'PONG') {
                    let redisVersion = 'unknown';
                    let usedMemory = 'unknown';
                    let totalCommands = 'unknown';

                    try {
                        const info = await redis.info('server');
                        const memoryInfo = await redis.info('memory');
                        const statsInfo = await redis.info('stats');

                        // Parse básico das informações
                        redisVersion = info?.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
                        const usedMemoryBytes = memoryInfo?.match(/used_memory:([^\r\n]+)/)?.[1];
                        usedMemory = usedMemoryBytes ? `${Math.round(parseInt(usedMemoryBytes) / 1024 / 1024)}MB` : 'unknown';
                        totalCommands = statsInfo?.match(/total_commands_processed:([^\r\n]+)/)?.[1] || 'unknown';
                    } catch (parseError) {
                        // Se falhar ao obter info, continua com valores padrão
                        console.warn('Erro ao obter informações detalhadas do Redis:', parseError.message);
                    }

                    healthStatus.checks.redis = {
                        status: 'healthy',
                        responseTime: `${responseTime}ms`,
                        version: redisVersion,
                        usedMemory: usedMemory,
                        totalCommands: totalCommands,
                        host: process.env.REDIS_HOST,
                        port: process.env.REDIS_PORT
                    };
                } else {
                    throw new Error('Redis ping failed');
                }
            } catch (error) {
                healthStatus.status = 'unhealthy';
                healthStatus.checks.redis = {
                    status: 'unhealthy',
                    error: error.message,
                    host: process.env.REDIS_HOST,
                    port: process.env.REDIS_PORT
                };
            }

            // Verificação do RabbitMQ (via Management API)
            try {
                const axios = require('axios');
                const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost';
                const rabbitmqPort = process.env.RABBITMQ_WEB_PORT || 15672;
                const rabbitmqUrl = `http://${rabbitmqHost}:${rabbitmqPort}`;
                const startTime = Date.now();

                const response = await axios.get(`${rabbitmqUrl}/api/overview`, {
                    timeout: 5000,
                    auth: {
                        username: process.env.RABBITMQ_DEFAULT_USER || 'guest',
                        password: process.env.RABBITMQ_DEFAULT_PASS || 'guest'
                    }
                });

                const responseTime = Date.now() - startTime;

                healthStatus.checks.rabbitmq = {
                    status: 'healthy',
                    responseTime: `${responseTime}ms`,
                    version: response.data?.rabbitmq_version || 'unknown',
                    managementVersion: response.data?.management_version || 'unknown',
                    node: response.data?.node || 'unknown',
                    objectTotals: response.data?.object_totals || {},
                    queueTotals: response.data?.queue_totals || {},
                    messageStats: response.data?.message_stats || {},
                    host: process.env.RABBITMQ_HOST,
                    webPort: process.env.RABBITMQ_WEB_PORT,
                    port: process.env.RABBITMQ_PORT
                };
            } catch (error) {
                healthStatus.status = 'unhealthy';
                healthStatus.checks.rabbitmq = {
                    status: 'unhealthy',
                    error: error.message,
                    host: process.env.RABBITMQ_HOST,
                    webPort: process.env.RABBITMQ_WEB_PORT,
                    port: process.env.RABBITMQ_PORT
                };
            }

            // Determinar status HTTP baseado no health geral
            const httpStatus = healthStatus.status === 'healthy' ? 200 : 503;

            res.status(httpStatus).json(healthStatus);

        } catch (err) {
            logs.getInstance().error({ ...err }, 'Erro no health check da aplicação:');
            return res.status(500).json({ status: 'unhealthy', error: 'Erro interno na verificação de saúde' });
        }
    }
}

module.exports = new ApplicationController();
