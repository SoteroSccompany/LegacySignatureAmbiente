
# Usar uma imagem base oficial do Node.js, que inclui o Node e o npm
FROM node:21

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o package.json e o package-lock.json (ou yarn.lock) para o diretório de trabalho
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia todos os arquivos da aplicação para o diretório de trabalho
COPY . .

# Compila a aplicação React
# RUN npm run build

# Expoe a porta na qual a aplicação irá rodar
EXPOSE 3395

# Define o comando para iniciar a aplicação
# CMD ["node", "index.js"]
CMD ["npm", "start"]
