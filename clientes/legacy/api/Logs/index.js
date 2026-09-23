const pino = require('pino');
const { statusAplication, statusApp, defaultLogLevel } = require('../certs')

class Logger {

    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }

        this.isDev = statusAplication.status !== statusApp.prod;
        this.pinoLogger = this._initializePino();

        Logger.instance = this;
        return this;
    }

    _redactSensitive(data) {

        if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => this._redactSensitive(item));
        }

        if (data instanceof Date || data instanceof RegExp || data instanceof Error) {
            return data;
        }

        const clone = { ...data };

        const sensitiveFields = [
            'id',
            'password',
            'senha',
            'token',
            'accessToken',
            'refreshToken',
            'authorization',
            'auth',
            'role',
            'email_verificado',
            'bloqueado',
            'cpf',
            'rg',
            'dado_atual',
            'dado_antigo',
            'method',
            'endpoint',
            'ip',
            'body',
            'query',
            'params',
            'files',
            'headers'
        ];

        // Remove campos sensíveis específicos
        for (const key of sensitiveFields) {
            if (Object.prototype.hasOwnProperty.call(clone, key)) {
                delete clone[key];
            }
        }

        // Remove todos os campos que terminam com '_id' (foreign keys)
        for (const key in clone) {
            if (key.endsWith('_id') || key.endsWith('Id') || key.endsWith('ID')) {
                delete clone[key];
            }
        }

        // Processa recursivamente objetos aninhados
        for (const key in clone) {
            if (clone[key] && typeof clone[key] === 'object') {
                clone[key] = this._redactSensitive(clone[key]);
            }
        }

        return clone;
    }

    _initializePino() {
        let transport;

        if (this.isDev) {
            transport = pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            });
        } else {
            transport = pino.transport({
                targets: [
                    {
                        target: 'pino/file',
                        level: defaultLogLevel,
                        options: {
                            destination: 1 // stdout
                        }
                    }
                ]
            });
        }

        return pino(
            {
                level: defaultLogLevel || (this.isDev ? 'debug' : 'info'),
                base: {
                    service: process.env.APLICATION_NAME || 'api'
                },
                hooks: {
                    logMethod: (args, method) => {
                        // Reduz dados sensíveis em todos os argumentos
                        const sanitizedArgs = args.map(arg => {
                            if (arg && typeof arg === 'object') {
                                return this._redactSensitive(arg);
                            }
                            return arg;
                        });
                        return method.apply(this.pinoLogger, sanitizedArgs);
                    }
                },
                timestamp: pino.stdTimeFunctions.isoTime
            },
            transport
        );
    }

    info(...args) {
        return this.pinoLogger.info(...args);
    }

    warn(...args) {
        return this.pinoLogger.warn(...args);
    }

    error(...args) {
        return this.pinoLogger.error(...args);
    }

    fatal(...args) {
        return this.pinoLogger.fatal(...args);
    }

    getPinoLogger() {
        return this.pinoLogger;
    }


    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
}

module.exports = Logger;