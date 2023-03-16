#! /usr/bin/env node
const Dalai = require("../index")
const Web = require("./web/index")
if (process.argv.length > 0) {
  let [cmd, ...args] = process.argv.slice(2)
  if (cmd === "serve") {
    const port = (args.length > 0 ? parseInt(args[0]) : 3000)
    Web(port)
  } else if (cmd === "llama" || cmd === "install") {
    if (args.length === 0) args = ["7B"]
    for(let arg of args) {
      if (!["7B", "13B",  "30B", "65B"].includes(arg)) {
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
        process.exit(1)
        break;
      }
    }
    new Dalai().install(...args).then(() => {
      process.exit(0)
    }).catch((e) => {
      console.log("Error", e)
    })
  }
} else {
  console.log("ERROR: Please pass a command")
  process.exit(1)
}
