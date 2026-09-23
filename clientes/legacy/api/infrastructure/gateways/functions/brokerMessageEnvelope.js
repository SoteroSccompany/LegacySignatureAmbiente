

function parseBrokerMessageEnvelope(raw) {
    if (raw == null) {
        throw new Error('broker.message vazio');
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        return raw;
    }
    let cur = typeof raw === 'string' ? raw : String(raw);
    for (let i = 0; i < 5; i++) {
        const parsed = JSON.parse(cur);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
        }
        if (typeof parsed !== 'string') {
            break;
        }
        cur = parsed;
    }
    throw new Error('broker.message em formato inesperado');
}


function stringifyBrokerMessageEnvelope(message) {
    if (message == null) return message;
    const env = typeof message === 'string' ? parseBrokerMessageEnvelope(message) : message;
    return JSON.stringify(env);
}

function normalizeMetaDados(raw) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const p = JSON.parse(raw);
            return typeof p === 'object' && p !== null && !Array.isArray(p) ? p : null;
        } catch {
            return null;
        }
    }
    return null;
}

module.exports = {
    parseBrokerMessageEnvelope,
    stringifyBrokerMessageEnvelope,
    normalizeMetaDados,
};
