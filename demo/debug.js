// Return the full response (not just the answer) => need to pass "full: true" in the request
const Dalai = require('../index')
new Dalai().request({
  full: true,
  model: "7B",
  prompt: "If aliens were actually time travelers from the future,",
  n_predict: 400
}, (msg) => {
  process.stdout.write(msg)
})
