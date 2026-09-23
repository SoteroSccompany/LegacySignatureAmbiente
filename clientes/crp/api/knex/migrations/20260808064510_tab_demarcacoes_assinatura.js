/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_demarcacoes_assinatura';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('signatario_id', 39).notNullable()
            .references('id').inTable('tab_signatarios');
        table.string('tipo', 64).notNullable();
        table.integer('pagina').unsigned().notNullable();
        table.decimal('x', 12, 8).notNullable();
        table.decimal('y', 12, 8).notNullable();
        table.decimal('largura', 12, 8).notNullable();
        table.decimal('altura', 12, 8).notNullable();
        table.json('pdf').notNullable();
        table.json('pagina_tamanho').notNullable();
        table.timestamp('data_criacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['signatario_id'], 'idx_demarcacoes_signatario');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
