const path = require('path');
const term = require( 'terminal-kit' ).terminal;
const git = require('isomorphic-git');
const Downloader = require("nodejs-file-downloader");
const http = require('isomorphic-git/http/node');
const os = require('os');
const fs = require("fs");
const platform = os.platform()
class Alpaca {
  constructor(root) {
    this.root = root
    this.home = path.resolve(this.root.home, "alpaca")
    this.url = "https://github.com/cocktailpeanut/alpaca.cpp.git"
  }
  async make() {
    let success
    if (platform === "win32") {
      // CMake on Windows
      const venv_path = path.join(this.root.home, "venv")
      const cmake_path = path.join(venv_path, "Scripts", "cmake")
      await this.root.exec("mkdir build", this.home)      
      await this.root.exec(`Remove-Item -path ${path.resolve(this.home, "build", "CMakeCache.txt")}`, this.home)
      //await this.root.exec(`${cmake_path} chat`, this.home)
      await this.root.exec(`${cmake_path} ..`, path.resolve(this.home, "build"))
      await this.root.exec(`${cmake_path} --build . --config Release`, path.resolve(this.home, "build"))
    } else {
      // Make on linux + mac
      success = await this.root.exec(`make`, this.home)
      if (!success) {
        throw new Error("running 'make' failed")
        return
      }
    }
  }
  async get (...models) {
    for(let model of models) {
      const venv_path = path.join(this.root.home, "venv")
      const python_path = platform == "win32" ? path.join(venv_path, "Scripts", "python.exe") : path.join(venv_path, 'bin', 'python')
      /**************************************************************************************************************
      *
      * 5. Download models + convert + quantize
      *
      **************************************************************************************************************/
      const outputFile = path.resolve(this.home, 'models', model, 'ggml-model-q4_0.bin')
      if (fs.existsSync(outputFile)) {
        console.log(`Skip conversion, file already exists: ${outputFile}`)
      } else {
        const task = `downloading ${outputFile}`
        const downloader = new Downloader({
          url: "https://gateway.estuary.tech/gw/ipfs/QmQ1bf2BTnYxq73MFJWu1B7bQ2UD6qG7D7YDCxhTndVkPC",
          //url: "https://ipfs.io/ipfs/QmQ1bf2BTnYxq73MFJWu1B7bQ2UD6qG7D7YDCxhTndVkPC",
          //url: `https://cloudflare-ipfs.com/ipfs/QmQ1bf2BTnYxq73MFJWu1B7bQ2UD6qG7D7YDCxhTndVkPC`,
          fileName: 'ggml-model-q4_0.bin',
          directory: path.resolve(this.home, "models", model),
          maxAttempts: 3, //Default is 1.
          onError: function (error) {
            //You can also hook into each failed attempt.
            console.log("Error from attempt ", error);
          },
          onProgress: (percentage, chunk, remainingSize) => {
            this.root.progress(task, percentage)
          },
        });
        try {
          await this.root.startProgress(task)
          await downloader.download();
        } catch (error) {
          console.log(error);
        }
        this.root.progressBar.update(1);
        term("\n")
      }
    }
  }

}
module.exports = Alpaca
