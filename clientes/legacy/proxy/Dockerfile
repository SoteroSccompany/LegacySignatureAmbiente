# Escolhendo a imagem base
FROM node:alpine


RUN npm install -g nodemon

# Criando diretório de trabalho
WORKDIR /app

# Copiando package.json e package-lock.json (ou yarn.lock)
COPY ./package*.json ./

RUN npm install

COPY ./ ./


# Copiando os arquivos do projeto

# Expondo a porta em que sua aplicação rodará
EXPOSE 7749

# Instalando as dependências do projeto

# Comando para rodar a aplicação
#Dev
CMD ["nodemon", "index.js"]
#Prod
# CMD ["node", "index.js"]
