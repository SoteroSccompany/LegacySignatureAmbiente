/**
 * Torna user_id/perfil_id de tab_signatarios nullable: no modelo de staging o
 * signatário pode existir antes da promoção do usuário e antes do cadastro do perfil.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_signatarios';

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
    await dropForeignIfExists(knex, tableName, 'user_id');
    await dropForeignIfExists(knex, tableName, 'perfil_id');

    await knex.schema.alterTable(tableName, function (table) {
        table.string('user_id', 39).nullable().alter();
        table.string('perfil_id', 39).nullable().alter();
    });

    await knex.schema.alterTable(tableName, function (table) {
        table.foreign('user_id').references('id').inTable('tab_usuarios');
        table.foreign('perfil_id').references('id').inTable('tab_perfil_usuario');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await dropForeignIfExists(knex, tableName, 'user_id');
    await dropForeignIfExists(knex, tableName, 'perfil_id');

    await knex.schema.alterTable(tableName, function (table) {
        table.string('user_id', 39).notNullable().alter();
        table.string('perfil_id', 39).notNullable().alter();
    });

    await knex.schema.alterTable(tableName, function (table) {
        table.foreign('user_id').references('id').inTable('tab_usuarios');
        table.foreign('perfil_id').references('id').inTable('tab_perfil_usuario');
    });
};
