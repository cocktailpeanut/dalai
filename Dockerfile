ARG UBUNTU_VERSION=22.04

FROM ubuntu:$UBUNTU_VERSION

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=18.15.0
ARG NODE_PACKAGE=node-v$NODE_VERSION-linux-x64
ARG NODE_HOME=/opt/$NODE_PACKAGE

ENV LLAMA_MODEL=7B
ENV NODE_PATH $NODE_HOME/lib/node_modules
ENV PATH $NODE_HOME/bin:$PATH
ENV USE_PYTHON_ENV=0
ENV MODELS_PATH=/home/dalai/models

RUN apt-get update && \
    apt-get install -y \
        build-essential \
        python3 \
        python3-pip \ 
        ca-certificates \
        curl \
        git

RUN curl https://nodejs.org/dist/v$NODE_VERSION/$NODE_PACKAGE.tar.gz | tar -xzC /opt/

RUN groupadd -g 1000 dalai
RUN useradd dalai -u 1000 -g 1000 -m -s /bin/bash -d /home/dalai

RUN mkdir /home/dalai/models && chown -R dalai:dalai /home/dalai/models && touch /home/dalai/models/.gitkeep

USER dalai

RUN pip install --upgrade pip setuptools wheel
RUN pip install torch torchvision torchaudio sentencepiece numpy
RUN npm install --global yarn

WORKDIR /home/dalai/app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 3000

CMD yarn just:run $LLAMA_MODEL