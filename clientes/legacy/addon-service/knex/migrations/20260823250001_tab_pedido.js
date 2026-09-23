/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_pedido';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('instalacao_id', 39).notNullable()
            .references('id').inTable('tab_instalacao');
        table.string('titulo', 255).notNullable();
        table.string('solicitacao_id', 39).nullable();
        table.string('documento_id', 39).nullable();
        table.string('termo_id', 39).nullable();
        table.string('pasta_processo_drive_id', 128).notNullable();
        table.string('status', 40).notNullable();
        table.text('erro_msg').nullable();
        table.string('hash_original', 64).nullable();
        table.string('hash_assinado', 64).nullable();
        table.json('signatarios_json').nullable();
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['instalacao_id'], 'idx_pedido_instalacao');
        table.index(['solicitacao_id'], 'idx_pedido_solicitacao');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
