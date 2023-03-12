# Dalai

Dead simple way to run LLaMA on your computer.

<a href="https://github.com/cocktailpeanut/dalai" class='inverse btn'><i class="fa-brands fa-github"></i> Github</a>
<a href="https://twitter.com/cocktailpeanut" class='inverse btn'><i class="fa-brands fa-twitter"></i> Twitter</a>

---

#### JUST RUN THIS:

<img src="terminal.png" class='round'>

#### TO GET:

![dalai.gif](dalai.gif)

---

1. Powered by [llama.cpp](https://github.com/ggerganov/llama.cpp) and [llama-dl CDN](https://github.com/shawwn/llama-dl)
2. Hackable web app included
3. Ships with JavaScript API
4. Ships with [Socket.io](https://socket.io/) API

---

# Quickstart

Install the 7B model (default) and start a web UI:

```
npx dalai llama
npx dalai serve
```

Then go to http://localhost:3000

Above two commands do the following:

1. First installs the 7B module (default)
2. Then starts a web/API server at port 3000


---

# Install

Basic install (7B model only)

```
npx dalai llama
```

Install all models

```
npx dalai llama 7B 13B 30B 65B
```

The install command :

1. Creates a folder named `dalai` under your home directory (`~`)
2. Installs and builds the [llama.cpp](https://github.com/ggerganov/llama.cpp) project under `~/dalai`
3. Downloads all the requested models from the [llama-dl CDN](https://github.com/shawwn/llama-dl) to `~/dalai/models`
4. Runs some tasks to convert the LLaMA models so they can be used

---

# API

Dalai is also an NPM package:

1. programmatically install
2. locally make requests to the model
3. run a dalai server (powered by socket.io)
3. programmatically make requests to a remote dalai server (via socket.io)

Dalai is an NPM package. You can install it using:

```
npm install dalai
```

---

## 1. constructor()

### Syntax

```javascript
const dalai = new Dalai(url)
```

- `url`: (optional)
  - if unspecified, it uses the node.js API to directly run dalai
  - if specified (for example `ws://localhost:3000`) it looks for a socket.io endpoint at the URL and connects to it.

### Examples

Initializing a client that connects to a local model (no network):

```javascript
const dalai = new Dalai()
```

Initializing a client that connects to a remote dalai server (a dalai server must be running at the URL):

```javascript
const dalai = new Dalai("ws://localhost:3000")
```

---

## 2. request()

### Syntax

```javascript
dalai.request(req, callback)
```

- `req`: a request object. made up of the following attributes:
  - `prompt`: **(required)** The prompt string
  - `model`: **(required)** The model name to query ("7B", "13B", etc.)
  - `threads`: The number of threads to use (The default is 8 if unspecified)
  - `n_predict`: The number of tokens to return (The default is 128 if unspecified)
  - `seed`: The seed. The default is -1 (none)
  - `top_k`
  - `top_p`
  - `temp`: temperature
  - `batch_size`: batch size
- `callback`: the streaming callback function that gets called every time the client gets any token response back from the model

### Examples

#### 1. Node.js

Using node.js, you just need to initialize a Dalai object with `new Dalai()` and then use it.

```javascript
const Dalai = require('dalai')
new Dalai().request({
  model: "7B",
  prompt: "The following is a conversation between a boy and a girl:",
}, (token) => {
  process.stdout.write(token)
})
```

#### 2. Non node.js (socket.io)

To make use of this in a browser or any other language, you can use thie socket.io API.

##### Step 1. start a server

First you need to run a Dalai socket server:

```javascript
// server.js
const Dalai = require('dalai')
new Dalai().serve(3000)     // port 3000
```

##### Step 2. connect to the server

Then once the server is running, simply make requests to it by passing the `ws://localhost:3000` socket url when initializing the Dalai object:

```javascript
const Dalai = require("dalai")
new Dalai("ws://localhost:3000").request({
  model: "7B",
  prompt: "The following is a conversation between a boy and a girl:",
}, (token) => {
  console.log("token", token)
})
```

---

## 3. serve()

### Syntax

Starts a socket.io server at `port`

```javascript
dalai.serve(port)
```

### Examples

```javascript
const Dalai = require("dalai")
new Dalai().serve(3000)
```

---

## 4. http()

### Syntax

connect with an existing `http` instance (The `http` npm package)

```javascript
dalai.http(http)
```

- `http`: The [http](https://nodejs.org/api/http.html) object

### Examples

This is useful when you're trying to plug dalai into an existing node.js web app

```javascript
const app = require('express')();
const http = require('http').Server(app);
dalai.http(http)
http.listen(3000, () => {
  console.log("server started")
})
```
