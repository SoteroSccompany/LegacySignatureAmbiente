/**
 * Migration Knex: Ledger encadeado de auditoria do perfil de usuário
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_perfil_usuario';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('perfil_id', 39).notNullable()
            .references('id')
            .inTable('tab_perfil_usuario');

        table.string('usuario_id', 39).notNullable()
            .references('id')
            .inTable('tab_usuarios');

        table.string('tipo_evento', 120).notNullable();
        table.integer('sequencia').unsigned().notNullable();

        table.json('metadata_json').nullable();

        table.string('hash_atual', 64).notNullable();
        table.string('hash_registro_anterior', 64).nullable();

        table.string('bucket_path', 200).notNullable();
        table.text('object_name').notNullable();

        table.string('payload_sha256', 64).notNullable();

        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());

        table.string('auditoria_ledger_origem', 39).nullable()
            .references('id')
            .inTable(tableName)
            .withKeyName('fk_ledger_perfil_usr_origem');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['perfil_id', 'sequencia'], 'uk_ledger_perfil_usuario_seq');
        table.unique(['hash_atual'], 'uk_ledger_perfil_usuario_hash_atual');

        table.index(['perfil_id', 'criado_em'], 'idx_ledger_perfil_usuario_criado');
        table.index(['usuario_id'], 'idx_ledger_perfil_usuario_usuario');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
