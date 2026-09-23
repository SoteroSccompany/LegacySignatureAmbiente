/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_evento_rastreio';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('instalacao_id', 39).nullable();
        table.string('pedido_id', 39).nullable();
        table.string('tipo_evento', 64).notNullable();
        table.json('meta_dados').nullable();
        table.datetime('data_criacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['pedido_id'], 'idx_evento_rastreio_pedido');
        table.index(['instalacao_id'], 'idx_evento_rastreio_instalacao');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
