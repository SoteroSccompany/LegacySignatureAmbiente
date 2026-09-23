const informationData = [
    'id',
    'documento_id',
    'user_id',
    'signatario_id',
    'perfil_biometria_id',
    'desafio_id',
    'bucket_wip_path',
    'payload_sha256',
    'status',
    'data_atualizacao',
    'data_criacao'
];

const entity = 'IdentificacaoBiometrica';

const table = 'tab_identificacao_biometrica';

module.exports = { informationData, entity, table }

