const os = require('os');
const pty = require('node-pty');
const path = require('path');
const fs = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { io } = require("socket.io-client");
const term = require( 'terminal-kit' ).terminal;
const Downloader = require("nodejs-file-downloader");
const platform = os.platform()
const shell = platform === 'win32' ? 'powershell.exe' : 'bash';

class Dalai {
  constructor(llamaPath) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // 1. manually set llama.cpp home
    // 2. otherwise store llama.cpp at ~/llama.cpp
    //
    //  # NOTE
    //  Could have used process.cwd() (The current execution directory) to download llama.cpp
    //  but this makes it cumbersome as you try to build multiple apps, because by default Dalai client will
    //  look for the current execution directory for llama.cpp.
    //  It's simpler to set the ~/llama.cpp as the default directory and use that path as the single source
    //  of truth and let multiple apps all connect to that path
    //  Otherwise if you want to customize the path you can just pass in the "home" attribute to manually set it.
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    this.llamaPath = llamaPath ? path.resolve(llamaPath) : process.env.LLAMA_PATH ?? path.resolve(os.homedir(), "llama.cpp")
    this.usePyEnv = process.env.USE_PYTHON_ENV === undefined || process.env.USE_PYTHON_ENV === '1';
    this.modelsPath = process.env.MODELS_PATH ?? path.resolve(this.llamaPath, "models");
    
    console.log('settings', {
      llamaPath: this.llamaPath, 
      usePyEnv: this.usePyEnv, 
      modelsPath: this.modelsPath
    });

    try {
      fs.mkdirSync(this.llamaPath, { recursive: true })
    } catch (e) { }
    
    try {
      fs.mkdirSync(this.modelsPath, { recursive: true })
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
    const resolvedPath = path.resolve(this.modelsPath, model)
    await fs.promises.mkdir(resolvedPath, { recursive: true }).catch((e) => { })

    for(let file of files) {
      const modelPathFile = path.resolve(resolvedPath, file);
      if (fs.existsSync(modelPathFile)) {
        console.log(`Skip file download, it already exists: ${file}`)
        continue;
      }

      const task = `downloading ${file}`
      const downloader = new Downloader({
        url: `https://agi.gpt4.org/llama/LLaMA/${model}/${file}`,
        directory: resolvedPath,
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
      const modelPathFile = path.resolve(this.modelsPath, file);
      if (fs.existsSync(modelPathFile)) {
        console.log(`Skip file download, it already exists: ${file}`)
        continue;
      }
      const task = `downloading ${file}`
      const downloader = new Downloader({
        url: `https://agi.gpt4.org/llama/LLaMA/${file}`,
        directory: this.modelsPath,
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
  async installed() {
    const modelFolders = (await fs.promises.readdir(this.modelsPath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    console.log({ modelFolders })
    const modelNames = []
    for(let modelFolder of modelFolders) {
      if (fs.existsSync(path.resolve(this.modelsPath, modelFolder, 'ggml-model-q4_0.bin'))) {
        modelNames.push(modelFolder)
        console.log("exists", modelFolder)
      }
    }
    return modelNames
  }
  async install(...models) {
    // install llama.cpp to home
    let success = await this.exec(`git clone https://github.com/ggerganov/llama.cpp.git ${this.llamaPath}`)
    if (!success) {
      // soemthing went wrong. try pulling
      success = await this.exec(`git pull`, this.llamaPath)
      if (!success) {
        throw new Error("cannot git clone or pull")
      }
    }

    // on linux, first install all the prerequisites
    if (platform === "linux") {
      // ubuntu debian
      success = await this.exec("apt-get install build-essential python3-venv -y")
      if (!success) {
        // fefdora
        await this.exec("dnf install make automake gcc gcc-c++ kernel-devel python3-virtualenv -y")
      }
    }
    
    let pip_path = platform === "win32" ? 'pip.exe' : 'pip';
    let python_path = platform === "win32" ? 'python3.exe' : 'python3';

    if(!await this.exec(python_path + ' --version')){
      python_path = platform === "win32" ? 'python.exe' : 'python';
    }

    if(!await this.exec(python_path + ' --version')){
      throw new Error("cannot execute python3 or python")
    }

    // create venv
    if(this.usePyEnv){
      const venv_path = path.join(this.llamaPath, "venv")
      await this.exec(`${python_path} -m venv ${venv_path}`)
      // different venv paths for Windows
      pip_path = platform === "win32" ? path.join(venv_path, "Scripts", "pip.exe") : path.join(venv_path, "bin", "pip")
      python_path = platform == "win32" ? path.join(venv_path, "Script", "python.exe") : path.join(venv_path, 'bin', 'python')
    }

    // upgrade setuptools
    success = await this.exec(`${pip_path} install --upgrade pip setuptools wheel`)
    if (!success) {
      throw new Error("pip setuptools wheel upgrade failed")
    }

    // install to ~/llama.cpp
    success = await this.exec(`${pip_path} install torch torchvision torchaudio sentencepiece numpy`)
    if (!success) {
      throw new Error("dependency installation failed")
      return
    }

    if (platform === "win32") {
      success = await this.exec(`${pip_path} install cmake`)
      if (!success) {
        throw new Error("cmake installation failed")
      }
      await this.exec("mkdir build", this.llamaPath)
      await this.exec("cmake -S . -B build", this.llamaPath)
      await this.exec("cmake --build . --config Release", path.resolve(this.llamaPath, "build"))
    } else {
      success = await this.exec("make", this.llamaPath)
      if (!success) {
        throw new Error("running 'make' failed")
      }
    }
    for(let model of models) {
      await this.download(model)
      const outputFile = path.resolve(this.modelsPath, model, 'ggml-model-f16.bin')
      if (fs.existsSync(outputFile)) {
        console.log(`Skip conversion, file already exists: ${outputFile}`)
      } else {
        await this.exec(`${python_path} convert-pth-to-ggml.py ${this.modelsPath}/${model}/ 1`, this.llamaPath)
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
    if (req.url) {
      this.connect(req, cb)
    } else {
      await this.query(req, cb)
    }
  }
  async query(req, cb) {
    console.log(`> query:`, req)
    if (req.method === "installed") {
      let models = await this.installed()
      for(let model of models) {
        cb(model)
      }
      cb('\n\n<end>')
      return
    }

    let o = {
      seed: req.seed || -1,
      threads: req.threads || 8,
      n_predict: req.n_predict || 128,
      model: `${this.modelsPath}/${req.model || "7B"}/ggml-model-q4_0.bin`
    }

    if (!fs.existsSync(path.resolve(this.llamaPath, o.model))) {
      cb(`File does not exist: ${o.model}. Try "dalai llama ${req.model}" first.`)
      return
    }

    if (req.top_k) o.top_k = req.top_k
    if (req.top_p) o.top_p = req.top_p
    if (req.temp) o.temp = req.temp
    if (req.batch_size) o.batch_size = req.batch_size
    if (req.repeat_last_n) o.repeat_last_n = req.repeat_last_n
    if (req.repeat_penalty) o.repeat_penalty = req.repeat_penalty

    let chunks = []
    for(let key in o) {
      chunks.push(`--${key} ${o[key]}`)
    }
    chunks.push(`-p "${req.prompt}"`)

    if (req.full) {
      await this.exec(`./main ${chunks.join(" ")}`, this.llamaPath, cb)
    } else {
      const startpattern = /.*sampling parameters:.*/g
      const endpattern = /.*mem per token.*/g
      let started = false
      let ended = false
      let writeEnd = !req.skip_end
      await this.exec(`./main ${chunks.join(" ")}`, this.llamaPath, (msg) => {
        if (endpattern.test(msg)) ended = true
        if (started && !ended) {
          cb(msg)
        } else if (ended && writeEnd) {
          cb('\n\n<end>')
          writeEnd = false
        }
        if (startpattern.test(msg)) started = true
      })
    }
  }
  connect(req, cb) {
    const socket = io(req.url)
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
      console.log(`exec: ${cmd} in ${config.cwd}`)
      const ptyProcess = pty.spawn(shell, [], config)
      ptyProcess.onData((data) => {
        if (cb) {
          cb(data)
        } else {
          process.stdout.write(data);
        }
      });
      ptyProcess.onExit((res) => {
        if (res.exitCode === 0) {
          // successful
          resolve(true)
        } else {
          // something went wrong
          resolve(false)
        }
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
      const outputFile1 = `${this.modelsPath}/${model}/ggml-model-f16.bin${suffix}`
      const outputFile2 = `${this.modelsPath}/${model}/ggml-model-q4_0.bin${suffix}`
      if (fs.existsSync(path.resolve(this.llamaPath, outputFile1)) && fs.existsSync(path.resolve(this.llamaPath, outputFile2))) {
        console.log(`Skip quantization, files already exists: ${outputFile1} and ${outputFile2}}`)
        continue
      }
      await this.exec(`./quantize ${outputFile1} ${outputFile2} 2`, this.llamaPath)
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
