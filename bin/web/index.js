"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const path = __importStar(require("path"));
const index_1 = __importDefault(require("../index"));
const app = (0, express_1.default)();
const httpServer = new http.Server(app);
const dalai = new index_1.default();
exports.default = (port) => {
    dalai.http(httpServer);
    app.use(express_1.default.static(path.resolve(process.cwd(), "public")));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.set("view engine", "ejs");
    app.set("views", path.resolve(process.cwd(), "views"));
    app.get("/", (req, res) => {
        res.render("index");
    });
    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`);
    });
};
