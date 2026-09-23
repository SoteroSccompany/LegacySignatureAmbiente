const { APIKEY } = require('../../../certs/index');
const crypt = require("../crypt/CriptClass.crypt");

module.exports = (req, res, next) => {
    const beaerer = req.headers.apikey;
    if (req.headers.apikey === "" || req.headers.apikey === undefined || req.headers.apikey === null || req.headers.apikey === "  ") {
        res.status(403).json({ status: false, msg: "Unauthorized" })
    } else {
        if (beaerer === undefined || beaerer === null || beaerer === "") {
            res.status(403).json({ status: false, msg: "Unauthorized" })
        }
        const token = beaerer.split(" ")[1];
        if (token === undefined || token === null || token === "") {
            res.status(403).json({ status: false, msg: "Unauthorized" })
        }
        const tokenCrypt = crypt.verify({ dto: token, type: "APIauth" });
        if (tokenCrypt.token === APIKEY) {
            next();
        } else {
            res.status(403).json({ status: false, msg: "Unauthorizeds" })
        }
    }
}