# Shader Workshop

This tool is a local HTTP/WebSocket server monitoring the specified shader
fragment directory. It allows live coding fragment shaders with your preferred
code editor, and having them rendered in your browser through WebGL2.

## Usage

```
shader-workshop /path/to/fragment/shaders
```

If unspecified, `shader-workshop` will use the examples directory.

## Fragment inputs and outputs

Every fragment gets the following uniforms as input:

- `float time`: the time in seconds
- `vec2 resolution`: the canvas resolution in pixels

They must write on the `vec4 out_color` output to produce a color.

The compatibility is currently set to `300 es`.
