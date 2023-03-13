const os = require('os');
const pty = require('node-pty');
const path = require('path');
const fs = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { io } = require("socket.io-client");
const term = require( 'terminal-kit' ).terminal;
const Downloader = require("nodejs-file-downloader");
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
class Dalai {
  constructor(url) {
    if (url) this.url = url
    this.home = path.resolve(os.homedir(), "dalai")
    try {
      fs.mkdirSync(this.home, { recursive: true })
    } catch (e) { }
    this.config = {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
    }
  }
  async download(model) {
    console.log(`Download model ${model}`)
    const num = {
      "7B": 1,
      "13B": 2,
      "30B": 4,
      "65B": 8,
    }
    const files = ["checklist.chk", "params.json"]
    for(let i=0; i<num[model]; i++) {
      files.push(`consolidated.0${i}.pth`)
    }
    const resolvedPath = path.resolve(this.home, "models", model)
    await fs.promises.mkdir(resolvedPath, { recursive: true }).catch((e) => { })

    for(let file of files) {
      if (fs.existsSync(path.resolve(resolvedPath, file))) {
        console.log(`Skip file download, it already exists: ${file}`)
        continue;
      }

      const task = `downloading ${file}`
      const downloader = new Downloader({
        url: `https://agi.gpt4.org/llama/LLaMA/${model}/${file}`,
        directory: path.resolve(this.home, "models", model),
        onProgress: (percentage, chunk, remainingSize) => {
          this.progress(task, percentage)
        },
      });
      try {
        await this.startProgress(task)
        await downloader.download();
      } catch (error) {
        console.log(error);
      }
      this.progressBar.update(1);
      term("\n")
    }

    const files2 = ["tokenizer_checklist.chk", "tokenizer.model"]
    for(let file of files2) {
      if (fs.existsSync(path.resolve(this.home, "models", file))) {
        console.log(`Skip file download, it already exists: ${file}`)
        continue;
      }
      const task = `downloading ${file}`
      const downloader = new Downloader({
        url: `https://agi.gpt4.org/llama/LLaMA/${file}`,
        directory: path.resolve(this.home, "models"),
        onProgress: (percentage, chunk, remainingSize) => {
          this.progress(task, percentage)
        },
      });
      try {
        await this.startProgress(task)
        await downloader.download();
      } catch (error) {
        console.log(error);
      }
      this.progressBar.update(1);
      term("\n")
    }

  }
  async install(...models) {
    // install to ~/llama.cpp
    await this.exec("pip3 install torch torchvision torchaudio sentencepiece numpy")
    await this.exec("pip install torch torchvision torchaudio sentencepiece numpy")
    await this.exec("git clone https://github.com/ggerganov/llama.cpp.git dalai", os.homedir())
    await this.exec("make", this.home)
    for(let model of models) {
      await this.download(model)
      const outputFile = path.resolve(this.home, 'models', model, 'ggml-model-f16.bin')
      if (fs.existsSync(outputFile)) {
        console.log(`Skip conversion, file already exists: ${outputFile}`)
      } else {
        await this.exec(`python3 convert-pth-to-ggml.py models/${model}/ 1`, this.home)
      }
      await this.quantize(model)
    }
  }
  serve(port) {
    const httpServer = createServer();
    const io = new Server(httpServer)
    io.on("connection", (socket) => {
      socket.on('request', async (req) => {
        await this.query(req, (str) => {
          io.emit("result", { response: str, request: req })
        })
      });
    });
    httpServer.listen(port)
  }
  http(httpServer) {
    const io = new Server(httpServer)
    io.on("connection", (socket) => {
      socket.on('request', async (req) => {
        await this.query(req, (str) => {
          io.emit("result", { response: str, request: req })
        })
      });
    });
  }
  async request(req, cb) {
    if (this.url) {
      await this.connect(req, cb)
    } else {
      await this.query(req, cb)
    }
  }
  async query(req, cb) {
    console.log(`> query:`, req)
    let o = {
      seed: req.seed || -1,
      threads: req.threads || 8,
      n_predict: req.n_predict || 128,
      model: `./models/${req.model || "7B"}/ggml-model-q4_0.bin`
    }

    if (!fs.existsSync(path.resolve(this.home, o.model))) {
      cb(`File does not exist: ${o.model}. Try "dalai llama ${req.model}" first.`)
      return
    }

    if (req.top_k) o.top_k = req.top_k
    if (req.top_p) o.top_p = req.top_p
    if (req.temp) o.temp = req.temp
    if (req.batch_size) o.batch_size = req.batch_size

    let chunks = [] 
    for(let key in o) {
      chunks.push(`--${key} ${o[key]}`) 
    }
    chunks.push(`-p "${req.prompt}"`)

    if (req.full) {
      await this.exec(`./main ${chunks.join(" ")}`, this.home, cb)
    } else {
      const startpattern = /.*sampling parameters:.*/g
      const endpattern = /.*mem per token.*/g
      let started = false
      let ended = false
      await this.exec(`./main ${chunks.join(" ")}`, this.home, (msg) => {
        if (endpattern.test(msg)) ended = true
        if (started && !ended) {
          cb(msg)
        }
        if (startpattern.test(msg)) started = true
      })
    }
  }
  connect(req, cb) {
    const socket = io(this.url)
    socket.emit('request', req)
    socket.on('response', cb)
    socket.on('error', function(e) {
      throw e
    });
  }
  exec(cmd, cwd, cb) {
    return new Promise((resolve, reject) => {
      const config = Object.assign({}, this.config)
      if (cwd) {
        config.cwd = path.resolve(cwd)
      }
      const ptyProcess = pty.spawn(shell, [], config)
      ptyProcess.onData((data) => {
        if (cb) {
          cb(data)
        } else {
          process.stdout.write(data);
        }
      });
      ptyProcess.onExit((res) => {
        resolve(res)
      });
      ptyProcess.write(`${cmd}\r`)
      ptyProcess.write("exit\r")
    })
  }
  async quantize(model) {
    let num = {
      "7B": 1,
      "13B": 2,
      "30B": 4,
      "65B": 8,
    }
    for(let i=0; i<num[model]; i++) {
      const suffix = (i === 0 ? "" : `.${i}`)
      const outputFile1 = `./models/${model}/ggml-model-f16.bin${suffix}`
      const outputFile2 = `./models/${model}/ggml-model-q4_0.bin${suffix}`
      if (fs.existsSync(path.resolve(this.home, outputFile1)) && fs.existsSync(path.resolve(this.home, outputFile2))) {
        console.log(`Skip quantization, files already exists: ${outputFile1} and ${outputFile2}}`)
        continue
      }
      await this.exec(`./quantize ${outputFile1} ${outputFile2} 2`, this.home)
    }
  }
  progress(task, percent) {
    this.progressBar.update(percent/100);
    //if (percent >= 100) {
    //  setTimeout(() => {
    //    term("\n")
    //  }, 200)
    //}
  }
  startProgress(title) {
    this.progressBar = term.progressBar({
      width: 120,
      title,
      eta: true ,
      percent: true
    });
  }
}
module.exports = Dalai
