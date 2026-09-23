



const exec = require('../index')

const key = ''

const genCode = () => {
    const code = exec.create({ dto: key, type: 'keyproxy' });
    console.log(code)
}

genCode()
