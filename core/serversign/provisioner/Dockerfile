# Provisioner one-shot: espera o SignServer ficar saudável e dispara o
# AdminCLI dentro do container dele (via docker.sock), no mesmo espírito
# do `minio/mc` do módulo bucket/.
FROM docker:27-cli

RUN apk add --no-cache curl bash

COPY init.sh /init.sh
RUN chmod +x /init.sh

ENTRYPOINT ["/init.sh"]
