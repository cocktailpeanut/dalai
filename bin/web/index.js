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
    app.get("/prompts", (req, res) => {
        const promptsDir = path.join(__dirname, "prompts");
        fs.readdir(promptsDir, (err, files) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Internal server error" });
            }
            const prompts = files.map((file) => {
                const promptName = path.basename(file, ".txt");
                const promptValue = fs.readFileSync(path.join(promptsDir, file), "utf8");
                return { name: promptName, value: promptValue };
            });
            res.json(prompts);
        });
    });

    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`)
    })
}
module.exports = start