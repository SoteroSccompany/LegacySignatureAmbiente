const uuid = require('uuid');
const crypto = require('crypto');
const moment = require('moment');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class AuditoriaLedgerAlertaUsuarioDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.alerta_usuario_id = data.alerta_usuario_id
        this.usuario_id = data.usuario_id
        this.tipo_evento = data.tipo_evento
        this.sequencia = data.sequencia
        this.metadata_json = data.metadata_json
        this.hash_atual = data.hash_atual
        this.hash_registro_anterior = data.hash_registro_anterior
        this.bucket_path = data.bucket_path
        this.object_name = data.object_name
        this.payload_sha256 = data.payload_sha256
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : dateNow()
        this.auditoria_ledger_origem = data.auditoria_ledger_origem ? data.auditoria_ledger_origem : null
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    calcularHashAtual() {
        const base = [
            this.id,
            this.alerta_usuario_id,
            this.usuario_id || '',
            this.tipo_evento,
            this.sequencia,
            this.payload_sha256 || '',
            this.hash_registro_anterior || '',
            this.criado_em
        ].join('|');
        this.hash_atual = crypto.createHash('sha256').update(base).digest('hex');
        return this.hash_atual;
    }

    getAuditoriaLedgerAlertaUsuario() {
        return {
            id: this.id,
            alerta_usuario_id: this.alerta_usuario_id,
            usuario_id: this.usuario_id,
            tipo_evento: this.tipo_evento,
            sequencia: this.sequencia,
            metadata_json: this.metadata_json,
            hash_atual: this.hash_atual,
            hash_registro_anterior: this.hash_registro_anterior,
            bucket_path: this.bucket_path,
            object_name: this.object_name,
            payload_sha256: this.payload_sha256,
            auditoria_ledger_origem: this.auditoria_ledger_origem,
            criado_em: this.criado_em ? moment(this.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em,
            deletado: this.deletado,
        }
    }

    setAuditoriaLedgerAlertaUsuario(data) {
        this.id = data.id ? data.id : this.id
        this.alerta_usuario_id = data.alerta_usuario_id ? data.alerta_usuario_id : this.alerta_usuario_id
        this.usuario_id = data.usuario_id ? data.usuario_id : this.usuario_id
        this.tipo_evento = data.tipo_evento ? data.tipo_evento : this.tipo_evento
        this.sequencia = data.sequencia ? data.sequencia : this.sequencia
        this.metadata_json = data.metadata_json ? data.metadata_json : this.metadata_json
        this.hash_atual = data.hash_atual ? data.hash_atual : this.hash_atual
        this.hash_registro_anterior = data.hash_registro_anterior ? data.hash_registro_anterior : this.hash_registro_anterior
        this.bucket_path = data.bucket_path ? data.bucket_path : this.bucket_path
        this.object_name = data.object_name ? data.object_name : this.object_name
        this.payload_sha256 = data.payload_sha256 ? data.payload_sha256 : this.payload_sha256
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em
        this.auditoria_ledger_origem = data.auditoria_ledger_origem ? data.auditoria_ledger_origem : this.auditoria_ledger_origem
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
        return this.getAuditoriaLedgerAlertaUsuario()
    }
}

module.exports = AuditoriaLedgerAlertaUsuarioDomain;
