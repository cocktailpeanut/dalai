const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
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
        res.render("index")
    })
    app.get("/presets", (req, res) => {
        const presetsDir = path.join(__dirname, "presets")
        fs.readdir(presetsDir, (err, files) => {
            if (err) {
                console.error(err)
                return res.status(500).json({ error: "Internal server error" })
            }
            const presets = files.map((file) => {
                const presetName = path.basename(file, ".txt")
                const presetValue = fs.readFileSync(path.join(presetsDir, file), "utf8")
                return { name: presetName, value: presetValue }
            })
            res.json(presets)
        })
    })
    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`)
    })
}
module.exports = start