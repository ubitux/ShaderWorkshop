float circle(vec2 p, float r) {
    return length(p) - r;
}

float square(vec2 p, vec2 b) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 p = (uv*2.0-1.0) * vec2(resolution.x / resolution.y, 1.0);
    const float r = 0.7;
    float sd0 = circle(p, r);
    float sd1 = square(p, vec2(r));
    float t = (sin(time*2.0)+1.0)/2.0;
    float sd = mix(sd0, sd1, t);
    float aa = clamp(.5-sd/fwidth(sd),0.0,1.0);
    vec3 col = mix(vec3(0.0), vec3(0.8), aa);
    out_color = vec4(col, 1.0);
}
