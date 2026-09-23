/**
 * Migration Knex: cadeia mestre de auditoria (objeto + arquivo) em tab_auditoria_ledger
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger';

async function dropForeignIfExists(knex, tableName, columnName) {
    const [rows] = await knex.raw(
        `SELECT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL
         LIMIT 1`,
        [tableName, columnName]
    );
    if (rows && rows.length && rows[0].name) {
        await knex.raw(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${rows[0].name}\``);
    }
}

exports.up = async function (knex) {
    await dropForeignIfExists(knex, tableName, 'documento_id');

    await knex.schema.alterTable(tableName, function (table) {
        table.string('documento_id', 39).nullable().alter();
        table.string('hash_bytes_pdf', 64).nullable().alter();
        table.string('solicitacao_id', 39).nullable()
            .references('id')
            .inTable('tab_solicitacao_documento');
        table.string('objeto_tipo', 64).notNullable();
        table.string('objeto_id', 39).notNullable();
        table.string('hash_objeto_inicial', 64).nullable();
        table.string('hash_objeto_final', 64).nullable();
        table.string('hash_documento_inicial', 64).nullable();
        table.string('hash_documento_final', 64).nullable();
        table.unique(['solicitacao_id', 'sequencia'], 'uk_auditoria_ledger_solicitacao_sequencia');
        table.index(['objeto_tipo', 'objeto_id'], 'idx_auditoria_ledger_objeto');
        table.index(['solicitacao_id'], 'idx_auditoria_ledger_solicitacao');
    });

    await knex.schema.alterTable(tableName, function (table) {
        table.foreign('documento_id').references('id').inTable('tab_documentos');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await dropForeignIfExists(knex, tableName, 'solicitacao_id');
    await dropForeignIfExists(knex, tableName, 'documento_id');

    await knex.schema.alterTable(tableName, function (table) {
        table.dropUnique(['solicitacao_id', 'sequencia'], 'uk_auditoria_ledger_solicitacao_sequencia');
        table.dropIndex(['objeto_tipo', 'objeto_id'], 'idx_auditoria_ledger_objeto');
        table.dropIndex(['solicitacao_id'], 'idx_auditoria_ledger_solicitacao');
        table.dropColumn('solicitacao_id');
        table.dropColumn('objeto_tipo');
        table.dropColumn('objeto_id');
        table.dropColumn('hash_objeto_inicial');
        table.dropColumn('hash_objeto_final');
        table.dropColumn('hash_documento_inicial');
        table.dropColumn('hash_documento_final');
        table.string('documento_id', 39).notNullable().alter();
        table.string('hash_bytes_pdf', 64).notNullable().alter();
    });

    await knex.schema.alterTable(tableName, function (table) {
        table.foreign('documento_id').references('id').inTable('tab_documentos');
    });
};
