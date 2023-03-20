FROM python:3.10-slim-buster

# The model name and version - see the README for more information"
ARG MODEL_NAME=alpaca
ARG MODEL_VERSION=7B

# The dalai server runs on port 3000
EXPOSE 3000

# Install dependencies
RUN apt-get update \
    && apt-get install -y \
        build-essential \
        curl \
        g++ \
        make \
        python3-venv \
        software-properties-common

# Add NodeSource PPA to get Node.js 18.x
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js 18.x
RUN apt-get update \
    && apt-get install -y nodejs

# Copy the dalai source code into the container
WORKDIR /dalai

COPY . .

# Install dalai and its dependencies
RUN npm install

# Install a model
RUN npx dalai ${MODEL_NAME} install ${MODEL_VERSION}

# Run the dalai server
ENTRYPOINT [ "npx", "dalai", "serve" ]
