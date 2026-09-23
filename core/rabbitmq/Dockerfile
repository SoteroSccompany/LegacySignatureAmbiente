FROM rabbitmq:3-management

COPY  rabbitmq.conf /etc/rabbitmq/


# Instalar o wget para poder baixar o plugin
RUN apt-get update && apt-get install -y wget

RUN wget "https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez" \
    -O /plugins/rabbitmq_delayed_message_exchange-4.0.ez \
    && rabbitmq-plugins enable rabbitmq_delayed_message_exchange

