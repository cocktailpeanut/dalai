const Dalai = require("./index")
new Dalai().setup().then(() => {
  console.log("executed setup")
  process.exit(0)
}).catch((e) => {
  console.log("Error", e)
  process.exit(1)
})
