ARG SIZE=7B

FROM node:lts-slim

RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g node-gyp

WORKDIR /root

COPY . .

RUN npm i

RUN ./dalai llama ${SIZE}

CMD [ "npm", "run", "start" ]
EXPOSE 3000