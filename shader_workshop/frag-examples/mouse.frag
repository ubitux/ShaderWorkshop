void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (uv*2.0-1.0) * vec2(resolution.x / resolution.y, 1.0);
    vec2 m = (mouse/resolution * 2.0-1.0) * vec2(resolution.x / resolution.y, 1.0);
    float sd = length(p-m) - 0.3;
    float aa = clamp(.5-sd/fwidth(sd),0.0,1.0);
    vec3 col = vec3(aa);
    out_color = vec4(col, 1.0);
}
