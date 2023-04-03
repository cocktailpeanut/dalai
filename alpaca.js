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
      const outputFile = path.resolve(this.home, 'models', model, 'ggml-model-q4_0.bin')
      if (fs.existsSync(outputFile)) {
        console.log(`Skip conversion, file already exists: ${outputFile}`)
      } else {
        const dir = path.resolve(this.home, "models", model)
        console.log("dir", dir)
        await fs.promises.mkdir(dir, { recursive: true }).catch((e) => {
          console.log("mkdir", e)
        })
        console.log("downloading torrent")
        let url
        switch (model) {
          case "7B":
            //await this.root.torrent.add('magnet:?xt=urn:btih:5aaceaec63b03e51a98f04fd5c42320b2a033010&dn=ggml-alpaca-7b-q4.bin&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce', dir)
            //console.log("renaming")
            //await fs.promises.rename(
            //  path.resolve(dir, "ggml-alpaca-7b-q4.bin"),
            //  path.resolve(dir, "ggml-model-q4_0.bin")
            //)
            url = "https://huggingface.co/Pi3141/alpaca-7B-ggml/resolve/main/ggml-model-q4_0.bin"
            await this.root.down(url, path.resolve(dir, "ggml-model-q4_0.bin"))
            break;
          
          case "13B":
            /*
            await this.root.torrent.add('magnet:?xt=urn:btih:053b3d54d2e77ff020ebddf51dad681f2a651071&dn=ggml-alpaca-13b-q4.bin&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.com%3A2810%2Fannounce', dir)
            console.log("renaming")
            await fs.promises.rename(
              path.resolve(dir, "ggml-alpaca-13b-q4.bin"),
              path.resolve(dir, "ggml-model-q4_0.bin")
            )
            */
            url = "https://huggingface.co/Pi3141/alpaca-13B-ggml/resolve/main/ggml-model-q4_1.bin"
            await this.root.down(url, path.resolve(dir, "ggml-model-q4_0.bin"))
            break;

          case "30B":
            url = "https://huggingface.co/Pi3141/alpaca-30B-ggml/resolve/main/ggml-model-q4_0.bin"
            await this.root.down(url, path.resolve(dir, "ggml-model-q4_0.bin"))
            break;
          
          default:
            console.log("Select either model 7B, 13B, or 30B")
            break;
        }
      }
    }
  }

}
module.exports = Alpaca
