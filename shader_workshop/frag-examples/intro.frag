#include srgb

// Based on ShaderToy default template
void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec3 col = 0.5 + 0.5 * sin(time + uv.xyx + vec3(0.0, 2.0, 4.0));
    out_color = vec4(l2s(col), 1.0);
}
