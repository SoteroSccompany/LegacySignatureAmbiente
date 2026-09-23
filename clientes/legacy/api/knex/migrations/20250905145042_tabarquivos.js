/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_arquivos', function (table) {
        table.string('id', 39).notNullable().primary();
        table.text('bucket', 255).notNullable();
        table.text('objectName').notNullable();
        table.string('tipoArquivo', 255).notNullable();
        table.string('user_id', 39).nullable()
            .references('id').inTable('tab_usuarios').onDelete('SET NULL');
        table.datetime('data_criacao').notNullable().defaultTo(knex.fn.now());
        table.datetime('data_atualizacao').notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('tab_arquivos');
};
