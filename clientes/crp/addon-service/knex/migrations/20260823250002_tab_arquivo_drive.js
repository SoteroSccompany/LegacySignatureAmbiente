/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_arquivo_drive';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('pedido_id', 39).notNullable()
            .references('id').inTable('tab_pedido');
        table.string('tipo', 32).notNullable();
        table.string('drive_file_id', 128).notNullable();
        table.string('nome', 255).notNullable();
        table.bigInteger('tamanho').unsigned().nullable();
        table.string('mime_type', 128).nullable();
        table.string('sha256', 64).nullable();
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['pedido_id'], 'idx_arquivo_drive_pedido');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
