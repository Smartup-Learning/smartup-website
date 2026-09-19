import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
const cream=0xf4eee4, purple=0x5f2ea8, deep=0x392064, yellow=0xede60f;
export async function createWorld(host,onInspect){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(deep,0);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,4,-4,.1,100);
 camera.position.set(1.6,8,17);camera.lookAt(0,1,0);
 scene.add(new THREE.HemisphereLight(cream,0x271042,2.4));
 const light=new THREE.DirectionalLight(0xffffff,3.6);light.position.set(-5,12,8);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-12;light.shadow.camera.right=12;light.shadow.camera.top=10;light.shadow.camera.bottom=-10;light.shadow.normalBias=.04;scene.add(light);
 const rim=new THREE.DirectionalLight(0xc8a5ff,2.5);rim.position.set(8,4,-5);scene.add(rim);
 const world=new THREE.Group();scene.add(world);
 const positions=[[-5,.05,1.6],[-3.15,.35,-.8],[-1.45,.65,1.05],[.35,.95,-1.4],[2.2,1.25,.65],[3.95,1.55,-1.8],[5.65,1.85,-.05]].map(v=>new THREE.Vector3(...v));
 const platforms=[],targets=[],connectors=[],textures=[];
 const geometry=new THREE.CylinderGeometry(.83,.93,.48,64),capGeometry=new THREE.CylinderGeometry(.81,.81,.1,64);
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.1});
 function numberTexture(label){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#392064';ctx.font='600 68px Rubik, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,64,66);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);return texture;}
 positions.forEach((p,i)=>{
  const group=new THREE.Group();group.position.copy(p);
  const base=new THREE.Mesh(geometry,material(purple));base.castShadow=true;base.receiveShadow=true;group.add(base);
  const cap=new THREE.Mesh(capGeometry,material(i===0?yellow:cream));cap.position.y=.29;cap.receiveShadow=true;group.add(cap);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.74,.74),new THREE.MeshBasicMaterial({map:numberTexture(i===0?'F':String(i+4)),transparent:true,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(0,.345,.05);group.add(label);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.02,.045,8,64),material(yellow));ring.rotation.x=Math.PI/2;ring.position.y=.27;ring.visible=i===0;group.add(ring);
  group.userData={index:i,cap,base,ring};cap.userData.index=i;targets.push(cap);platforms.push(group);world.add(group);
  if(i){const previous=positions[i-1];const curve=new THREE.CatmullRomCurve3([previous.clone(),previous.clone().lerp(p,.5).add(new THREE.Vector3(0,-.1,0)),p.clone()]);const connection=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.035,8,false),material(0xb19ac9));connection.userData.destination=i;connectors.push(connection);world.add(connection);}
 });
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(28,18),new THREE.ShadowMaterial({opacity:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-.9;floor.receiveShadow=true;world.add(floor);
 const owl=new THREE.Group();world.add(owl);
 const response=await fetch('/assessment/owl-source.svg');if(!response.ok)throw new Error('Owl asset unavailable');
 const data=new SVGLoader().parse(await response.text()),faceGroup=new THREE.Group();
 data.paths.forEach((path,i)=>{path.toShapes().forEach(shape=>{
  if(i===0){const backing=shape.clone();backing.holes=[];const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(backing,{depth:10,bevelEnabled:true,bevelThickness:3,bevelSize:3,bevelSegments:3,curveSegments:24}),material(cream));mesh.position.z=-9;faceGroup.add(mesh);}
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:14,bevelEnabled:true,bevelThickness:2,bevelSize:1.5,bevelSegments:3,curveSegments:24}),material(purple));mesh.castShadow=true;faceGroup.add(mesh);
 });});
 const bounds=new THREE.Box3().setFromObject(faceGroup),center=bounds.getCenter(new THREE.Vector3());faceGroup.position.set(-center.x,-center.y,0);
 const scaled=new THREE.Group();scaled.add(faceGroup);const scale=2.25/bounds.getSize(new THREE.Vector3()).x;scaled.scale.set(scale,-scale,scale);owl.add(scaled);owl.rotation.y=.18;
 // Five floating tokens represent the five correct answers needed at the active node.
 const tokens=new THREE.Group();world.add(tokens);const tokenMeshes=[];
 for(let i=0;i<5;i++){const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.1,0),material(cream));mesh.position.set((i-2)*.33,0,0);tokens.add(mesh);tokenMeshes.push(mesh);}
 let active=0,ceiling=6,correct=0,startPosition=positions[0].clone(),goalPosition=positions[0].clone(),travelStarted=0,moving=false,celebration=0;
 owl.position.copy(goalPosition).add(new THREE.Vector3(0,1.62,0));
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerX=0,pointerY=0,paused=false,frame;
 function resize(){const w=host.clientWidth,h=host.clientHeight,aspect=w/h;renderer.setSize(w,h);const halfHeight=Math.max(3.2,(positions[ceiling].x-positions[0].x+3.6)/2/aspect);world.position.x=-(positions[ceiling].x+positions[0].x)/2;camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 host.addEventListener('pointermove',event=>{const b=host.getBoundingClientRect();pointerX=(event.clientX-b.left)/b.width-.5;pointerY=(event.clientY-b.top)/b.height-.5;});
 host.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
 host.addEventListener('click',event=>{const b=host.getBoundingClientRect();pointer.set((event.clientX-b.left)/b.width*2-1,-(event.clientY-b.top)/b.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(targets).find(hit=>hit.object.parent.visible);if(hit)onInspect?.(hit.object.userData.index);});
 function animate(time){
  frame=requestAnimationFrame(animate);if(document.hidden)return;const motion=!reduced.matches&&!paused;
  world.rotation.y=motion?THREE.MathUtils.lerp(world.rotation.y,pointerX*.1,.035):0;world.rotation.x=motion?THREE.MathUtils.lerp(world.rotation.x,pointerY*.04,.035):0;
  if(moving){const t=motion?Math.min(1,(time-travelStarted)/1000):1,eased=1-Math.pow(1-t,3);owl.position.copy(startPosition).lerp(goalPosition,eased);owl.position.y+=1.62+Math.sin(t*Math.PI)*1.2;if(t===1)moving=false;}
  else{owl.position.copy(goalPosition);owl.position.y+=1.62+(motion?Math.sin(time*.0018)*.07:0);}
  const pop=motion?Math.max(0,1-(time-celebration)/650):0;owl.scale.setScalar(1+Math.sin(pop*Math.PI)*.08);
  tokens.position.copy(owl.position).add(new THREE.Vector3(0,1.22,0));tokenMeshes.forEach((mesh,i)=>{mesh.material.color.setHex(i<correct?yellow:0x9672bd);mesh.rotation.y=motion?time*.0015:0;mesh.scale.setScalar(i<correct?1.3:1);});
  platforms.forEach((p,i)=>{p.userData.ring.visible=i===active;p.userData.ring.scale.setScalar(motion?1+Math.sin(time*.003)*.03:1);});renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(animate);
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);host.dataset.failed='true';});
 return{
  update(index,total,complete=false,levelCorrect=0){const changed=index!==active;active=index;ceiling=total-1;correct=levelCorrect;resize();platforms.forEach((p,i)=>{p.visible=i<=ceiling;p.userData.cap.material.color.setHex(i<=index||complete?yellow:cream);p.userData.base.material.color.setHex(i>index?0x77569d:purple);});connectors.forEach(c=>{c.visible=c.userData.destination<=ceiling;c.material.color.setHex(c.userData.destination<=index?yellow:0xb19ac9);});if(changed){startPosition.copy(owl.position).sub(new THREE.Vector3(0,1.62,0));goalPosition.copy(positions[index]);travelStarted=performance.now();moving=true;}},
  celebrate(){celebration=performance.now();},setPaused(value){paused=value;},
  dispose(){cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();textures.forEach(t=>t.dispose());scene.traverse(o=>{o.geometry?.dispose();if(o.material)Array.isArray(o.material)?o.material.forEach(m=>m.dispose()):o.material.dispose();});}
 };
}
