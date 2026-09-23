FROM chrislusf/seaweedfs:latest

# As credenciais S3 (identities) e a conexão com o Vault (bloco kms) são
# injetadas em runtime via variáveis de ambiente no docker-compose — o
# entrypoint.sh gera o s3.config.json antes de subir o servidor.

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME ["/data"]

EXPOSE 8333 9333

ENTRYPOINT ["/entrypoint.sh"]
