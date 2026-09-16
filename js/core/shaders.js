// =============================================================================
//  shaders.js — sorgenti GLSL. Tutti gli shader includono il log-depth-buffer
//  di three.js (renderer creato con logarithmicDepthBuffer: true).
// =============================================================================
window.U = window.U || {};
(function (U) {
  'use strict';
  const S = U.SH = {};

  S.noise = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float f=0.0,a=0.5; for(int k=0;k<5;k++){ f+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return f; }
vec3 hash33(vec3 p){ p=fract(p*vec3(0.1031,0.1030,0.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
// crateri: restituisce (profondità conca, luminosità bordo)
vec2 craters(vec3 p){
  vec3 ip=floor(p); vec3 fp=fract(p); float bowl=0.0; float rim=0.0;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){
    vec3 o=vec3(float(x),float(y),float(z)); vec3 h=hash33(ip+o);
    float r=0.15+0.3*h.z*h.z; vec3 c=o+h-fp; float d=length(c)/r;
    if(d<1.0){ bowl=max(bowl,1.0-d*d); }
    rim=max(rim,smoothstep(0.75,1.0,d)*smoothstep(1.25,1.0,d));
  }
  return vec2(bowl,rim);
}
`;

  // --- Punti luminosi (stelle, galassie, particelle) --------------------------
  // uMode 0: size in unità mondo (attenuata con la distanza), 1: size in pixel
  S.pointsVert = /* glsl */`
attribute float size;
attribute vec3 color;
uniform float uScale; uniform float uMinPx; uniform float uMaxPx; uniform float uIntensity;
uniform float uFalloff; uniform float uNearFade; uniform int uMode; uniform float uPixelRatio;
varying vec3 vColor; varying float vA;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  float d=max(-mv.z,1e-30);
  float px; float a=1.0;
  if(uMode==1){ px=size*uPixelRatio; }
  else{
    px=size*uScale/d;
    if(px<uMinPx){ a=pow(max(px/uMinPx,0.0),uFalloff); px=uMinPx; }
    if(px>uMaxPx){ px=uMaxPx; }
    if(uNearFade>0.0){ a*=smoothstep(uNearFade*0.25,uNearFade,d); }
  }
  gl_PointSize=px;
  gl_Position=projectionMatrix*mv;
  vColor=color; vA=a*uIntensity;
  #include <logdepthbuf_vertex>
}`;
  S.pointsFrag = /* glsl */`
varying vec3 vColor; varying float vA; uniform float uCore;
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  vec2 c=gl_PointCoord-0.5; float r2=dot(c,c)*4.0;
  if(r2>1.0||vA<0.002) discard;
  float g=exp(-r2*uCore)*(1.0-r2);
  gl_FragColor=vec4(vColor,g*vA);
}`;

  // --- Marcatore oggetto: nucleo + alone, dimensione in pixel ------------------
  S.markerVert = /* glsl */`
uniform float uPx; uniform float uPixelRatio;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=uPx*uPixelRatio;
  gl_Position=projectionMatrix*mv;
  #include <logdepthbuf_vertex>
}`;
  S.markerFrag = /* glsl */`
uniform vec3 uColor; uniform float uOpacity; uniform float uHalo;
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  vec2 c=gl_PointCoord-0.5; float r=length(c)*2.0; if(r>1.0) discard;
  float core=smoothstep(0.32,0.12,r);
  float halo=exp(-r*r*6.0)*uHalo;
  float a=clamp(core+halo,0.0,1.0)*uOpacity;
  gl_FragColor=vec4(mix(uColor,vec3(1.0),core*0.55),a);
}`;

  // --- Stelle di sfondo (cielo): punti in pixel, senza profondità --------------
  S.skyVert = /* glsl */`
attribute float size; attribute vec3 color; uniform float uPixelRatio; varying vec3 vColor;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uPixelRatio; gl_Position=projectionMatrix*mv; vColor=color; }`;
  S.skyFrag = /* glsl */`
varying vec3 vColor;
void main(){ vec2 c=gl_PointCoord-0.5; float r2=dot(c,c)*4.0; if(r2>1.0) discard; gl_FragColor=vec4(vColor,exp(-r2*3.0)*(1.0-r2)); }`;

  // --- Pianeti / lune --------------------------------------------------------
  S.planetVert = /* glsl */`
varying vec3 vN; varying vec3 vNW; varying vec3 vPosW; varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  vN=normal; vUv=uv;
  vNW=normalize(mat3(modelMatrix)*normal);
  vec4 wp=modelMatrix*vec4(position,1.0); vPosW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
  S.planetFrag = /* glsl */`
uniform int uType; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uSeed;
uniform vec3 uSunDir; uniform float uTime; uniform float uAmbient;
uniform sampler2D uDay; uniform sampler2D uNight; uniform float uHasTex;
varying vec3 vN; varying vec3 vNW; varying vec3 vPosW; varying vec2 vUv;
#include <logdepthbuf_pars_fragment>
${S.noise}
void main(){
  #include <logdepthbuf_fragment>
  vec3 n=normalize(vN); vec3 nw=normalize(vNW);
  float ndl=dot(nw,normalize(uSunDir));
  float lat=n.y;
  vec3 albedo=uC1; vec3 emissive=vec3(0.0); float spec=0.0;
  vec3 sp=n+vec3(uSeed);
  if(uType==0){ // roccioso craterizzato (Mercurio, Luna, lune minori)
    float f=fbm(sp*3.0);
    vec2 cr=craters(sp*6.0); vec2 cr2=craters(sp*17.0);
    albedo=mix(uC1,uC2,smoothstep(-0.35,0.45,f));
    albedo*=1.0-0.28*cr.x-0.15*cr2.x; albedo+=uC3*(cr.y*0.18+cr2.y*0.1);
  } else if(uType==1){ // Venere: nubi di acido solforico
    float f=fbm(vec3(n.x*2.0,n.y*5.0,n.z*2.0)+vec3(uSeed+uTime*0.02,0.0,0.0));
    albedo=mix(uC1,uC2,f*0.5+0.5);
  } else if(uType==2){ // Terra (texture NASA)
    vec3 day=texture2D(uDay,vUv).rgb;
    vec3 night=texture2D(uNight,vUv).rgb;
    albedo=pow(day,vec3(1.1))*1.15;
    float ocean=smoothstep(0.02,0.12,day.b-day.r);
    vec3 v=normalize(cameraPosition-vPosW); vec3 h=normalize(normalize(uSunDir)+v);
    spec=ocean*pow(max(dot(nw,h),0.0),60.0)*0.6;
    emissive=vec3(1.0,0.78,0.45)*pow(night.r,1.6)*1.4;
  } else if(uType==3){ // Marte
    float f=fbm(sp*2.5); float g=fbm(sp*9.0);
    albedo=mix(uC1,uC2,smoothstep(-0.2,0.35,f)); albedo*=0.9+0.2*g;
    float cap=smoothstep(0.86,0.92,abs(lat)+0.03*g); albedo=mix(albedo,vec3(0.95,0.94,0.92),cap);
  } else if(uType==4||uType==5){ // giganti gassosi: bande zonali
    float turb=fbm(vec3(n.x*3.0,n.y*14.0,n.z*3.0)+vec3(uSeed,0.0,uTime*0.01))*0.08;
    float freq=uType==4?22.0:16.0;
    float b=sin((lat+turb)*freq)*0.5+0.5;
    float fine=sin((lat+turb*1.6)*freq*3.1)*0.5+0.5;
    albedo=mix(uC1,uC2,b); albedo=mix(albedo,uC3,fine*0.22);
    if(uType==4){ // Grande Macchia Rossa ~22°S
      vec2 q=vec2(atan(n.z,n.x),asin(clamp(lat,-1.0,1.0)));
      vec2 dq=vec2((q.x-1.2)*0.55,(q.y+0.384)*1.9);
      float spot=smoothstep(0.13,0.07,length(dq));
      albedo=mix(albedo,vec3(0.72,0.36,0.24),spot*0.85);
    } else { albedo*=0.92+0.08*smoothstep(0.75,0.95,abs(lat)); }
  } else if(uType==6){ // giganti ghiacciati
    float turb=fbm(vec3(n.x*2.0,n.y*10.0,n.z*2.0)+vec3(uSeed))*0.05;
    float b=sin((lat+turb)*9.0)*0.5+0.5;
    albedo=mix(uC1,uC2,b*0.35);
    if(uSeed>5.0){ // Neptune: ovale scuro indicativo
      vec2 q=vec2(atan(n.z,n.x),asin(clamp(lat,-1.0,1.0)));
      float spot=smoothstep(0.16,0.08,length(vec2((q.x+0.6)*0.6,(q.y+0.35)*1.6)));
      albedo=mix(albedo,uC3,spot*0.7);
    }
  } else if(uType==7){ // luna ghiacciata con linee (Europa, Encelado)
    float f=fbm(sp*3.0); float lines=1.0-smoothstep(0.0,0.035,abs(snoise(sp*5.0)));
    float lines2=1.0-smoothstep(0.0,0.02,abs(snoise(sp*11.0+3.0)));
    albedo=mix(uC1,uC2,f*0.5+0.5); albedo=mix(albedo,uC3,max(lines,lines2*0.7)*0.6);
  } else if(uType==8){ // Io: vulcani e zolfo
    float f=fbm(sp*3.5); vec2 cr=craters(sp*5.0);
    albedo=mix(uC1,uC2,smoothstep(-0.3,0.4,f)); albedo=mix(albedo,uC3,cr.x*0.8);
  } else if(uType==9){ // Titano: foschia arancione
    float f=fbm(sp*2.0)*0.5+0.5; albedo=mix(uC1,uC2,f*0.25);
  } else if(uType==10){ // Plutone: pianure di azoto (Sputnik Planitia indicativa)
    float f=fbm(sp*2.5);
    albedo=mix(uC1,uC2,smoothstep(-0.2,0.4,f));
    vec2 q=vec2(atan(n.z,n.x),asin(clamp(lat,-1.0,1.0)));
    float heart=smoothstep(0.45,0.3,length(vec2((q.x-0.3)*0.7,(q.y-0.3))));
    albedo=mix(albedo,uC3,heart*0.85);
  }
  float diff=smoothstep(-0.04,0.25,ndl)*max(ndl*0.8+0.2,0.0);
  float dark=1.0-smoothstep(-0.15,0.08,ndl);
  vec3 col=albedo*(uAmbient+diff*1.05)+emissive*dark+vec3(spec)*step(0.0,ndl);
  gl_FragColor=vec4(col,1.0);
}`;

  // --- Atmosfera (guscio additivo) --------------------------------------------
  S.atmoVert = S.planetVert;
  S.atmoFrag = /* glsl */`
uniform vec3 uColor; uniform vec3 uSunDir; uniform float uStrength;
varying vec3 vN; varying vec3 vNW; varying vec3 vPosW; varying vec2 vUv;
#include <logdepthbuf_pars_fragment>
void main(){
  #include <logdepthbuf_fragment>
  vec3 nw=normalize(vNW); vec3 v=normalize(cameraPosition-vPosW);
  float rim=pow(1.0-max(dot(nw,v),0.0),3.0);
  float lit=smoothstep(-0.25,0.35,dot(nw,normalize(uSunDir)));
  gl_FragColor=vec4(uColor,rim*lit*uStrength);
}`;

  // --- Sole ------------------------------------------------------------------
  S.sunFrag = /* glsl */`
uniform float uTime; uniform vec3 uC1; uniform vec3 uC2;
varying vec3 vN; varying vec3 vNW; varying vec3 vPosW; varying vec2 vUv;
#include <logdepthbuf_pars_fragment>
${S.noise}
void main(){
  #include <logdepthbuf_fragment>
  vec3 n=normalize(vN); vec3 nw=normalize(vNW); vec3 v=normalize(cameraPosition-vPosW);
  float mu=max(dot(nw,v),0.0);
  float gran=fbm(n*28.0+vec3(uTime*0.05))*0.5+0.5;
  float spots=smoothstep(0.62,0.72,snoise(n*3.0+vec3(0.0,uTime*0.002,0.0)))*(1.0-smoothstep(0.35,0.55,abs(n.y)));
  vec3 col=mix(uC2,uC1,gran);
  col*=1.0-0.55*spots;
  col*=0.4+0.6*pow(mu,0.45); // oscuramento al bordo
  gl_FragColor=vec4(col*1.25,1.0);
}`;

  // --- Anelli planetari -------------------------------------------------------
  S.ringVert = /* glsl */`
varying vec3 vLocal; varying vec3 vPosW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vLocal=position; vec4 wp=modelMatrix*vec4(position,1.0); vPosW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp;
  #include <logdepthbuf_vertex>
}`;
  S.ringFrag = /* glsl */`
uniform int uRing; uniform vec3 uColor; uniform vec3 uSunDir; uniform vec3 uCenter; uniform float uR;
varying vec3 vLocal; varying vec3 vPosW;
#include <logdepthbuf_pars_fragment>
${S.noise}
float band(float r,float a,float b,float soft){ return smoothstep(a-soft,a+soft,r)*(1.0-smoothstep(b-soft,b+soft,r)); }
float line(float r,float r0,float w){ float fw=max(fwidth(r),1e-6); return 1.0-smoothstep(w,w+fw*1.5,abs(r-r0)); }
void main(){
  #include <logdepthbuf_fragment>
  float r=length(vLocal.xy); // km
  float o=0.0;
  if(uRing==0){ // Saturno
    float s=250.0; float stri=0.75+0.25*snoise(vec3(r*0.004,0.0,0.0))+0.12*snoise(vec3(r*0.03,1.0,0.0));
    o+=band(r,66900.0,74510.0,s)*0.05;
    o+=band(r,74658.0,92000.0,s)*0.22*stri;
    o+=band(r,92000.0,117580.0,s)*mix(0.55,0.95,smoothstep(92000.0,104000.0,r))*stri;
    o+=band(r,117580.0,122170.0,s)*0.08;
    o+=band(r,122170.0,136775.0,s)*0.62*stri*(1.0-band(r,133423.0,133745.0,40.0));
    o+=line(r,140180.0,60.0)*0.5;
  } else if(uRing==1){ // Urano
    o+=line(r,41837.0,15.0)*0.4+line(r,42234.0,15.0)*0.4+line(r,42571.0,15.0)*0.4+line(r,44718.0,20.0)*0.5
      +line(r,45661.0,20.0)*0.5+line(r,47176.0,15.0)*0.3+line(r,47627.0,15.0)*0.4+line(r,48300.0,20.0)*0.5+line(r,51149.0,60.0)*0.8;
  } else if(uRing==2){ // Nettuno
    o+=band(r,40900.0,42900.0,300.0)*0.05+line(r,53200.0,60.0)*0.25+band(r,53200.0,57200.0,300.0)*0.03+line(r,57200.0,40.0)*0.1+line(r,62932.0,40.0)*0.35;
  } else { // Giove
    o+=band(r,92000.0,122500.0,2000.0)*0.02+band(r,122500.0,129000.0,500.0)*0.08+band(r,129000.0,226000.0,3000.0)*0.015;
  }
  if(o<0.003) discard;
  vec3 p=vPosW-uCenter; vec3 sd=normalize(uSunDir);
  float along=dot(p,sd); float perp=length(p-along*sd);
  float shadow=(along<0.0&&perp<uR)?0.12:1.0;
  gl_FragColor=vec4(uColor*shadow,clamp(o,0.0,1.0));
}`;

  // --- Fondo cosmico a microonde (anisotropie sintetiche) ---------------------
  S.cmbVert = /* glsl */`
varying vec3 vDir;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  #include <logdepthbuf_vertex>
}`;
  S.cmbFrag = /* glsl */`
uniform float uOpacity; varying vec3 vDir;
#include <logdepthbuf_pars_fragment>
${S.noise}
vec3 cmap(float t){
  vec3 c0=vec3(0.03,0.08,0.45), c1=vec3(0.25,0.62,0.95), c2=vec3(0.95,0.92,0.80), c3=vec3(0.97,0.55,0.18), c4=vec3(0.62,0.08,0.08);
  if(t<0.25) return mix(c0,c1,t/0.25); if(t<0.5) return mix(c1,c2,(t-0.25)/0.25);
  if(t<0.75) return mix(c2,c3,(t-0.5)/0.25); return mix(c3,c4,(t-0.75)/0.25);
}
void main(){
  #include <logdepthbuf_fragment>
  vec3 d=normalize(vDir);
  float t=0.40*snoise(d*3.0)+0.30*snoise(d*9.0+2.0)+0.22*snoise(d*27.0+5.0)+0.16*snoise(d*70.0+9.0)+0.08*snoise(d*150.0);
  t=clamp(0.5+t*0.55,0.0,1.0);
  gl_FragColor=vec4(cmap(t),uOpacity);
}`;

  // --- Cintura kepleriana animata nel vertex shader ---------------------------
  // attributi: aOrb = (a [AU], e, i [rad]); aAng = (Ω, ω, M0) [rad]
  S.beltVert = /* glsl */`
attribute vec3 aOrb; attribute vec3 aAng; attribute float size; attribute vec3 color;
uniform float uDays; uniform float uScale; uniform float uMinPx; uniform float uMaxPx; uniform float uIntensity; uniform float uAnimate;
varying vec3 vColor; varying float vA;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  float a=aOrb.x, e=aOrb.y, inc=aOrb.z;
  float n=0.01720209895/pow(a,1.5); // rad/giorno
  float M=aAng.z+n*uDays*uAnimate;
  M=mod(M,6.2831853);
  float E=M; for(int k=0;k<6;k++){ E=E-(E-e*sin(E)-M)/(1.0-e*cos(E)); }
  float xp=a*(cos(E)-e), yp=a*sqrt(1.0-e*e)*sin(E);
  float cO=cos(aAng.x), sO=sin(aAng.x), cw=cos(aAng.y), sw=sin(aAng.y), ci=cos(inc), si=sin(inc);
  vec3 ecl=vec3((cw*cO-sw*sO*ci)*xp+(-sw*cO-cw*sO*ci)*yp,(cw*sO+sw*cO*ci)*xp+(-sw*sO+cw*cO*ci)*yp,(sw*si)*xp+(cw*si)*yp);
  vec4 mv=modelViewMatrix*vec4(ecl.x,ecl.z,-ecl.y,1.0);
  float d=max(-mv.z,1e-30); float px=size*uScale/d; float al=1.0;
  if(px<uMinPx){ al=sqrt(px/uMinPx); px=uMinPx; } px=min(px,uMaxPx);
  gl_PointSize=px; gl_Position=projectionMatrix*mv; vColor=color; vA=al*uIntensity;
  #include <logdepthbuf_vertex>
}`;
})(window.U);
