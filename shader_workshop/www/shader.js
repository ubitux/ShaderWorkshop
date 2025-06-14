class CanvasShader {
  constructor(canvasName) {
    const canvas = document.getElementById(canvasName);

    this.canvas = canvas;
    this.animationFrame = null;
    this.prog = null;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.gl = canvas.getContext("webgl2");
    if (!this.gl)
      CanvasShader.raiseError("No WebGL2 context available");
  }

  static raiseError(err) {
    document.getElementById("error").innerText = err;
    throw new Error(err);
  }

  compileShader(source, type) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      CanvasShader.raiseError(gl.getShaderInfoLog(shader));
    return shader;
  }

  async loadFragment(frag) {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // A big triangle cropped by the viewport to fake a quad geometry (because it's faster)
    const vsSrc = `#version 300 es
      const vec2 pos[] = vec2[](vec2(-1.0, -1.0), vec2(-1.0, 3.0), vec2(3.0, -1.0));
      void main() {
          gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
      }`;

    const fsSrc = await fetch(frag, {cache: 'no-store'}).then(r => r.text());

    const gl = this.gl;
    const vs = this.compileShader(vsSrc, gl.VERTEX_SHADER);
    const fs = this.compileShader(fsSrc, gl.FRAGMENT_SHADER);

    if (this.prog !== null)
      gl.deleteProgram(this.prog);
    const prog = gl.createProgram();
    this.prog = prog;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      CanvasShader.raiseError(gl.getProgramInfoLog(prog));
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const resolutionLoc = gl.getUniformLocation(prog, "resolution");
    const timeLoc = gl.getUniformLocation(prog, "time");
    const canvas = this.canvas;

    const render = (time) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.animationFrame = requestAnimationFrame(render);
    };

    this.animationFrame = requestAnimationFrame(render);
  }
}

const socket = new WebSocket(`ws://${window.location.host}/ws`);
const canvas = new CanvasShader("shader-canvas");
const files = document.getElementById("files");

var fragList = [];

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data["type"] == "list") {
    fragList = data["frags"];
    renderFileList();
  } else if (data["type"] == "reload") {
    loadFromHash();
  }
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

function loadFromHash() {
  const hash = getCurFrag();
  if (hash) {
    document.getElementById("error").textContent = "";
    canvas.loadFragment(`/frag/${hash}`);
    socket.send(JSON.stringify({pick: hash})); // notify backend for file monitoring
    renderFileList(); // to update currently selected one
  }
}

socket.addEventListener("open", loadFromHash);         // at page load
window.addEventListener("hashchange", loadFromHash);   // on hash change
