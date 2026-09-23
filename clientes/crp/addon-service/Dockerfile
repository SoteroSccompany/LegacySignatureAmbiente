# Escolhendo a imagem base debian slim
FROM node:20-slim

# Instalando o Nodemon globalmente
RUN npm install -g nodemon

# Definindo o fuso horário e outras variáveis de ambiente
ENV TZ=America/Sao_Paulo

# Criando o diretório de trabalho
WORKDIR /app

# Copiando package.json e package-lock.json (ou yarn.lock)
COPY ./package*.json ./

# Instalando as dependências do projeto
RUN npm install 

# Copiando os arquivos do projeto
COPY ./ ./

# Expondo a porta em que sua aplicação rodará
EXPOSE 7810

# Comando para rodar a aplicação (nodemon só fora de produção)
CMD ["sh", "-c", "if [ \"$APP_STATUS\" = \"production\" ]; then node index.js; else nodemon index.js; fi"]
