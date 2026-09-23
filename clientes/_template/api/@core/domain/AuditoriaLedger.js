
const uuid = require('uuid');
const crypto = require('crypto');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const moment = require('moment');

class AuditoriaLedgerDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.solicitacao_id = data.solicitacao_id
        this.documento_id = data.documento_id
        this.objeto_tipo = data.objeto_tipo
        this.objeto_id = data.objeto_id
        this.desafio_acesso_id = data.desafio_acesso_id
        this.tipo_evento = data.tipo_evento
        this.sequencia = data.sequencia
        this.metadata_json = data.metadata_json
        this.hash_objeto_inicial = data.hash_objeto_inicial
        this.hash_objeto_final = data.hash_objeto_final
        this.hash_documento_inicial = data.hash_documento_inicial
        this.hash_documento_final = data.hash_documento_final
        this.hash_bytes_pdf = data.hash_bytes_pdf
        this.hash_registro_anterior = data.hash_registro_anterior
        this.hash_atual = data.hash_atual
        // Prova em vault do evento (ZIP json+cms). Ponteiros só — não entram
        // no encadeamento de hash_atual (ver calcularHashAtual).
        this.payload_sha256 = data.payload_sha256
        this.bucket_path = data.bucket_path
        this.object_name = data.object_name
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : dateNow()
    }

    getAuditoriaLedger() {
        return {
            id: this.id,
            solicitacao_id: this.solicitacao_id,
            documento_id: this.documento_id,
            objeto_tipo: this.objeto_tipo,
            objeto_id: this.objeto_id,
            desafio_acesso_id: this.desafio_acesso_id,
            tipo_evento: this.tipo_evento,
            sequencia: this.sequencia,
            metadata_json: this.metadata_json,
            hash_objeto_inicial: this.hash_objeto_inicial,
            hash_objeto_final: this.hash_objeto_final,
            hash_documento_inicial: this.hash_documento_inicial,
            hash_documento_final: this.hash_documento_final,
            hash_bytes_pdf: this.hash_bytes_pdf,
            hash_registro_anterior: this.hash_registro_anterior,
            hash_atual: this.hash_atual,
            payload_sha256: this.payload_sha256,
            bucket_path: this.bucket_path,
            object_name: this.object_name,
            criado_em: this.criado_em ? moment(this.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em,

        }
    }

    // Só entram no encadeamento colunas escalares: o metadata_json é normalizado pelo banco
    // e não é reproduzível byte a byte na reconferência da cadeia.
    // hash_bytes_pdf é coluna legado e fica fora do encadeamento.
    calcularHashAtual() {
        const base = [
            this.id,
            this.solicitacao_id || '',
            this.documento_id || '',
            this.objeto_tipo || '',
            this.objeto_id || '',
            this.desafio_acesso_id || '',
            this.tipo_evento,
            this.sequencia,
            this.hash_objeto_inicial || '',
            this.hash_objeto_final || '',
            this.hash_documento_inicial || '',
            this.hash_documento_final || '',
            this.hash_registro_anterior || '',
            this.criado_em,
        ].join('|');
        this.hash_atual = crypto.createHash('sha256').update(base).digest('hex');
        return this.hash_atual;
    }

    setAuditoriaLedger(data) {
        this.id = data.id ? data.id : this.id
        this.solicitacao_id = data.solicitacao_id ? data.solicitacao_id : this.solicitacao_id
        this.documento_id = data.documento_id ? data.documento_id : this.documento_id
        this.objeto_tipo = data.objeto_tipo ? data.objeto_tipo : this.objeto_tipo
        this.objeto_id = data.objeto_id ? data.objeto_id : this.objeto_id
        this.desafio_acesso_id = data.desafio_acesso_id ? data.desafio_acesso_id : this.desafio_acesso_id
        this.tipo_evento = data.tipo_evento ? data.tipo_evento : this.tipo_evento
        this.sequencia = data.sequencia ? data.sequencia : this.sequencia
        this.metadata_json = data.metadata_json ? data.metadata_json : this.metadata_json
        this.hash_objeto_inicial = data.hash_objeto_inicial ? data.hash_objeto_inicial : this.hash_objeto_inicial
        this.hash_objeto_final = data.hash_objeto_final ? data.hash_objeto_final : this.hash_objeto_final
        this.hash_documento_inicial = data.hash_documento_inicial ? data.hash_documento_inicial : this.hash_documento_inicial
        this.hash_documento_final = data.hash_documento_final ? data.hash_documento_final : this.hash_documento_final
        this.hash_bytes_pdf = data.hash_bytes_pdf ? data.hash_bytes_pdf : this.hash_bytes_pdf
        this.hash_registro_anterior = data.hash_registro_anterior ? data.hash_registro_anterior : this.hash_registro_anterior
        this.hash_atual = data.hash_atual ? data.hash_atual : this.hash_atual
        this.payload_sha256 = data.payload_sha256 ? data.payload_sha256 : this.payload_sha256
        this.bucket_path = data.bucket_path ? data.bucket_path : this.bucket_path
        this.object_name = data.object_name ? data.object_name : this.object_name
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em

        return this.getAuditoriaLedger()
    }

}

module.exports = AuditoriaLedgerDomain;
