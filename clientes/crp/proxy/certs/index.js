require('dotenv/config');

module.exports = {
    APIKEY: `Bearer ${process.env.KEY_API}`,
    api: process.env.APP_STATUS === 'production' ? `https://${process.env.API_HOST}:${process.env.API_PORT}` : `http://${process.env.API_HOST}:${process.env.API_PORT}`,
}
