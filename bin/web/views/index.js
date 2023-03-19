var gen = 0;
const config = {
  seed: -1,
  threads: 4,
  n_predict: 6942069,
  model: "7B",
  top_k: 40,
  top_p: 0.9,
  temp: 0.9,
  repeat_last_n: 64,
  repeat_penalty: 1.3,
  debug: false,
  models: [],
};
const socket = io();
const form = document.getElementById("form");
const stopButton = document.getElementById("stop");
const input = document.getElementById("input");
const model = document.getElementById("model");
const messages = document.getElementById("messages");

input.addEventListener("keydown", () => {
  setTimeout(() => {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });
});

const renderHeader = (config) => {
  const fields = [
    { key: "debug", type: "checkbox" },
    "n_predict",
    "repeat_last_n",
    "repeat_penalty",
    "top_k",
    "top_p",
    "temp",
    "seed",
  ]
    .map((key) => {
      if (typeof key === "string") {
        return `
<div class='kv'>
<label>${key}</label>
<input 
  name="${key}" 
  type='text' 
  placeholder="${key}" 
  value="${config[key] || ""}"
>
</div>`;
      } else {
        if (key.type === "checkbox") {
          return `
<div class='kv'>
  <label>${key.key}</label>
  <label class="switch">
    <input name="${key.key}" type='checkbox' ${
            config[key.key] ? "checked" : ""
          }>
    <span class="slider round"></span>
  </label>
</div>`;
        }
      }
    })
    .join("");

  config.model = config.models[0];
  const models = config.models
    .map((model, i) => {
      return `<option value="${model}" ${
        i === 0 ? "selected" : ""
      }>${model}</option>`;
    })
    .join("");
  return `
<div class='config-container'>
  ${fields}
  <div class='kv'>
    <label>model</label>
    <label class="dropdown-arrow">
      <select id="model" name="model">${models}</select>
    </label>
  </div>
</div>`;
};
let isRunningModel = false;
const loading = (on) => {
  if (on) {
    document.querySelector(".loading").classList.remove("hidden");
  } else {
    document.querySelector(".loading").classList.add("hidden");
  }
};
document.querySelector(".form-header").addEventListener("input", (e) => {
  if (e.target.tagName === "SELECT") {
    config[e.target.name] = config.models[e.target.selectedIndex];
    console.log(config.models[e.target.selectedIndex]);
  } else if (e.target.type === "checkbox") {
    config[e.target.name] = e.target.checked;
  } else {
    config[e.target.name] = e.target.value;
  }
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (input.value) {
    config.prompt = input.value
      .replaceAll("\n", "\\n")
      .replaceAll('"', '\\\\\\""');
    socket.emit("request", config);
    loading(config.prompt);
    input.value = "";
    isRunningModel = true;
    form.setAttribute("class", isRunningModel ? "running-model" : "");
    gen++;
  }
});
input.addEventListener("keydown", (e) => {
  if (e.keyCode === 13) {
    e.preventDefault();
    if (e.shiftKey) {
      document.execCommand("insertLineBreak");
    } else {
      form.requestSubmit();
    }
  }
});

stopButton.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  socket.emit("request", {
    method: "stop",
  });
  setTimeout(() => {
    isRunningModel = false;
    form.setAttribute("class", isRunningModel ? "running-model" : "");
    input.style.height = "34px";
  }, 200);
});

const sha256 = async (input) => {
  const textAsBuffer = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", textAsBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
  return hash;
};
const say = (msg, id) => {
  let item = document.createElement("li");
  if (id) item.setAttribute("data-id", id);
  console.log(msg);
  item.innerText = msg;
  messages.append(item);
};
socket.emit("request", {
  method: "installed",
});
var responses = [];

function setHomepage() {
  if (
    document.getElementById("model").value.toLowerCase().startsWith("alpaca")
  ) {
    document.body.classList.remove("llama");
    document.body.classList.add("alpaca");
  } else if (
    document.getElementById("model").value.toLowerCase().startsWith("llama")
  ) {
    document.body.classList.remove("alpaca");
    document.body.classList.add("llama");
  }
}

socket.on("result", async ({ request, response, isRunning }) => {
  loading(false);
  if (request.method === "installed") {
    if (response == "\n\n<end>") {
      if (!document.querySelector(".form-header .config-container")) {
        var header = document.createElement("div");
        document.querySelector(".form-header").prepend(header);
        header.outerHTML = renderHeader(config);
        // document.querySelector(".form-header").innerHTML = renderHeader(config);
        setHomepage();
        document.getElementById("model").addEventListener("change", () => {
          if (document.body.classList.length != 0) {
            setHomepage();
          }
        });
      }
    } else {
      config.models.push(response);
    }
  } else {
    if (response == "\n\n<end>") {
    } else {
      document.body.classList.remove("llama");
      document.body.classList.remove("alpaca");
      isRunningModel = true;
      form.setAttribute("class", isRunningModel ? "running-model" : "");
      const id = (await sha256(request.prompt)) + gen;
      let existing = document.querySelector(`[data-id='${id}']`);
      if (existing) {
        if (!responses[id]) {
          responses[id] = document.querySelector(`[data-id='${id}']`).innerHTML;
        }
        response = response.replaceAll(/</g, "&lt;");
        response = response.replaceAll(/>/g, "&gt;");
        console.log(response);
        if (response.includes("[end of text]")) {
          setTimeout(() => {
            isRunningModel = false;
            form.setAttribute("class", isRunningModel ? "running-model" : "");
          }, 200);
        }
        responses[id] = responses[id] + response;

        if (responses[id].startsWith("<br>")) {
          responses[id] = responses[id].replace("<br>", "");
        }
        if (responses[id].startsWith("\n")) {
          responses[id] = responses[id].replace("\n", "");
        }

        responses[id] = responses[id].replaceAll(/\r?\n\x1B\[\d+;\d+H./g, "");

        responses[id] = responses[id].replaceAll("ΓÇÖ", "'"); //apostrophe
        responses[id] = responses[id].replaceAll("ÔÇÖ", "'"); //apostrophe
        responses[id] = responses[id].replaceAll("ΓÇ£", '"'); //left quote
        responses[id] = responses[id].replaceAll("ΓÇ¥", '"'); //right quote
        responses[id] = responses[id].replaceAll("ΓÇÿ", "'"); //left half quote
        responses[id] = responses[id].replaceAll("ΓÇª", ","); //comma, could also be question mark
        responses[id] = responses[id].replaceAll("ΓÇô", "-"); //dash (not sure)
        responses[id] = responses[id].replaceAll("ΓÇö", ","); //comma, could also be ampersand (not sure)
        responses[id] = responses[id].replaceAll("ΓÇï", ";"); //semicolon
        responses[id] = responses[id].replaceAll("┬ú", "$"); //dollar sign
        responses[id] = responses[id].replaceAll("Æs", "'s"); //apostrophe s

        responses[id] = responses[id].replaceAll("&quot;", '"'); //quote

        responses[id] = responses[id].replaceAll("\\n", "\n"); //convert line breaks back
        responses[id] = responses[id].replaceAll('\\"', '"'); //convert quotes back

        //support for codeblocks
        responses[id] = responses[id].replaceAll(
          "\\begin{code}",
          `<pre><code>`
        ); //start codeblock

        responses[id] = responses[id].replaceAll(
          "\\end{code}",
          `</code></pre>`
        ); //end codeblock
        if (
          document.getElementById("bottom").getBoundingClientRect().y <
          window.innerHeight
        ) {
          setTimeout(() => {
            bottom.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
        existing.innerHTML = responses[id];
      } else {
        say(response, id);
      }
    }
  }
});

document
  .querySelectorAll("#feed-placeholder-llama button.card")
  .forEach((e) => {
    e.addEventListener("click", () => {
      let text = e.innerText.replace('"', "").replace('" →', "");
      input.value = text;
    });
  });
document
  .querySelectorAll("#feed-placeholder-alpaca button.card")
  .forEach((e) => {
    e.addEventListener("click", () => {
      let text = e.innerText.replace('"', "").replace('" →', "");
      input.value = text;
    });
  });
