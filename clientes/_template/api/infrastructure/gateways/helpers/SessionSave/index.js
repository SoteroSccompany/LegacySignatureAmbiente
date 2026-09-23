



class SessionSave {
    static exec(session) {
        return new Promise((resolve, reject) => {
            session.save((err) => {
                if (err) {
                    reject(false);
                } else {
                    resolve(true);
                }
            });
        });
    }
}


module.exports = SessionSave;