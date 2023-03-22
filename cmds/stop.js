module.exports = (app) => {
  console.log("stop---------------------")
  app.ptyProcess.onData((data) => {
    // nothing
  })
  app.ptyProcess.write('\u0003')
  app.ptyProcess = null
}
