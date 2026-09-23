# Vault em modo server com storage persistente em arquivo (DEV).
# Diferente do modo -dev (em memória), as chaves do Transit sobrevivem
# a restart/recreate do container. O unseal é feito pelo vault-init.
ui            = true
disable_mlock = true

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}
