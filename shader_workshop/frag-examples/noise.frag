uniform float zoom;   // def:0.4 min:0.1 max:2.0
uniform int octaves;  // def:5 min:1 max:10

#include srgb

const float LACUNARITY = 1.98;
const float GAIN = 0.51;
const float TAU = 6.283185307179586;

float u2f(uint x) { return float(x>>8U)*uintBitsToFloat(0x33800000U); }

uint hash(uint x) {
    x = (x ^ (x >> 16)) * 0x21f0aaadU;
    x = (x ^ (x >> 15)) * 0x735a2d97U;
    return x ^ (x >> 15);
}
uint hash(uvec2 x) { return hash(x.x ^ hash(x.y)); }

vec2 grad(ivec2 x) { // ivec2 lattice to random 2D unit vector (circle point)
    float angle = u2f(hash(uvec2(x))) * TAU;
    return vec2(cos(angle), sin(angle));
}

float noise(vec2 p) {
    ivec2 i = ivec2(floor(p));
    vec2 f = fract(p);
    float v0 = dot(grad(i), f);
    float v1 = dot(grad(i + ivec2(1, 0)), f - vec2(1.0, 0.0));
    float v2 = dot(grad(i + ivec2(0, 1)), f - vec2(0.0, 1.0));
    float v3 = dot(grad(i + ivec2(1, 1)), f - vec2(1.0, 1.0));
    vec2 a = (((6.0*f-15.0)*f+10.0)*f*f*f);
    return mix(mix(v0,v1,a.x),mix(v2,v3,a.x),a.y);
}

float fbm(vec2 p) {
    float sum = 0.0, amp = 1.0;
    for (int i = 0; i < octaves; i++) {
        sum += amp * noise(p);
        p *= LACUNARITY;
        amp *= GAIN;
    }
    return sum;
}

void main() {
    float freq = 1.0/zoom;

    // 1:1 ratio with [-1,1] along shortest axis (horizontal or vertical)
    vec2 p = (2.0*gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);

    float n = fbm(p*freq + time*freq*0.1);
    float v = n*0.5+0.5; // [-1,1] to [0,1]
    vec3 col = vec3(v*v*v); // better lightness perception

    out_color = vec4(l2s(col), 1.0);
}
