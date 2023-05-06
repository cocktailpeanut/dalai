const os = require('os');
const pty = require('node-pty');
//const pty = require('@cdktf/node-pty-prebuilt-multiarch');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const Http = require("http")
const path = require('path');
const fs = require("fs");
const tar = require('tar');
const { createServer } = require("http");
const { Server } = require("socket.io");
const { io } = require("socket.io-client");
const term = require( 'terminal-kit' ).terminal;
const Downloader = require("nodejs-file-downloader");
const semver = require('semver');
//const _7z = require('7zip-min');
const axios = require('axios')
const platform = os.platform()
const shell = platform === 'win32' ? 'powershell.exe' : 'bash';
const L = require("./llama")
const A = require("./alpaca")
const TorrentDownloader = require("./torrent")
const exists = s => new Promise(r=>fs.access(s, fs.constants.F_OK, e => r(!e)))
const escapeNewLine = (platform, arg) => platform === 'win32' ? arg.replaceAll(/\n/g, "\\n").replaceAll(/\r/g, "\\r") : arg
const escapeDoubleQuotes = (platform, arg) => platform === 'win32' ? arg.replaceAll(/"/g, '`"') : arg.replaceAll(/"/g, '\\"')
const stripAnsi = (str) => {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|');

  const regex = new RegExp(pattern, 'g')
  return str.replace(regex, '');
}
const winEscape = (str) => {
  return str
  .replaceAll(/\\n/g, "\n")
  .replaceAll(/\\r/g, "\r")
  .replaceAll(/\\t/g, "\t")
  .replaceAll(/\\b/g, "\b")
  .replaceAll(/\\f/g, "\f")
  .replaceAll(/\\/g, "")
}

class Dalai {
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
    this.home = home ? path.resolve(home) : path.resolve(os.homedir(), "dalai")
    try {
      console.log("mkdir", this.home)
      fs.mkdirSync(this.home, { recursive: true })
    } catch (e) {
      console.log("E", e)
    }
    this.torrent = new TorrentDownloader()
    this.config = {
      name: 'xterm-color',
      cols: 1000,
      rows: 30,
    }
    this.cores = {
      llama: new L(this),
      alpaca: new A(this),
    }
  }
  htmlencode (str) {
    let encodedStr = '';
    for (let i = 0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      if (charCode < 128) {
        // ASCII characters
        switch (str[i]) {
          case '<': encodedStr += '&lt;'; break;
          case '>': encodedStr += '&gt;'; break;
          case '&': encodedStr += '&amp;'; break;
          case '"': encodedStr += '&quot;'; break;
          case '\'': encodedStr += '&#39;'; break;
          case '\n': encodedStr += '<br>'; break;
          case '\r': break; // ignore
          case '\t': encodedStr += '&nbsp;&nbsp;&nbsp;&nbsp;'; break;
          case '\b': encodedStr += '&nbsp;'; break;
          case '\f': encodedStr += '&nbsp;'; break;
          default: encodedStr += String.fromCharCode(charCode); break;
        }
      } else {
        // Non-ASCII characters
        encodedStr += "&#" + charCode + ";";
      }
    }
    return encodedStr;
  }
  down(url, dest, headers) {
    return new Promise((resolve, reject) => {
      const task = path.basename(dest)
      this.startProgress(task)
      axios({
        url,
        method: 'GET',
        responseType: 'stream',
        maxContentLength: Infinity,
        headers,
        onDownloadProgress: progressEvent => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          this.progress(task, progress)
        }

      }).then(response => {
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        writer.on('finish', () => {
          this.progressBar.update(1);
          term("\n")
          resolve()
        });
      }).catch(error => {
        reject(error)
      });
    })
  }
  async python () {
    // install self-contained python => only for windows for now
    // 1. download
    // 2. unzip

    const filename = "cpython-3.10.9+20230116-x86_64-pc-windows-msvc-shared-install_only.tar.gz"
    const task = "downloading self contained python"
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
//  async mingw() {
//    const mingw = "https://github.com/niXman/mingw-builds-binaries/releases/download/12.2.0-rt_v10-rev2/x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"
//    const downloader = new Downloader({
//      url: mingw,
//      directory: this.home,
//      onProgress: (percentage, chunk, remainingSize) => {
//        this.progress("download mingw", percentage)
//      },
//    });
//    try {
//      await this.startProgress("download mingw")
//      await downloader.download();
//    } catch (error) {
//      console.log(error);
//    }
//    this.progressBar.update(1);
//    await new Promise((resolve, reject) => {
//      _7z.unpack(path.resolve(this.home, "x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"), this.home, (err) => {
//        if (err) { 
//          reject(err)
//        } else {
//          resolve()
//        }
//      })
//    })
//    console.log("cleaning up temp files")
//    await fs.promises.rm(path.resolve(this.home, "x86_64-12.2.0-release-win32-seh-msvcrt-rt_v10-rev2.7z"))
//  }
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

    if (req.prompt && req.prompt.startsWith("/")) {
      try {
        const mod = require(`./cmds/${req.prompt.slice(1)}`)
        if (mod) {
          mod(this)
          return
        }
      } catch (e) {
        console.log("require log", e)
      }
    }

    if (!req.prompt) {
      return
    }

    let [Core, Model] = req.models[0].split(".")
    Model = Model.toUpperCase()

    console.log( { Core, Model } )

    let o = {
      seed: req.seed || -1,
      threads: req.threads || 8,
      n_predict: req.n_predict || 128,
      model: `models/${Model || "7B"}/ggml-model-q4_0.bin`,
    }

    let e = await exists(path.resolve(this.home, Core, "models", Model))
    if (!e) {
      cb(`File does not exist: ${Model}. Try "dalai ${Core} get ${Model}" first.`)
      return
    }

    if (req.top_k) o.top_k = req.top_k
    if (req.top_p) o.top_p = req.top_p
    if (req.temp) o.temp = req.temp
    if (req.batch_size) o.batch_size = req.batch_size
    if (req.repeat_last_n) o.repeat_last_n = req.repeat_last_n
    if (req.repeat_penalty) o.repeat_penalty = req.repeat_penalty
    if (typeof req.interactive !== "undefined") o.interactive = req.interactive

    let chunks = []
    for(let key in o) {
      chunks.push(`--${key} ${escapeDoubleQuotes(platform, o[key].toString())}`)
    }
    const escaped = escapeNewLine(platform, req.prompt)
    const prompt = `"${escapeDoubleQuotes(platform, escaped)}"`

    chunks.push(`-p ${prompt}`)

    const main_bin_path = platform === "win32" ? path.resolve(this.home, Core, "build", "Release", "main") : path.resolve(this.home, Core, "main")
    this.sessionBuffer = "";
    this.bufferStarted = false;
    if (req.full) {
      await this.exec(`${main_bin_path} ${chunks.join(" ")}`, this.cores[Core].home, cb)
    } else {
      const startpattern = /.*sampling parameters:.*/g
      const endpattern = /.*mem per token.*/g
      let started = req.debug
      let ended = false
      let writeEnd = !req.skip_end
      await this.exec(`${main_bin_path} ${chunks.join(" ")}`, this.cores[Core].home, (proc, msg) => {
        if (endpattern.test(msg)) ended = true
        if (started && !ended) {
          this.buffer(req, msg, cb)
        } else if (ended && writeEnd) {
          cb('\n\n<end>')
          writeEnd = false
        }
        if (startpattern.test(msg)) started = true
      })
    }
  }
  buffer(req, msg, cb) {
    if (!this.queue) this.queue = []
    if (platform === "win32") {
      for(let i=0;i<msg.length; i++) {
        if (msg[i] === "\\") {
          this.queueActive = true
          // start pushing to buffer
          this.queue.push(msg[i]);
        } else {
          // otherwise flush
          this.queue.push(msg[i])
          let queueContent = this.queue.join("")
          
          if (!this.bufferStarted && ["\n", "\b", "\f", "\r", "\t"].includes(queueContent)) {
            // if the buffer hasn't started and incoming tokens are whitespaces, ignore
          } else {
            if (req.html) {
              cb(this.htmlencode(winEscape(queueContent)))
            } else {
              cb(winEscape(queueContent))
            }
            this.bufferStarted = true
          }
          this.queue = []
          this.queueActive = false
        }
      }
    } else {
      if (req.html) {
        cb(this.htmlencode(msg))
      } else {
        cb(msg)
      } 
    }
  }
  async uninstall(core, ...models) {
    if (models.length > 0) {
      // delete the model folder
      const modelsPath = path.resolve(this.home, core, "models")
      for(let model of models) {
        const modelPath = path.resolve(modelsPath, model)
        console.log("rm", modelPath)
        await fs.promises.rm(modelPath, { recursive: true, force: true }).catch((e) => {
          console.log("rm", modelPath, e)
        })
      }
    }
  }
  async install(core, ...models) {

    let engine = this.cores[core]

    const venv_path = path.join(this.home, "venv")
    let ve = await exists(venv_path)
    if (!ve) {
      await this.setup()
    }

    // temporary

    let models_path = path.resolve(engine.home, "models")
    let temp_path = path.resolve(this.home, "tmp")
    let temp_models_path = path.resolve(temp_path, "models")
    await fs.promises.mkdir(temp_path, { recursive: true }).catch((e) => { console.log("1", e) })
    // 1. move the models folder to ../tmp
    await fs.promises.rename(models_path, temp_models_path).catch((e) => { console.log("2", e) })
    // 2. wipe out the folder
    await fs.promises.rm(engine.home, { recursive: true }).catch((e) => { console.log("3", e) })
    // 3. install engine
    await this.add(core)
    // 4. move back the files inside /tmp
    await fs.promises.rename(temp_models_path, models_path).catch((e) => { console.log("4", e) })

    // next add the models
    let res = await this.cores[core].add(...models)
    return res
  }
  async installed() {
    // get cores
    const modelNames = []
    for(let core of ["alpaca", "llama"]) {
      const modelsPath = path.resolve(this.home, core, "models")
      console.log("modelsPath", modelsPath)
      let modelFolders = []
      try {
        modelFolders = (await fs.promises.readdir(modelsPath, { withFileTypes: true }))
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
      } catch (e) {
      }

      console.log({ modelFolders })
      for(let modelFolder of modelFolders) {
        let e = await exists(path.resolve(modelsPath, modelFolder, 'ggml-model-q4_0.bin'))
        if (e) {
          modelNames.push(`${core}.${modelFolder}`)
          console.log("exists", modelFolder)
        }
      }
    }
    return modelNames
  }
  async add (core) {
    /**************************************************************************************************************
    *
    * 2. Download Core
    *
    **************************************************************************************************************/
    let engine = this.cores[core]
    let e = await exists(path.resolve(engine.home));
    console.log("mkdir", path.resolve(engine.home))
    await fs.promises.mkdir(path.resolve(engine.home), { recursive: true }).catch((e) => {
      console.log("ERROR" ,e)
    })

    try {
      console.log("try fetching", engine.home, engine.url)
      await git.pull({ fs, http, dir: engine.home, url: engine.url })
    } catch (e) {
      console.log("[E] Pull", e)
      try {
        console.log("try cloning", engine.home, engine.url)
        await git.clone({ fs, http, dir: engine.home, url: engine.url })
      } catch (e2) {
        console.log("[E] Clone", e2)
      }
    }
    console.log("next", core, engine.make);
    /**************************************************************************************************************
    *
    * 4. Compile & Build
    *   - make: linux + mac
    *   - cmake: windows
    *
    **************************************************************************************************************/
    await engine.make()
  }
  async setup() {

    let success;

    /**************************************************************************************************************
    *
    * 1. Validate
    *
    **************************************************************************************************************/
    // Check if current version is greater than or equal to 18
    const node_version = process.version;
    if (!semver.gte(node_version, '18.0.0')) {
      throw new Error("outdated Node version, please install Node 18 or newer")
    }

    /**************************************************************************************************************
    *
    * 3. Download Global Dependencies
    *   - Python (windows only)
    *   - build-essential (linux only)
    *   - virtualenv
    *   - torch, numpy, etc.
    *
    **************************************************************************************************************/

    // 3.1. Python: Windows doesn't ship with python, so install a dedicated self-contained python
    if (platform === "win32") {
      await this.python() 
    }
    const root_python_paths = (platform === "win32" ? ["python3", "python", path.resolve(this.home, "python", "python.exe")] : ["python3", "python"])
    const root_pip_paths = (platform === "win32" ? ["pip3", "pip", path.resolve(this.home, "python", "python -m pip")] : ["pip3", "pip"])

    // 3.2. Build tools
    if (platform === "linux") {
      // ubuntu debian
      success = await this.exec("apt-get install build-essential python3-venv -y")
      if (!success) {
        // fefdora
        success = await this.exec("dnf install make automake gcc gcc-c++ kernel-devel python3-virtualenv -y")
      }
    } else {
      // for win32 / darwin
      for(let root_pip_path of root_pip_paths) {
        success = await this.exec(`${root_pip_path} install --user virtualenv`)
        if (success) {
          break;
        }
        success = await this.exec(`${root_pip_path} install virtualenv`)
        if (success) {
          break;
        }
      }
      if (!success) {
        throw new Error("cannot install virtualenv")
      }

    }

    // 3.3. virtualenv
    const venv_path = path.join(this.home, "venv")
    for(let root_python_path of root_python_paths) {
      console.log("trying with", root_python_path)
      let code = await this.exec(`${root_python_path} -m venv ${venv_path}`)
      console.log({ code })
    }
    /*
    if (!success) {
      throw new Error("cannot execute python3 or python")
      return
    }
    */

    // 3.4. Python libraries
    const pip_path = platform === "win32" ? path.join(venv_path, "Scripts", "pip.exe") : path.join(venv_path, "bin", "pip")
    const python_path = platform == "win32" ? path.join(venv_path, "Scripts", "python.exe") : path.join(venv_path, 'bin', 'python')
    // cmake (only on windows. the rest platforms use make)
    if (platform === "win32") {
      success = await this.exec(`${pip_path} install cmake`)
      if (!success) {
        throw new Error("cmake installation failed")
        return
      }
    }
    success = await this.exec(`${pip_path} install --upgrade pip setuptools wheel`)
    if (!success) {
      success = await this.exec(`${pip_path} install --user --upgrade pip setuptools wheel`)
      if (!success) {
        throw new Error("pip setuptools wheel upgrade failed")
        return  
      }
    }
    success = await this.exec(`${pip_path} install torch torchvision torchaudio sentencepiece numpy`)
    //success = await this.exec(`${pip_path} install torch torchvision torchaudio sentencepiece numpy wget`)
    if (!success) {
      success = await this.exec(`${pip_path} install --user torch torchvision torchaudio sentencepiece numpy`)
      if (!success) {
        throw new Error("dependency installation failed")
        return  
      }
    }


  }
  serve(port, options) {
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
        req.models = Array.from(new Set(req.models))
        await this.query(req, (str) => {
          io.emit("result", { response: str, request: req })
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
      try {
        const config = Object.assign({}, this.config)
        if (cwd) {
          config.cwd = path.resolve(cwd)
        }
        console.log(`exec: ${cmd} in ${config.cwd}`)
        this.ptyProcess = pty.spawn(shell, [], config)
        this.ptyProcess.onData((data) => {
          if (cb) {
            cb(this.ptyProcess, stripAnsi(data))
          } else {
            process.stdout.write(data);
          }
        });
        this.ptyProcess.onExit((res) => {
          if (res.exitCode === 0) {
            // successful
            resolve(true)
          } else {
            // something went wrong
            resolve(false)
          }
        });

        if (platform === "win32") {
          this.ptyProcess.write(`[System.Console]::OutputEncoding=[System.Console]::InputEncoding=[System.Text.Encoding]::UTF8; ${cmd}\r`)
        } else {
          this.ptyProcess.write(`${cmd}\r`)
        }
        this.ptyProcess.write("exit\r")
      } catch (e) {
        console.log("caught error", e)
        this.ptyProcess.kill()
        // ptyProcess.write("exit\r")
      }
    })
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
