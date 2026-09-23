/**
 * Inverte o vínculo documento ↔ solicitação:
 * - remove tab_documentos.solicitacao_id
 * - adiciona tab_solicitacao_documento.documento_id (nullable)
 * - adiciona tab_solicitacao_documento.solicitacao_origem_id (self-FK, nullable)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

async function dropIndexIfExists(knex, tableName, indexName) {
    const [rows] = await knex.raw(
        `SELECT 1 AS ok FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
         LIMIT 1`,
        [tableName, indexName]
    );
    if (rows && rows.length) {
        await knex.raw(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
    }
}

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
    const hasDocumentoId = await knex.schema.hasColumn('tab_solicitacao_documento', 'documento_id');
    if (!hasDocumentoId) {
        await knex.schema.alterTable('tab_solicitacao_documento', function (table) {
            table.string('documento_id', 39).nullable()
                .references('id').inTable('tab_documentos');
            table.string('solicitacao_origem_id', 39).nullable()
                .references('id').inTable('tab_solicitacao_documento');
            table.index(['documento_id'], 'idx_solicitacao_documento_documento');
            table.index(['solicitacao_origem_id'], 'idx_solicitacao_documento_origem');
        });
    }

    const hasSolicitacaoIdOnDoc = await knex.schema.hasColumn('tab_documentos', 'solicitacao_id');
    if (hasSolicitacaoIdOnDoc) {
        await knex.raw(`
            UPDATE tab_solicitacao_documento s
            INNER JOIN tab_documentos d ON d.solicitacao_id = s.id
            SET s.documento_id = d.id
            WHERE s.documento_id IS NULL
        `);

        await dropForeignIfExists(knex, 'tab_documentos', 'solicitacao_id');
        await dropIndexIfExists(knex, 'tab_documentos', 'uk_documentos_solicitacao');
        await knex.schema.alterTable('tab_documentos', function (table) {
            table.dropColumn('solicitacao_id');
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    const hasSolicitacaoIdOnDoc = await knex.schema.hasColumn('tab_documentos', 'solicitacao_id');
    if (!hasSolicitacaoIdOnDoc) {
        await knex.schema.alterTable('tab_documentos', function (table) {
            table.string('solicitacao_id', 39).nullable()
                .references('id').inTable('tab_solicitacao_documento');
            table.unique(['solicitacao_id'], 'uk_documentos_solicitacao');
        });
    }

    const hasDocumentoId = await knex.schema.hasColumn('tab_solicitacao_documento', 'documento_id');
    if (hasDocumentoId) {
        await knex.raw(`
            UPDATE tab_documentos d
            INNER JOIN tab_solicitacao_documento s ON s.documento_id = d.id
            SET d.solicitacao_id = s.id
            WHERE d.solicitacao_id IS NULL
        `);

        await dropForeignIfExists(knex, 'tab_solicitacao_documento', 'documento_id');
        await dropForeignIfExists(knex, 'tab_solicitacao_documento', 'solicitacao_origem_id');
        await dropIndexIfExists(knex, 'tab_solicitacao_documento', 'idx_solicitacao_documento_documento');
        await dropIndexIfExists(knex, 'tab_solicitacao_documento', 'idx_solicitacao_documento_origem');
        await knex.schema.alterTable('tab_solicitacao_documento', function (table) {
            table.dropColumn('documento_id');
            table.dropColumn('solicitacao_origem_id');
        });
    }
};
