import express from "express";
import * as http from "http";
import * as path from "path";
import Dalai from "../index";

const app = express();
const httpServer = new http.Server(app);
const dalai = new Dalai();

export default (port: number) => {
  dalai.http(httpServer);
  app.use(express.static(path.resolve(process.cwd(), "public")));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set("view engine", "ejs");
  app.set("views", path.resolve(process.cwd(), "views"));
  app.get("/", (req, res) => {
    res.render("index");
  });
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
};
