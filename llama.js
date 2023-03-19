const path = require('path');
const term = require( 'terminal-kit' ).terminal;
const git = require('isomorphic-git');
const Downloader = require("nodejs-file-downloader");
const http = require('isomorphic-git/http/node');
const os = require('os');
const fs = require("fs");
const platform = os.platform()
class LLaMA {
  constructor(root) {
    this.root = root
    this.home = path.resolve(this.root.home, "llama")
    this.url = "https://github.com/candywrap/llama.cpp.git"
  }
  async make() {
    console.log("make")
    let success
    if (platform === "win32") {
      // CMake on Windows
      const venv_path = path.join(this.root.home, "venv")
      const cmake_path = path.join(venv_path, "Scripts", "cmake")
      await this.root.exec("mkdir build", this.home)      
      await this.root.exec(`Remove-Item -path ${path.resolve(this.home, "build", "CMakeCache.txt")}`, this.home)
      let PS_COUNTER = 0
      await this.root.exec(`${cmake_path} ..`, path.resolve(this.home, "build"), (proc, data) => {
        console.log("# data", data);
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
        console.log("# data", data);
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
        return
      }
    }
  }
  async add (...models) {
    if (models.length === 0) models = ["7B"]
    models = models.map((m) => {
      return m.toUpperCase()
    })
    for(let model of models) {
      if (!["7B", "13B",  "30B", "65B"].includes(model)) {
        console.log(`##########################################################
#
#   ERROR
#   The arguments must be one or more of the following:
# 
#   7B, 13B, 30B, 65B
#
##########################################################

[Example]

# install just 7B (default)
npx dalai install   

# install 7B manually
npx dalai install 7B

# install 7B and 13B
npx dalai install 7B 13B
`)
        throw new Error("The model name must be one of: 7B, 13B, 30B, and 65B")
        return
      }
    }

    const venv_path = path.join(this.root.home, "venv")
    const python_path = platform == "win32" ? path.join(venv_path, "Scripts", "python.exe") : path.join(venv_path, 'bin', 'python')
    /**************************************************************************************************************
    *
    * 5. Download models + convert + quantize
    *
    **************************************************************************************************************/
    for(let model of models) {
      await this.download(model)
      const outputFile = path.resolve(this.home, 'models', model, 'ggml-model-f16.bin')
      // if (fs.existsSync(outputFile)) {
      //   console.log(`Skip conversion, file already exists: ${outputFile}`)
      // } else {
        await this.root.exec(`${python_path} convert-pth-to-ggml.py models/${model}/ 1`, this.home)
      // }
      await this.quantize(model)
    }
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
      const outputFile1 = path.resolve(this.home, `./models/${model}/ggml-model-f16.bin${suffix}`)
      const outputFile2 = path.resolve(this.home, `./models/${model}/ggml-model-q4_0.bin${suffix}`)
      if (fs.existsSync(outputFile1) && fs.existsSync(outputFile2)) {
        console.log(`Skip quantization, files already exists: ${outputFile1} and ${outputFile2}}`)
        continue
      }
      const bin_path = platform === "win32" ? path.resolve(this.home, "build", "Release") : this.home
      await this.root.exec(`./quantize ${outputFile1} ${outputFile2} 2`, bin_path)
    }
  }
  async download(model) {
    console.log(`Download model ${model}`)
    const venv_path = path.join(this.root.home, "venv")
    const python_path = platform == "win32" ? path.join(venv_path, "Scripts", "python.exe") : path.join(venv_path, 'bin', 'python')
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
//      if (fs.existsSync(path.resolve(resolvedPath, file))) {
//        console.log(`Skip file download, it already exists: ${file}`)
//        continue;
//      }

      const url = `https://agi.gpt4.org/llama/LLaMA/${model}/${file}`
      await this.root.down(url, path.resolve(resolvedPath, file), {
        "User-Agent": "Mozilla/5.0"
      })
    }

    const files2 = ["tokenizer_checklist.chk", "tokenizer.model"]
    for(let file of files2) {
//      if (fs.existsSync(path.resolve(this.home, "models", file))) {
//        console.log(`Skip file download, it already exists: ${file}`)
//        continue;
//      }
      const url = `https://agi.gpt4.org/llama/LLaMA/${file}`
      const dir = path.resolve(this.home, "models")
      await this.root.down(url, path.resolve(dir, file), {
        "User-Agent": "Mozilla/5.0"
      })
    }

  }
}
module.exports = LLaMA
