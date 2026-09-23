
module.exports = async function authAssinatura(req, res, next) {
    try {
        if (!req.session?.csrf) {
            return res.status(403).json({ status: false, msg: 'Token CSRF inválido.' });
        }
        if (!req.session?.user?.id || !req.session.user.assinatura?.documento_id) {
            return res.status(401).json({ status: false, msg: 'Sessão de assinatura inválida. Faça login novamente.' });
        }
        if (req.session.user.assinatura.pending_2fa || !req.session.user.desafio_id) {
            return res.status(401).json({ status: false, msg: 'Conclua a autenticação 2FA antes de acessar o documento.' });
        }
        req.session.touch();
        return next();
    } catch (_) {
        return res.status(401).json({ status: false, msg: 'Sessão de assinatura inválida.' });
    }
};
