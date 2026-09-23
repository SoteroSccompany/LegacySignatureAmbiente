
    const uuid = require('uuid');
    class changeEmail{
    
        constructor(data) {
            this.id = data.id ? data.id : uuid.v4();
            this.antigoEmail = data.antigoEmail ? data.antigoEmail : '';
            this.novoEmail = data.novoEmail ? data.novoEmail : '';
            this.token = data.token ? data.token : '';
            this.user_id = data.user_id ? data.user_id : '';
            this.senha = data.senha ? data.senha : '';
            this.data_criacao = data.data_criacao ? data.data_criacao : '';
            this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : '';
            this.deletado = data.deletado ? data.deletado : '';
        }
    
        getEmail(){
            const user =  {id: this.id, token: this.token, user_id: this.user_id, antigoEmail: this.antigoEmail, novoEmail: this.novoEmail, senha: this.senha,
            
            };
            return user;
        }
    
        setEmail(data){
            this.id = data.id ? data.id : this.id;
            this.antigoEmail = data.antigoEmail ? data.antigoEmail : this.antigoEmail;
            this.novoEmail = data.novoEmail ? data.novoEmail : this.novoEmail;
            this.token = data.token ? data.token : this.token;
            this.user_id = data.user_id ? data.user_id : this.user_id;
            this.senha = data.senha ? data.senha : this.senha;
        }
        
        change(){
            this.setEmail({email: this.antigoEmail});
            return this.getEmail();
        }
    
    
    
    }
    
    module.exports =  changeEmail;
    