
    module.exports = (req, res, next) => {
        const traverse = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key].trim();
                } else if (typeof obj[key] === 'object') {
                    traverse(obj[key]);
                }
            }
        };
    
        if (req.body && typeof req.body === 'object') {
            traverse(req.body);
        }
    
        next();
    
    }
    