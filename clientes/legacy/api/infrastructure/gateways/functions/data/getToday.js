

const moment = require('moment-timezone')

module.exports = () => {
    return moment.tz("America/Sao_Paulo").format('YYYY-MM-DD HH:mm:ss')
}