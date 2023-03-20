const WebTorrent = require('webtorrent')
const term = require( 'terminal-kit' ).terminal;
const path = require('path')
const fs = require('fs')
class TorrentDownloader {
  constructor() {
    this.client = new WebTorrent()
    this.start = {}
    this.progressbar = {}
  }
  add(url, folder, cb) {
    return new Promise((resolve, reject) => {
      let e = fs.existsSync(folder)
      if (!e) {
        fs.mkdirSync(folder, { recursive: true })
      }
      this.client.add(url, { path: folder }, (torrent) => {
        this.progressbar[url] = term.progressBar({
          width: 120,
          title: torrent.name,
          eta: true,
          percent: true
        });
        torrent.on('metadata', (m) => {
          this.start[torrent.name] = Date.now()
          console.log({ metadata: m })
          term("\n")
        })
        torrent.on('download', bytes => {
          if (cb) {
            cb({ progress: torrent.progress, speed: torrent.downloadSpeed, downloaded: torrent.downloaded })
          }
          this.progressbar[url].update(torrent.progress)
        })
        torrent.on('done', () => {
          console.log('torrent download finished')
          const end = Date.now()
          const elapsed = end - this.start[torrent.name]
          console.log({ start: this.start[torrent.name], end: end, elapsed })
          this.progressbar[url].update(1)
          term("\n")
          resolve(torrent)
          for (const file of torrent.files) {
            // do something with file
            console.log("file", file.name, file.size)
          }
        })
      })
    })
  }
}
module.exports = TorrentDownloader
