/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_solicitacao_documento';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('status', 110).notNullable(); // WAITING_PUT, UPLOADED, VALIDATING, PROCESSING_HASH, READY, FAILED
        table.text('sessao_id').notNullable();
        table.text('object_name').notNullable();
        table.text('bucket_wip_path').notNullable();
        table.string('desafio_id', 39).notNullable()
            .references('id').inTable('tab_desafio_autenticacao');
        table.text('erro_msg').nullable();
        table.jsonb('meta_dados').notNullable();
        table.timestamp('data_criacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('data_atualizacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
