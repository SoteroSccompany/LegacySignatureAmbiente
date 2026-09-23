const fs = require('fs');

const generateDomain = (domain, data) => {

    if ((domain === undefined || domain === ' ' || domain === '' || domain === null) || (data.length === 0)) {
        return { status: false, msg: 'Dadaos e/ou domain não podem ser vazio' }

    } else {
        const contentFile =
            `
            const uuid = require('uuid');
            const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
            class ${domain}Domain {
    
                constructor(data) {
                    ${data.map((element) => {
                if (element == 'id') return `this.${element} = data.${element} ? data.${element} : uuid.v4() \n`
                //if(element == 'createdAt')return `this.${element} = data.${element} ? data.${element} : new Date() \n`
                if (element !== 'id' && element !== 'data_criacao' && element !== 'data_atualizacao' && element !== 'data_criacao' && element !== 'deletado') return `this.${element} = data.${element} \n`
                if (element === 'data_criacao') return `this.${element} =  data.${element} \n`
                if (element === 'data_atualizacao') return `this.${element} =  data.${element} ? data.${element} :  dateNow() \n`
                if (element === 'deletado') return `this.${element} = data.deletado === true || data.deletado === false  ? data.deletado : false \n`
            }).join('')
            }
                }           
    
                get${domain}(){
                    return {
                        ${data.map((element) => {
                return `${element}: this.${element}, \n`
            }
            ).join('')
            }
                    }
                }
    
                set${domain}(data){
                    ${data.map((element) => {
                if (element === 'deletado') return `this.${element} = data.deletado === true || data.deletado === false  ? data.deletado : false \n`
                return `this.${element} = data.${element} ? data.${element} : this.${element} \n`
            }).join('')
            }
                    return this.get${domain}()
                }
                
            }    
            
            module.exports = ${domain}Domain;
        `;

        fs.writeFileSync(`../@core/domain/${domain}.js`, contentFile, (err) => {
            console.log(err)
            if (err) throw err;
            if (!err) console.log(`${domain}.js criado com successo!`);
        });

    }
}

module.exports = generateDomain;