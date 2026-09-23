const createRequest = require('../../../@core/usecase/Requests/createRequestsUseCase')

module.exports = async (req, res, next) => {
    const start = Date.now();

    // Só queremos POST, PUT e DELETE
    if (!['POST', 'PUT', 'DELETE', 'GET', 'PATCH'].includes(req.method)) {
        return next();
    }

    res.on('finish', async () => {
        // PDF cru da verificação: não gravar os bytes em tab_requests.body.
        const pdfVerificacao = req.method === 'POST' && /\/verificar\/[^/]+\/documento(?:\?|$)/.test(req.originalUrl || '');
        // Pega os dados da request
        const logData = {
            method: req.method,
            endpoint: req.originalUrl,
            ip: req.ip,
            user_id: req.session?.user?.id || null,
            body: pdfVerificacao ? null : (req.body && Object.fromEntries(Object.entries(req.body))), // Remove campos undefined
            query: req.query && Object.fromEntries(Object.entries(req.query || {}).filter(([key, value]) => value !== undefined)), // Remove campos undefined
            params: req.params && Object.fromEntries(Object.entries(req.params || {}).filter(([key, value]) => value !== undefined)), // Remove campos undefined,
            files: req.files ? (Array.isArray(req.files) ? req.files.map(f => f) : Object.values(req.files).flat().map(f => f)) : [],
            headers: JSON.stringify({
                'user-agent': req.get('User-Agent'),
                'origin': req.get('Origin'),
            }),
            created_at: new Date(),
        };
        logData.status_code = res.statusCode;
        logData.duration_ms = Date.now() - start;
        if (logData.body) {
            if (logData.body?.senha) delete logData.body.senha;
            if (logData.body?.password) delete logData.body.novaSenha;
            if (logData.body?.password) delete logData.body.password;
            if (logData.body?.token) delete logData.body.token;
            if (logData.body?.access_token) delete logData.body.access_token;
            if (logData.body?.refresh_token) delete logData.body.refresh_token;
            if (logData.body?.password_confirmation) delete logData.body.password_confirmation;
            if (logData.body?.confirm_password) delete logData.body.confirm_password;
            if (logData.body?.confirmacao) delete logData.body.confirmacao;
        }

        logData.body = JSON.stringify(logData.body);

        // Aqui você insere no banco (Mongo, Postgres, etc)
        try {
            await createRequest.indexRequests(logData);
        } catch (err) {
            console.error("Erro ao salvar log de evento:", err);
        }
    });

    next();
};
