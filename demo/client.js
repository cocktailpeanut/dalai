const Dalai = require('../index')
new Dalai().request({
  model: "7B",
  prompt: "If aliens were actually time travlers from the future,",
  n_predict: 400
}, (msg) => {
  process.stdout.write(msg)
})
