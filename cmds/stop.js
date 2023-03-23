module.exports = (app) => {
  app.ptyProcess.onData((data) => {
    // nothing
  })
  //app.ptyProcess.write('\u0003')
  app.ptyProcess.kill()
  app.ptyProcess = null
}
