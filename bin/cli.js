#! /usr/bin/env node
const Dalai = require("../index")
const Web = require("./web/index")
if (process.argv.length > 0) {
  let [cmd, ...args] = process.argv.slice(2)
  if (cmd === "serve") {
    const port = (args.length > 0 ? parseInt(args[0]) : 3000)
    Web(port)
  } else if (cmd === "setup") {
    new Dalai().setup().then(() => {
      process.exit(0)
    }).catch((e) => {
      console.log("Error", e)
      process.exit(1)
    })
  } else {
    if (args.length > 0) {
      let core = cmd
      let [method, ...callparams] = args 
      let dalai = new Dalai()
      console.log({ method, callparams })
      // 1. install => install the core module
      // 2. get => get models
      dalai[method](core, ...callparams).then(() => {
        process.exit(0)
      }).catch((e) => {
        console.log("ERROR", e)
        process.exit(1)
      })
    } else {
      console.log("############################################")
      console.log("#")
      console.log("#  Supported Commands:")
      console.log("#")
      console.log("#  1. System command")
      console.log("#")
      console.log("#    dalai serve <port (optional)>")
      console.log("#")
      console.log("#  2. Model command")
      console.log("#")
      console.log("#    dalai llama get <model names>")
      console.log("#")
      console.log("############################################")
    }
  }
} else {
  console.log("ERROR: Please pass a command")
  process.exit(1)
}
