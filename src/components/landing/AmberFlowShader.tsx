import { useEffect, useRef } from 'react';

/**
 * Soft flowing amber-on-white liquid shader.
 * Inspired by Paper-like ribbon gradients.
 */
export function AmberFlowShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const vert = `
      attribute vec2 a_pos;
      void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const frag = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;

      vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
      vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
      vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
        vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0*fract(p*C.www)-1.0;
        vec3 h = abs(x)-0.5;
        vec3 ox = floor(x+0.5);
        vec3 a0 = x-ox;
        m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
        vec3 g;
        g.x = a0.x*x0.x + h.x*x0.y;
        g.yz = a0.yz*x12.xz + h.yz*x12.yw;
        return 130.0*dot(m,g);
      }

      void main(){
        vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy) / min(u_res.x, u_res.y);
        float t = u_time * 0.025;

        // Soft, slow domain warp — large smooth mesh-gradient blobs
        vec2 q = vec2(snoise(p*0.7 + vec2(0.0, t)),
                      snoise(p*0.7 + vec2(3.1, -t*0.8)));
        vec2 r = vec2(snoise(p*0.9 + q*0.9 + vec2(1.7, 9.2) + t*0.6),
                      snoise(p*0.9 + q*0.9 + vec2(8.3, 2.8) - t*0.5));
        float f = snoise(p*0.65 + r*1.1) * 0.5 + 0.5;

        vec3 white     = vec3(1.0, 0.996, 0.988);
        vec3 cream     = vec3(0.976, 0.945, 0.898);
        vec3 amber     = vec3(0.925, 0.741, 0.451);
        vec3 deepAmber = vec3(0.831, 0.588, 0.286);

        // gentle stacked gradients, no hard ribbons
        vec3 col = mix(white, cream, smoothstep(0.15, 0.60, f));
        col = mix(col, amber, smoothstep(0.45, 0.92, f) * 0.85);
        col = mix(col, deepAmber, smoothstep(0.78, 1.05, f) * 0.5);

        // airy top-left light falloff, keeps copy readable
        float light = smoothstep(1.1, -0.2, length(p + vec2(0.45, -0.25)));
        col = mix(col, white, light * 0.45);

        // subtle grain
        float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453);
        col += (g-0.5) * 0.005;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-screen h-[100svh] pointer-events-none motion-reduce:hidden md:[filter:blur(28px)_saturate(1.05)] [filter:blur(34px)_saturate(1.05)]"
      style={{ zIndex: 0 }}
    />
  );
}
