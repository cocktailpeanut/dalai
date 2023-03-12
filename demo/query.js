const Dalai = require("../index")
const dalai = new Dalai();
const prompts = [
  `Here's a sentence:

I doesn't know how he is a president of the united states

A more sophisticated and grammatically correct version of above sentence would be:`,
  `here are some crazy ideas for an app that uses AI`,
  `1, 2, 3, 5, 8, 13, 21,`,
  `The following is a sequence of notes from a jazz improvisation:`
];
(async () => {
  await dalai.request({
    model: "7B",
    prompt: prompts[3],
    n_predict: 1000,
  }, (str) => {
    process.stdout.write(str)
  })
})();
