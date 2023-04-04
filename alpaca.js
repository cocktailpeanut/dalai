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
    //this.url = "https://github.com/candywrap/alpaca.cpp.git"
    this.url = "https://github.com/ItsPi3141/alpaca.cpp"
  }
  async make() {
    let success
    if (platform === "win32") {
      // CMake on Windows
      const venv_path = path.join(this.root.home, "venv")
      const cmake_path = path.join(venv_path, "Scripts", "cmake")
      await this.root.exec("mkdir build", this.home)      
      await this.root.exec(`Remove-Item -path ${path.resolve(this.home, "build", "CMakeCache.txt")}`, this.home)

      let PS_COUNTER = 0
      await this.root.exec(`${cmake_path} ..`, path.resolve(this.home, "build"), (proc, data) => {
        console.log("#", data);
        if (/^PS .*/.test(data)) {
          PS_COUNTER++;
          if (PS_COUNTER >= 2) {
            console.log("KILL")
            proc.kill()
          }
        }
      })
      PS_COUNTER = 0;
      await this.root.exec(`${cmake_path} --build . --config Release`, path.resolve(this.home, "build"), (proc, data) => {
        console.log("#", data);
        if (/^PS .*/.test(data)) {
          PS_COUNTER++;
          if (PS_COUNTER >= 2) {
            console.log("KILL2")
            proc.kill()
          }
        }
      })
    } else {
      // Make on linux + mac
      success = await this.root.exec(`make`, this.home)
      if (!success) {
        throw new Error("running 'make' failed")
      }
    }
  }
  async add (...models) {
    models = models.map((m) => {
      return m.toUpperCase()
    })
    console.log("alpaca.add", models)
    for(let model of models) {
      const venv_path = path.join(this.root.home, "venv")
      const python_path = platform == "win32" ? path.join(venv_path, "Scripts", "python.exe") : path.join(venv_path, 'bin', 'python')
      /**************************************************************************************************************
      *
      * 5. Download models + convert + quantize
      *
      **************************************************************************************************************/
      
      const currentVersions = {
        "7B": 'ggml-model-q4_0.bin',
        "13B": 'ggml-model-q4_1.bin',
        "30B": 'ggml-model-q4_0.bin',
      }

      const outputFile = path.resolve(this.home, 'models', model, currentVersions[model])

      const modelExists = (f) => {
        if (fs.existsSync(f)) {
          console.log(`Skip conversion, file already exists: ${f}`)
          return true
        }
        // delete other model files in folder in case of an upgrade

        const dir = path.dirname(f);
        const files = fs.readdirSync(dir);
        if (files.length !== 0) console.log("Upgrading model, removing old files...")

        for (const file of files) {
          fs.unlinkSync(path.join(dir, file));
          console.log(`Removed old model file: ${file} in ${dir}`)
        }
        return false
      }
      
      if (!modelExists(outputFile)) {
        const dir = path.resolve(this.home, "models", model)
        console.log("dir", dir)
        await fs.promises.mkdir(dir, { recursive: true }).catch((e) => {
          console.log("mkdir", e)
        })
        console.log("downloading torrent")
        let url

        if (Object.keys(currentVersions).includes(model)) {
          url = `https://huggingface.co/Pi3141/alpaca-${model}-ggml/resolve/main/${currentVersions[model]}`
            await this.root.down(url, path.resolve(dir, currentVersions[model]))
        } else {
          console.log("Select either model 7B, 13B, or 30B")
        }
      }
    }
  }

}
module.exports = Alpaca
