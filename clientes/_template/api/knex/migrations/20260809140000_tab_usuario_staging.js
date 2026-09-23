/**
 * Migration Knex: Staging de onboarding de usuário (painel e signatário).
 * Guarda o convite/senha temporária até a promoção para tab_usuarios no 1º login.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_usuario_staging';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('email', 255).notNullable();
        table.string('senha_hash', 255).notNullable();
        table.integer('role').notNullable();

        table.string('origem', 32).notNullable();
        table.string('origem_id', 39).nullable();

        table.string('status', 32).notNullable();

        table.boolean('senha_redefinida').notNullable().defaultTo(false);
        table.boolean('dois_fatores_ok').notNullable().defaultTo(false);
        table.boolean('perfil_ok').notNullable().defaultTo(false);

        table.string('user_id', 39).nullable()
            .references('id').inTable('tab_usuarios');

        table.string('nome', 255).nullable();
        table.text('cpf_encrypt').nullable();
        table.string('cpf_bindex', 64).nullable();

        table.json('meta_dados').nullable();

        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('atualizado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('expira_em', { useTz: true }).nullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['email', 'status'], 'idx_usuario_staging_email_status');
        table.index(['cpf_bindex'], 'idx_usuario_staging_cpf');
        table.index(['origem', 'origem_id'], 'idx_usuario_staging_origem');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
