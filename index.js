const os = require('os');
const pty = require('node-pty');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const path = require('path');
const fs = require("fs");
const tar = require('tar');
const { createServer } = require("http");
const { Server } = require("socket.io");
const { io } = require("socket.io-client");
const term = require( 'terminal-kit' ).terminal;
const Downloader = require("nodejs-file-downloader");
const semver = require('semver');
const _7z = require('7zip-min');
const platform = os.platform()
const shell = platform === 'win32' ? 'powershell.exe' : 'bash';
class Dalai {
  _runningShell = undefined;
  constructor(home) {
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
    this.home = home ? path.resolve(home) : path.resolve(os.homedir(), "llama.cpp")
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
  async installed() {
    const modelsPath = path.resolve(this.home, "models")
    console.log("modelsPath", modelsPath)
    const modelFolders = (await fs.promises.readdir(modelsPath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    console.log({ modelFolders })
    const modelNames = []
    for(let modelFolder of modelFolders) {
      if (fs.existsSync(path.resolve(modelsPath, modelFolder, 'ggml-model-q4_0.bin'))) {
        modelNames.push(modelFolder)
        console.log("exists", modelFolder)
      }
    }
    return modelNames
  }
  async python () {
    // install self-contained python => only for windows for now
    // 1. download
    // 2. unzip

    const filename = "cpython-3.10.9+20230116-x86_64-pc-windows-msvc-shared-install_only.tar.gz"
    const task = "ddownloading self contained python"
    const downloader = new Downloader({
      url: `https://github.com/indygreg/python-build-standalone/releases/download/20230116/${filename}`,
      directory: this.home,
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
    console.log("extracting python")
    await tar.x({
      file: path.resolve(this.home, filename),
      C: this.home,
      strict: true
    })
    console.log("cleaning up temp files")
    await fs.promises.rm(path.resolve(this.home, filename))
  }
  async mingw() {
    const mingw = "https://github.com/niXman/mingw-builds-binaries/releases/download/12.2.0-rt_v10-rev2/x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"
    const downloader = new Downloader({
      url: mingw,
      directory: this.home,
      onProgress: (percentage, chunk, remainingSize) => {
        this.progress("download mingw", percentage)
      },
    });
    try {
      await this.startProgress("download mingw")
      await downloader.download();
    } catch (error) {
      console.log(error);
    }
    this.progressBar.update(1);
    await new Promise((resolve, reject) => {
      _7z.unpack(path.resolve(this.home, "x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"), this.home, (err) => {
        if (err) { 
          reject(err)
        } else {
          resolve()
        }
      })
    })
    console.log("cleaning up temp files")
    await fs.promises.rm(path.resolve(this.home, "x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"))
  }
  async install(...models) {
    // Check if current version is greater than or equal to 18
    const node_version = process.version;
    if (!semver.gte(node_version, '18.0.0')) {
      throw new Error("outdated Node version, please install Node 18 or newer")
    }
    let success;
    try {
      console.log("try cloning")
      await git.clone({ fs, http, dir: this.home, url: "https://github.com/ggerganov/llama.cpp.git" })
    } catch (e) {
      console.log("try pulling")
      await git.pull({ fs, http, dir: this.home, url: "https://github.com/ggerganov/llama.cpp.git" })
    }

    // windows don't ship with python, so install a dedicated self-contained python
    if (platform === "win32") {
      await this.python() 
    }
    const root_python_paths = (platform === "win32" ? [path.resolve(this.home, "python", "python.exe")] : ["python3", "python"])
    const root_pip_paths = (platform === "win32" ? [path.resolve(this.home, "python", "python -m pip")] : ["pip3", "pip"])

    // prerequisites
    if (platform === "linux") {
      // ubuntu debian
      success = await this.exec("apt-get install build-essential python3-venv -y")
      if (!success) {
        // fefdora
        await this.exec("dnf install make automake gcc gcc-c++ kernel-devel python3-virtualenv -y")
      }
    } else {
      // for win32 / darwin
      for(let root_pip_path of root_pip_paths) {
        success = await this.exec(`${root_pip_path} install --user virtualenv`)
        if (success) break;
      }
      if (!success) {
        throw new Error("cannot install virtualenv")
      }
    }
    // create venv
    const venv_path = path.join(this.home, "venv")

    for(let root_python_path of root_python_paths) {
      success = await this.exec(`${root_python_path} -m venv ${venv_path}`)
      if (success) break;
    }
    if (!success) {
      throw new Error("cannot execute python3 or python")
      return
    }

    // different venv paths for Windows
    const pip_path = platform === "win32" ? path.join(venv_path, "Scripts", "pip.exe") : path.join(venv_path, "bin", "pip")
    const python_path = platform == "win32" ? path.join(venv_path, "Script", "python.exe") : path.join(venv_path, 'bin', 'python')

    // upgrade setuptools
    success = await this.exec(`${pip_path} install --upgrade pip setuptools wheel`)
    if (!success) {
      throw new Error("pip setuptools wheel upgrade failed")
      return
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
        return
      }
      await this.exec("mkdir build", this.home)      
      await this.exec(`Remove-Item -path ${path.resolve(this.home, "build", "CMakeCache.txt")}`, this.home)
      
      const cmake_path = path.join(venv_path, "Scripts", "cmake")
      const ninja_path = path.join(venv_path, "Scripts", "ninja").replaceAll("\\", "/")
      const gcc_path = path.join(this.home, "mingw64", "bin", 'gcc.exe').replaceAll("\\", "/")
      const gxx_path = path.join(this.home, "mingw64", "bin", 'g++.exe').replaceAll("\\", "/")

      // Install compiler (mingw gcc/g++)
      await this.mingw()
      // Install generator (ninja)
      await this.exec(`${pip_path} install ninja`);
      // CMake with the compiler and the generator
      await this.exec(`${cmake_path} -S .. -G Ninja -DCMAKE_MAKE_PROGRAM=${ninja_path} -DCMAKE_C_COMPILER=${gcc_path} -DCMAKE_CXX_COMPILER=${gxx_path}`, path.resolve(this.home, "build"))
      await this.exec(`${cmake_path} --build . --config Release`, path.resolve(this.home, "build"))

    } else {
      success = await this.exec("make", this.home)
      if (!success) {
        throw new Error("running 'make' failed")
        return
      }
    }
    for(let model of models) {
      await this.download(model)
      const outputFile = path.resolve(this.home, 'models', model, 'ggml-model-f16.bin')
      if (fs.existsSync(outputFile)) {
        console.log(`Skip conversion, file already exists: ${outputFile}`)
      } else {
        await this.exec(`${python_path} convert-pth-to-ggml.py models/${model}/ 1`, this.home)
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
          io.emit("result", { response: str, request: req, isRunning: this._runningShell != null })
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
          io.emit("result", { response: str, request: req, isRunning: this._runningShell != null })
        })
      });
    });
  }
  async request(req, cb) {
    if (req.url) {
      await this.connect(req, cb)
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
    if (req.method === "stop") {
      if (this._runningShell) {
        this._runningShell.kill()
        this._runningShell = undefined
      }
      cb('\n\n<end>')
      return
    }

    let o = {
      seed: req.seed || -1,
      threads: req.threads || 8,
      n_predict: req.n_predict || 128,
      model: `models/${req.model || "7B"}/ggml-model-q4_0.bin`
    }

    if (!fs.existsSync(path.resolve(this.home, o.model))) {
      cb(`File does not exist: ${o.model}. Try "dalai llama ${req.model}" first.`)
      return
    }

    if (req.top_k) o.top_k = req.top_k
    if (req.top_p) o.top_p = req.top_p
    if (req.temp) o.temp = req.temp
    if (req.batch_size) o.batch_size = req.batch_size
    if (req.repeat_last_n) o.repeat_last_n = req.repeat_last_n
    if (req.repeat_penalty) o.repeat_penalty = req.repeat_penalty

    let namedArgs = {};
    for(let key in o) {
      namedArgs[`--${key}`] = o[key];
    }
    namedArgs["-p"] = req.prompt;

    if (req.full) {
      await this.exec("./main", namedArgs, this.home, cb);
    } else {
      const startpattern = /.*repeat_penalty = .*/g
      const endpattern = /.*mem per token.*/g
      let started = false
      let starting = true
      let ended = false
      let writeEnd = !req.skip_end
      await this.exec("./main", namedArgs, this.home, (msg) => {
        if (endpattern.test(msg)) ended = true
        if (started && !ended) {
          if (starting) {
            const trimmed = msg.replace(/^\s+/, "");
            if (trimmed.length > 0) {
              starting = false;
              cb(trimmed)
            }
          } else {
            cb(msg)
          }
        } else if (ended && writeEnd) {
          this._runningShell = undefined
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
  exec(cmd, namedArgs, cwd, cb) {
    const escapeShellArg = (arg) => {
      if (typeof arg != "string") {
        return arg;
      }
      if (platform == "win32") {
        return `"${arg.replaceAll("\"", "`\"`\"").replaceAll("\n", "`n")}"`;
      } else {
        return `'${arg.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n")}'`;
      }
    }
    const processData = (data) => {
      // Clean up e.g. escape sequences
      return data.replaceAll(/\r?\n\u001b\[\d+;\d+H./g, "");
    }

    return new Promise((resolve, reject) => {
      if(this._runningShell != null) {
        resolve(false);
        return;
      }

      const config = Object.assign({}, this.config)
      if (cwd) {
        config.cwd = path.resolve(cwd)
      }
      // Escape the named args
      let args = [];
      Object.keys(namedArgs).forEach(key => {
        args.push(key);
        args.push(escapeShellArg(namedArgs[key]));
      });
      const fullCmd = `${cmd} ${args.join(" ")}`;
      console.log(`exec: ${fullCmd} in ${config.cwd}`)
      const ptyProcess = pty.spawn(shell, [], config)
      this._runningShell = ptyProcess;
      ptyProcess.onData((data) => {
        if (cb) {
          cb(processData(data))
        } else {
          process.stdout.write(data);
        }
      });
      ptyProcess.onExit((res) => {
        this._runningShell = undefined;
        cb("");
        if (res.exitCode === 0) {
          // successful
          resolve(true)
        } else {
          // something went wrong
          console.error("Failed during execution", res.exitCode);
          resolve(false)
        }
      });
      if (platform == "win32") {
        ptyProcess.write("[System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8\r")
      }
      ptyProcess.write(`${fullCmd}\r`)

      if (platform == "win32") {
        ptyProcess.write("exit $LASTEXITCODE\r")
      } else {
        ptyProcess.write("exit $?\r")
      }
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
      const bin_path = platform === "win32" ? path.resolve(this.home, "build") : this.home
      await this.exec(`./quantize ${outputFile1} ${outputFile2} 2`, bin_path)
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
