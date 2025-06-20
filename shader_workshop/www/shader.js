class CanvasShader {
  constructor() {
    this.animationFrame = null;
    this.prog = null;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.gl = canvas.getContext("webgl2");
    if (!this.gl)
      throw new Error("No WebGL2 context available");

    this.mouseX = canvas.width / 2.0;
    this.mouseY = canvas.height / 2.0;
    // grab at document level to not miss events near the border of the canvas
    document.onmousemove = (e) => this.onMouseMove(e);
  }

  onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    this.mouseX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    this.mouseY = Math.min(Math.max(rect.height - (e.clientY - rect.top), 0), rect.height); // Flip Y
  }

  compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  loadFragment(fsSrc, controls) {
    const gl = this.gl;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      const p = this.prog;
      this.prog = null; // used to notify render loop
      gl.deleteProgram(p);
    }

    // A big triangle cropped by the viewport to fake a quad geometry (because it's faster)
    const vsSrc = `#version 300 es
      const vec2 pos[] = vec2[](vec2(-1.0, -1.0), vec2(-1.0, 3.0), vec2(3.0, -1.0));
      void main() {
          gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
      }`;

    const vs = this.compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = this.compileShader(fsSrc, gl.FRAGMENT_SHADER);

    const prog = gl.createProgram();
    this.prog = prog;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(prog));

    const resolutionLoc = gl.getUniformLocation(prog, "resolution");
    const timeLoc = gl.getUniformLocation(prog, "time");
    const mouseLoc = gl.getUniformLocation(prog, "mouse");

    var control_info = {};
    for (const control of controls) {
      control_info[control.name] = {
        w: document.getElementById(`ctl_${control.name}`),
        loc: gl.getUniformLocation(prog, control.name),
      };
    }

    let startTime = null;
    let lastRefreshInfoTime = -1.0;
    let lastTime = -1.0;
    let pauseTime = 0.0;

    const render = (time) => {
      if (action == Action.ResetTime || startTime === null) {
        action = null;
        startTime = time;
        pauseTime = time;
        lastRefreshInfoTime = -1.0;
      } else if (action == Action.Pause) {
        action = null;
        pauseTime = time;
        fpsInfo.textContent = "";
      } else if (action == Action.Resume) {
        action = null;
        startTime += time - pauseTime;
      }

      if (!this.prog) {
        console.log("render loop canceled");
        return;
      }

      if (paused) time = pauseTime;

      const t = (time - startTime) * 0.001;
      if (Math.abs(t - lastRefreshInfoTime) > 0.05) {
        infoLbl.textContent = t.toFixed(2);

        const dt = time - lastTime;
        fpsInfo.textContent = dt < 0.0 ? "" : `FPS:${(1000.0/dt).toFixed(1)}`;

        lastRefreshInfoTime = t;
      }
      lastTime = time;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t);
      gl.uniform2f(mouseLoc, this.mouseX, this.mouseY);

      for (const control of controls) {
        const info_ctl = control_info[control.name];
        const w = info_ctl.w;
        const loc = info_ctl.loc;

        if      (control.type == "bool") gl.uniform1i(loc, w.checked ? 1 : 0);
        else if (control.type == "f32")  gl.uniform1f(loc, parseFloat(w.value));
        else if (control.type == "i32")  gl.uniform1i(loc, parseInt(w.value));
        else if (control.type == "color") {
          const color = parseColor(w.value);
          gl.uniform3f(loc, color[0], color[1], color[2]);
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (action == Action.Screenshot) {
        action = null;
        const link = document.createElement("a");
        link.download = "shader.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      }

      this.animationFrame = requestAnimationFrame(render);
    };

    this.animationFrame = requestAnimationFrame(render);
  }
}

function parseColor(hex) {
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3)    hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

let Action = {
  Pause: 1,
  Resume: 2,
  ResetTime: 3,
  Screenshot: 4,
};
let action = null;

let paused; // state

const socket = new WebSocket(`ws://${window.location.host}/ws`);
const canvasShader = new CanvasShader();

var fragList = [];

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type == "list") {
    fragList = data.frags;
    renderFileList();
  } else if (data.type == "reload") {
    loadFromHash();
  }
}

function setPause(state) {
  paused = state;
  action = paused ? Action.Pause : Action.Resume;
  playPause.className = paused ? "" : "pressed";
}
function togglePause() { setPause(!paused); }

function screenshot() { action = Action.Screenshot; }
function reset() { action = Action.ResetTime; }

function updateCanvasSize() {
  const aArray = aspectSelect.value.split(":", 2);
  const a = parseInt(aArray[0]) / parseInt(aArray[1]);
  const h = parseInt(resSelect.value);
  const w = Math.round(h * a);
  console.log(`New resolution: ${w}x${h}`);
  canvas.width = w;
  canvas.height = h;
  canvasShader.mouseX = w / 2.0;
  canvasShader.mouseY = h / 2.0;
}

function renderFileList() {
  const cur = getCurFrag();
  files.textContent = "";
  for (const fragName of fragList) {
    const a = document.createElement("a");
    a.href = `#${fragName}`;
    a.textContent = fragName;
    a.className = fragName == cur ? "selected" : "";
    const li = document.createElement("li");
    li.appendChild(a);
    files.appendChild(li);
  }
}

function getCurFrag() {
  return window.location.hash.substring(1); // drop '#';
}

let loading = false;

function renderRefList(refs) {
  if (refs.length < 2) {
    refList.textContent = "";
    return;
  }
  refList.textContent = "File ID -> filename:";
  const ol = document.createElement("ol");
  ol.start = 0;
  refList.appendChild(ol);
  for (const ref of refs) {
    const li = document.createElement("li");
    li.textContent = ref;
    ol.appendChild(li);
  }
}

function renderFragControls(controls) {
  fragControls.textContent = "";
  if (controls.length == 0) {
    fragControls.style.visibility = "hidden";
    return;
  }

  for (const control of controls) {
    const w = document.createElement("input");
    w.id = `ctl_${control.name}`;

    const label = document.createElement("label");
    label.htmlFor = w.id;
    label.textContent = control.name;

    const o = document.createElement("output");
    o.id = `out_${control.name}`;

    if (["f32", "i32"].includes(control.type)) {
      w.type = "range";
      if (control.type == "f32") {
        w.step = 0.01;
        w.oninput = function() { o.value = parseFloat(this.value).toFixed(2); }
      } else {
        w.step = 1;
        w.oninput = function() { o.value = this.value; }
      }
      w.min = control.min;
      w.max = control.max;
      w.value = control.val;
      w.oninput();
    } else if (control.type == "bool") {
      w.type = "checkbox";
      w.checked = control.val;
    } else if (control.type == "color") {
      w.type = "color";
      w.value = control.val;
      w.oninput = function() { o.value = this.value; }
      w.oninput();
    }

    fragControls.appendChild(label);
    fragControls.appendChild(w);
    fragControls.appendChild(o);
  }

  const legend = document.createElement("legend");
  legend.textContent = "Live controls";
  fragControls.appendChild(legend);
  fragControls.style.visibility = "visible";
}

async function loadFromHash() {
  if (loading)
    return;
  loading = true;
  const hash = getCurFrag();
  if (hash) {
    errorBlock.textContent = "";
    refList.textContent = "";
    const fs = await fetch(`/frag/${hash}`, {cache: 'no-store'}).then(r => r.json());
    renderFragControls(fs.controls);
    try {
      canvasShader.loadFragment(fs.content, fs.controls);
    } catch (error) {
      fragControls.textContent = "";
      fragControls.style.visibility = "hidden";
      errorBlock.innerText = error.message;
      renderRefList(fs.refs);
    }
    socket.send(JSON.stringify({pick: hash})); // notify backend for file monitoring
    renderFileList(); // to update currently selected one
  }
  loading = false;
}

setPause(false);
updateCanvasSize();

resetBtn.onclick = reset;
screenshotBtn.onclick = screenshot;
resSelect.onchange = updateCanvasSize;
aspectSelect.onchange = updateCanvasSize;
playPause.onclick = togglePause;

socket.onopen = loadFromHash;       // at page load
window.onhashchange = loadFromHash; // on hash change
