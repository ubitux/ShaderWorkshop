vec3 s2l(vec3 c) { // sRGB to linear
    return mix(c/12.92, pow((max(c,0.0)+0.055)/1.055,vec3(2.4)), step(vec3(0.04045),c));
}

vec3 l2s(vec3 c) { // linear to sRGB
    return mix(c*12.92, 1.055*pow(max(c,0.0),vec3(1./2.4))-0.055, step(vec3(0.0031308),c));
}

vec3 s2l(float r, float g, float b) { return s2l(vec3(r, g, b)); }
vec3 l2s(float r, float g, float b) { return l2s(vec3(r, g, b)); }
