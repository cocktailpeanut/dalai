const express = require('express')
const http = require('http')
const path = require('path')
const Dalai = require("../../index")
const app = express()
const httpServer = http.Server(app);
const dalai = new Dalai()
const start = (port) => {
  dalai.http(httpServer)
  app.use(express.static(path.resolve(__dirname, 'public')))
  app.use(express.json());
  app.use(express.urlencoded());
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, "views"))
  app.get("/", (req, res) => {
    res.render("index")
  })
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`)
  })
}
module.exports = start
