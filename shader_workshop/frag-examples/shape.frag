uniform float radius; // def:0.7 min:0.1 max:0.9
uniform bool rotate;  // def:1
uniform vec3 color0;  // def:1,1,1
uniform vec3 color1;  // def:1,0.5,0

#include srgb

float circle(vec2 p, float r) {
    return length(p) - r;
}

float square(vec2 p, vec2 b) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

void main() {
    // 1:1 ratio with [-1,1] along shortest axis (horizontal or vertical)
    vec2 p = (2.0*gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);

    if (rotate) {
        float a = time*0.5;
        float c = cos(a), s = sin(a);
        p = mat2(c,-s,s,c) * p;
    }

    float sd0 = circle(p, radius);
    float sd1 = square(p, vec2(radius));
    float t = (sin(time*2.0)+1.0)/2.0;
    float sd = mix(sd0, sd1, t);
    float aa = clamp(.5-sd/fwidth(sd),0.0,1.0);
    vec3 col = mix(s2l(color0), s2l(color1), t) * aa;
    out_color = vec4(l2s(col), 1.0);
}
