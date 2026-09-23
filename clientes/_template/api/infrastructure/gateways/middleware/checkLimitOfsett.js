
module.exports = (req, res, next) => {
    const { limit, offset } = req.params
    if (!limit || !offset) {
        next();
    } else {
        const isNanLimiit = isNaN(limit)
        const isNanOffset = isNaN(offset)
        if (isNanLimiit || isNanOffset) {
            return res.status(400).json({ status: false, msg: 'Limite e offset devem ser números inteiros' })
        }
        const isNegativeLimit = limit < 0
        const isNegativeOffset = offset < 0
        if (isNegativeLimit || isNegativeOffset) {
            return res.status(400).json({ status: false, msg: 'Limite e offset devem ser números positivos' })
        }
        next();
    }

}