class CanvasShader {
  constructor() {
    this.animationFrame = null;
    this.prog = null;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.gl = canvas.getContext("webgl2");
    if (!this.gl)
      throw new Error("No WebGL2 context available");
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

  loadFragment(fsSrc) {
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

    let startTime = null;
    let lastRefreshInfoTime = -1.0;
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
        info.textContent = t.toFixed(2);
        lastRefreshInfoTime = t;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t);
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

async function loadFromHash() {
  if (loading)
    return;
  loading = true;
  const hash = getCurFrag();
  if (hash) {
    errorBlock.textContent = "";
    refList.textContent = "";
    const fs = await fetch(`/frag/${hash}`, {cache: 'no-store'}).then(r => r.json());
    try {
      canvasShader.loadFragment(fs.content);
    } catch (error) {
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
