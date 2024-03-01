uniform float time;
uniform float uAnimate;
varying vec2 vUv;
float PI = 3.14;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}