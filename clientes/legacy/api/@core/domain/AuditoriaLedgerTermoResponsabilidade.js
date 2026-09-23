
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const crypto = require('crypto');

class AuditoriaLedgerTermoResponsabilidadeDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.termo_id = data.termo_id
        this.usuario_id = data.usuario_id
        this.tipo_evento = data.tipo_evento
        this.sequencia = data.sequencia
        this.metadata_json = data.metadata_json
        this.hash_atual = data.hash_atual
        this.hash_registro_anterior = data.hash_registro_anterior
        this.bucket_path = data.bucket_path
        this.object_name = data.object_name
        this.payload_sha256 = data.payload_sha256
        this.auditoria_ledger_origem = data.auditoria_ledger_origem
        this.criado_em = data.criado_em
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getAuditoriaLedgerTermoResponsabilidade() {
        return {
            id: this.id,
            termo_id: this.termo_id,
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
            criado_em: this.criado_em,
            deletado: this.deletado,

        }
    }

    calcularHashAtual() {
        const base = [
            this.id,
            this.termo_id,
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

    setAuditoriaLedgerTermoResponsabilidade(data) {
        this.id = data.id ? data.id : this.id
        this.termo_id = data.termo_id ? data.termo_id : this.termo_id
        this.usuario_id = data.usuario_id ? data.usuario_id : this.usuario_id
        this.tipo_evento = data.tipo_evento ? data.tipo_evento : this.tipo_evento
        this.sequencia = data.sequencia ? data.sequencia : this.sequencia
        this.metadata_json = data.metadata_json ? data.metadata_json : this.metadata_json
        this.hash_atual = data.hash_atual ? data.hash_atual : this.hash_atual
        this.hash_registro_anterior = data.hash_registro_anterior ? data.hash_registro_anterior : this.hash_registro_anterior
        this.bucket_path = data.bucket_path ? data.bucket_path : this.bucket_path
        this.object_name = data.object_name ? data.object_name : this.object_name
        this.payload_sha256 = data.payload_sha256 ? data.payload_sha256 : this.payload_sha256
        this.auditoria_ledger_origem = data.auditoria_ledger_origem ? data.auditoria_ledger_origem : this.auditoria_ledger_origem
        this.criado_em = data.criado_em ? data.criado_em : this.criado_em
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getAuditoriaLedgerTermoResponsabilidade()
    }

}

module.exports = AuditoriaLedgerTermoResponsabilidadeDomain;
