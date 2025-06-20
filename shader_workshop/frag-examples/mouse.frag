// 1:1 ratio with [-1,1] along shortest axis (horizontal or vertical)
vec2 remap(vec2 uv) {
    return (uv*2.0-1.0) * vec2(resolution.x / resolution.y, 1.0);
}

void main() {
    vec2 p = remap(gl_FragCoord.xy / resolution);
    vec2 m = remap(mouse / resolution);
    float sd = length(p-m) - 0.2;
    float aa = clamp(.5-sd/fwidth(sd),0.0,1.0);
    out_color = vec4(vec3(aa), 1.0);
}
