/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_signatarios';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('documento_id', 39).notNullable()
            .references('id').inTable('tab_documentos');
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('perfil_id', 39).notNullable()
            .references('id').inTable('tab_perfil_usuario');
        table.integer('ordem').unsigned().nullable();
        table.string('status', 64).notNullable();
        table.timestamp('data_criacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('data_atualizacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['documento_id', 'status'], 'idx_signatarios_documento_status');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
