# Escolhendo a imagem base debian slim
FROM node:20-slim

# Instalando dependências necessárias para o wkhtmltopdf
RUN apt-get update && apt-get install -y \
      wkhtmltopdf \
      xvfb \
      fonts-dejavu-core \
      fontconfig \
      dbus \
      --no-install-recommends && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/*

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

# Instalando o PM2 globalmente
RUN npm install -g pm2

# Copiando os arquivos do projeto
COPY ./ ./

# Expondo a porta em que sua aplicação rodará
EXPOSE 9366

# Comando para rodar a aplicação
#Dev
# CMD ["nodemon", "index.js"]
#Prod
CMD ["pm2-runtime", "ecosystem.config.js"]