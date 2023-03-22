const express = require('express')
const os = require("os");
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
        res.render("index", {
          threads: os.cpus().length
        })
    })

    const defaultDir = path.join(__dirname, "prompts");
    const customDir = path.join(os.homedir(), "dalai", "config", "prompts");

    if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
        console.log(`Created custom directory: ${customDir}`);
    }

    app.get("/prompts", (req, res) => {
        let prompts = [];

        const filesToPrompts = (files, directory, editable) =>
            files.flatMap((file) => {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath, "utf8");

                // Filter out directories and non .txt files
                if (!stats.isFile() || !file.endsWith('.txt')) {
                    return []
                }
                const promptName = path.basename(file, ".txt");
                const promptValue = fs.readFileSync(filePath, "utf8");
                return { name: promptName, value: promptValue, editable };
            });

        // Read default prompts
        fs.readdir(defaultDir, (err, files) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Internal server error" });
            }
            prompts = filesToPrompts(files, defaultDir, false);

            // Read custom prompts
            fs.readdir(customDir, (err, files) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Internal server error" });
                }
                prompts = prompts.concat(filesToPrompts(files, customDir, true));
                res.json(prompts);
            });
        });
    });



    httpServer.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`)
    })
}
module.exports = start
