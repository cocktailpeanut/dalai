const express = require("express");
const http = require("http");
const path = require("path");
const Dalai = require("../../index");
const app = express();
const httpServer = http.Server(app);
const dalai = new Dalai();
var os = require("os-utils");
const start = (port) => {
  dalai.http(httpServer);
  app.use(express.static(path.resolve(__dirname, "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // app.set("view engine", "ejs");
  // app.set("views", path.resolve(__dirname, "views"));
  app.get("/", (req, res) => {
    // res.render("index");
    res.sendFile(path.resolve(__dirname, "views", "index.html"));
  });
  app.get("/style.css", (req, res) => {
    res.sendFile(path.resolve(__dirname, "views", "style.css"));
  });
  app.get("/index.js", (req, res) => {
    res.sendFile(path.resolve(__dirname, "views", "index.js"));
  });

  // CPU
  app.get("/sys/cpuUsage", (req, res) => {
    os.cpuUsage(function (v) {
      res.send(v);
    });
  });
  app.get("/sys/cpuFree", (req, res) => {
    os.cpuFree(function (v) {
      res.send(v);
    });
  });

  // OTHER STATS
  app.get("/sys/cpuCount", (req, res) => {
    res.send(os.cpuCount());
  });
  app.get("/sys/freemem", (req, res) => {
    res.send(os.freemem());
  });
  app.get("/sys/totalmem", (req, res) => {
    res.send(os.totalmem());
  });

  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
};
module.exports = start;
