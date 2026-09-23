/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */


const tableName = 'tab_broker';
exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).primary();
        table.string('exchange').notNullable();
        table.bigInteger('delayMs').notNullable();
        table.string('fila').nullable();
        table.string('key').notNullable();
        table.jsonb('message').notNullable();
        table.integer('status').notNullable();
        table.integer('tentativas').nullable();
        table.dateTime('ultima_tentativa').nullable();
        table.dateTime('data_atualizacao').notNullable();
        table.dateTime('data_criacao').notNullable();
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
