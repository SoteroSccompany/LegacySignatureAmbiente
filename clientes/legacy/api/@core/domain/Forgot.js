
    const uuid = require("uuid");
    class forgot{
    
        constructor(data) {
            this.id = data.id ? data.id : uuid.v4();
            this.token = data.token ? data.token : '';
            this.user_id = data.user_id ? data.user_id : '';
            this.email = data.email ? data.email : '';
        }
    
        getForgot(){
            const user =  {id: this.id, token: this.token, user_id: this.user_id, email: this.email};
            return user;
        }
    
        setForgot(data){
            this.id = data.id ? data.id : this.id;
            this.token = data.token ? data.token : this.token;
            this.user_id = data.user_id ? data.user_id : this.user_id;
            this.email = data.email ? data.email : this.email;
        }
    
    
    
    }
    
    module.exports =  forgot;
    