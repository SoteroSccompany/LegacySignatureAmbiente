const crypto = require('crypto');
const { pipeline } = require('stream/promises');

async function hashSha256FromStream(stream) {
    const hash = crypto.createHash('sha256');
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest('hex');
}

async function pipeStreamTo(stream, destination) {
    await pipeline(stream, destination);
}

module.exports = {
    hashSha256FromStream,
    pipeStreamTo,
};
