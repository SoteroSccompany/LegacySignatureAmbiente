module.exports = (req, res, next) => {
    const methodsThatNeedBody = ['POST', 'PUT', 'PATCH'];
    const contentType = req.headers['content-type'] || '';

    if (methodsThatNeedBody.includes(req.method)) {
        const isJson = contentType.includes('application/json');
        const isForm = contentType.includes('application/x-www-form-urlencoded');

        // Se for JSON, body precisa ser objeto não vazio
        if (isJson && (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0)) {
            return res.status(400).json({
                status: false,
                msg: 'Requisição JSON inválida: corpo ausente ou vazio.'
            });
        }

        // Se for formulário, body precisa ser um objeto também (já parseado)
        if (isForm && (!req.body || Object.keys(req.body).length === 0)) {
            return res.status(400).json({
                status: false,
                msg: 'Formulário enviado sem dados.'
            });
        }
    }

    next();
};
