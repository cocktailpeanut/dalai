const express = require('express')
const http = require('http')
const path = require('path')
const os = require('os')
const Dalai = require("../../index")
const app = express()
const httpServer = http.Server(app);
const start = (port, home) => {
  const dalai = new Dalai(home)
  dalai.http(httpServer)
  app.use(express.static(path.resolve(__dirname, 'public')))
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, "views"))
  app.get("/", (req, res) => {
    res.render("index", {
      threads: os.cpus().length
    })
  })
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`)
  })
}
module.exports = start
