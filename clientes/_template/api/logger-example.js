/**
 * Exemplo de uso do Logger Singleton
 * 
 * Este arquivo demonstra como utilizar o logger com redação automática
 * de dados sensíveis.
 */

const { logger } = require('./Logs/index');

// ============================================
// Exemplos Básicos
// ============================================

// Log simples de string
logger.info('Aplicação iniciada com sucesso');

// Log com objeto (dados sensíveis serão automaticamente removidos)
logger.info({
    user: {
        id: '12345',
        email: 'usuario@example.com',
        senha: 'senha123',
        role: 1,
        email_verificado: true,
        bloqueado: false,
        user_id: '67890'
    }
}, 'Tentativa de login');

// Resultado: Apenas 'email' será logado, todos os outros campos sensíveis serão removidos

// ============================================
// Exemplos com Diferentes Níveis de Log
// ============================================

// Debug - para desenvolvimento
logger.debug({ data: { id: '123', token: 'abc123' } }, 'Debug message');

// Info - informações gerais
logger.info({ action: 'create', resource: 'user' }, 'Recurso criado');

// Warn - avisos
logger.warn({ error: 'Rate limit approaching', user_id: '123' }, 'Atenção necessária');

// Error - erros
logger.error({ 
    error: 'Database connection failed',
    user_id: '123',
    accessToken: 'token123'
}, 'Erro ao conectar ao banco');

// Fatal - erros críticos
logger.fatal({ 
    error: 'Server crash',
    system_id: 'sys123',
    refreshToken: 'refresh123'
}, 'Erro fatal no sistema');

// ============================================
// Exemplos com Arrays e Objetos Aninhados
// ============================================

// Array de objetos (todos os IDs e dados sensíveis serão removidos)
logger.info({
    users: [
        { id: '1', email: 'user1@test.com', senha: 'pass1', role: 1 },
        { id: '2', email: 'user2@test.com', senha: 'pass2', role: 2 }
    ]
}, 'Lista de usuários');

// Objetos profundamente aninhados
logger.info({
    request: {
        method: 'POST',
        endpoint: '/api/users',
        body: { id: '123', senha: 'abc' },
        headers: { authorization: 'Bearer token123' },
        user_id: '456'
    },
    response: {
        data: {
            id: '789',
            token: 'newtoken',
            user_id: '456'
        }
    }
}, 'Requisição processada');

// Resultado: Todos os campos sensíveis serão removidos recursivamente

// ============================================
// Exemplos com Campos de Request
// ============================================

// Campos de request são completamente removidos
logger.info({
    method: 'GET',
    endpoint: '/api/data',
    ip: '192.168.1.1',
    body: { data: 'sensitive' },
    query: { id: '123' },
    params: { userId: '456' },
    files: { upload: 'file.pdf' },
    headers: { authorization: 'Bearer token' }
}, 'Requisição recebida');

// Resultado: Nenhum campo de request será logado

// ============================================
// Exemplos com Foreign Keys
// ============================================

// Todos os campos terminados em '_id', 'Id' ou 'ID' são removidos
logger.info({
    evento_id: 'evt123',
    usuarioId: 'usr456',
    organizadorID: 'org789',
    participante_id: 'part123',
    arquivoId: 'file456'
}, 'Relacionamentos de entidades');

// Resultado: Todos os IDs serão removidos

// ============================================
// Exemplos com Campos de Histórico
// ============================================

// Campos 'dado_atual' e 'dado_antigo' são removidos
logger.info({
    historico: {
        id: 'hist123',
        objeto_id: 'obj456',
        dado_atual: { senha: 'old', role: 1 },
        dado_antigo: { senha: 'new', role: 2 },
        user_id: 'usr789'
    }
}, 'Histórico de alteração');

// Resultado: Apenas 'transformacao' e 'data_*' serão logados (se não forem sensíveis)

// ============================================
// Exemplos Práticos de Uso em Código
// ============================================

// Em um controller
function exemploController(req, res) {
    try {
        // Dados que serão logados (sem campos sensíveis)
        logger.info({
            action: 'createUser',
            // id, senha, role, etc. serão automaticamente removidos
            userData: req.body
        }, 'Criando novo usuário');

        // ... lógica do controller

        logger.info('Usuário criado com sucesso');
    } catch (error) {
        logger.error({
            error: error.message,
            stack: error.stack,
            // user_id, token, etc. serão removidos automaticamente
            context: { user_id: req.user?.id, token: req.headers.authorization }
        }, 'Erro ao criar usuário');
    }
}

// Em um middleware
function exemploMiddleware(req, res, next) {
    logger.debug({
        // Todos os campos de request serão removidos
        method: req.method,
        endpoint: req.path,
        ip: req.ip,
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers
    }, 'Requisição recebida');

    next();
}

// Em um service/use case
function exemploService(data) {
    logger.info({
        operation: 'processData',
        // IDs e dados sensíveis serão removidos
        input: data
    }, 'Processando dados');

    // ... lógica do service

    logger.info('Dados processados com sucesso');
}

// ============================================
// Notas Importantes
// ============================================

/*
 * IMPORTANTE: O logger automaticamente remove os seguintes dados:
 * 
 * 1. IDs e Foreign Keys:
 *    - Qualquer campo chamado 'id'
 *    - Qualquer campo terminado em '_id', 'Id' ou 'ID'
 * 
 * 2. Autenticação e Autorização:
 *    - password, senha
 *    - token, accessToken, refreshToken
 *    - authorization, auth
 * 
 * 3. Dados de Usuário Sensíveis:
 *    - role
 *    - email_verificado
 *    - bloqueado
 *    - cpf, rg
 * 
 * 4. Campos de Histórico:
 *    - dado_atual
 *    - dado_antigo
 * 
 * 5. Campos de Request (completamente removidos):
 *    - method
 *    - endpoint
 *    - ip
 *    - body
 *    - query
 *    - params
 *    - files
 *    - headers
 * 
 * O logger processa recursivamente objetos e arrays,
 * garantindo que dados sensíveis em qualquer nível
 * sejam removidos antes do log ser salvo.
 */

module.exports = {
    exemploController,
    exemploMiddleware,
    exemploService
};

