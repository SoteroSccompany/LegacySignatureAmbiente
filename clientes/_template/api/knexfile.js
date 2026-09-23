
require("dotenv/config");
module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'mysql',
    connection: {
      database: process.env.DB_DATABASE || 'my_db',
      user: process.env.DB_USER || 'username',
      password: process.env.DB_PASS || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './knex/migrations'
    },
    seeds: {
      directory: './knex/seeds'
    }
  },

  production: {
    client: process.env.DB_CLIENT || 'mysql',
    connection: {
      database: process.env.DB_DATABASE || 'my_db',
      user: process.env.DB_USER || 'username',
      password: process.env.DB_PASS || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './knex/migrations'
    },
    seeds: {
      directory: './knex/seeds'
    }
  }

};
