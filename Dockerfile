FROM node:18-buster-slim

ARG MODEL_NAME=alpaca
ARG MODEL_VERSION=7B

EXPOSE 3000

RUN apt-get update \
    && apt-get install -y \
        build-essential \
        curl \
        g++ \
        make \
        python3-venv \
        software-properties-common
        
RUN apt-get update 

COPY . .
WORKDIR /root/

# Install dalai and its dependencies
RUN npm install

# # Install a model
RUN npx dalai ${MODEL_NAME} install ${MODEL_VERSION}

# # Run the dalai server
ENTRYPOINT [ "npx", "dalai", "serve" ]