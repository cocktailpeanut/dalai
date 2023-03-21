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
        const promptsDirs = [
            path.join(__dirname, "prompts"),
            path.join(__dirname, "prompts", "custom")
        ];
        const allPrompts = [];
        let numDirsChecked = 0;
        promptsDirs.forEach(promptsDir => {
            if (fs.existsSync(promptsDir) && fs.statSync(promptsDir).isDirectory()) {
                fs.readdir(promptsDir, (err, files) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Internal server error" });
                    }
                    const prompts = files.filter(file => !fs.statSync(path.join(promptsDir, file)).isDirectory())
                        .map((file) => {
                            const promptName = path.basename(file, ".txt");
                            const promptValue = fs.readFileSync(path.join(promptsDir, file), "utf8");
                            const isCustom = promptsDir.includes("custom");
                            const editable = isCustom ? true : false;
                            return { name: promptName, value: promptValue, editable: editable };
                        });
                    allPrompts.push(...prompts);
                    console.log(`Added ${prompts.length} prompts from ${promptsDir}`);
                    numDirsChecked++;
                    if (numDirsChecked === promptsDirs.length) {
                        res.json(allPrompts);
                        console.log(`Returning ${allPrompts.length} prompts`);
                    }
                });
            } else {
                console.error(`Directory not found: ${promptsDir}`);
                numDirsChecked++;
                if (numDirsChecked === promptsDirs.length) {
                    res.json(allPrompts);
                    console.log(`Returning ${allPrompts.length} prompts`);
                }
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`)
    })
}
module.exports = start