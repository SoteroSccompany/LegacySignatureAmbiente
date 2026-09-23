/**
 * Migration Knex: código de verificação matemático do documento (aponta para a trilha de auditoria completa)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_aceite_termo_responsabilidade';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('termo_id', 39).notNullable()
            .references('id')
            .inTable('tab_termo_responsabilidade');
        table.string('user_id', 39).notNullable()
            .references('id')
            .inTable('tab_usuarios');
        table.string('login_id', 39).notNullable()
            .references('id')
            .inTable('tab_login');
        table.text("termo_hash").notNullable();
        table.datetime('aceito_em', { useTz: true }).notNullable();
        table.datetime('data_criacao', { useTz: true }).notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
