import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const COLORS = { purple: 0x5f2ea8, deep: 0x392064, cream: 0xf4eee4, yellow: 0xede60f };
const VALID_MOODS = new Set(['neutral', 'happy', 'sad', 'celebrate']);

/** One small, movable WebGL companion. The host supplies its own width and height. */
export async function createCompanion(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(COLORS.deep, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 50);
  camera.position.set(0, 0.3, 9);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff7e8, 0x2e1651, 2.5));
  const key = new THREE.DirectionalLight(0xfff9ee, 3.4);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcaa4ff, 3.2);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(3, -1, 5);
  scene.add(fill);

  const materials = new Set();
  const material = (color, options = {}) => {
    const item = new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.02, ...options });
    materials.add(item);
    return item;
  };
  const violet = material(COLORS.purple);
  const cream = material(COLORS.cream, { roughness: 0.43 });
  const yellow = material(COLORS.yellow, { roughness: 0.3 });
  const deep = material(COLORS.deep);
  const owl = new THREE.Group();
  owl.rotation.y = -0.09;
  scene.add(owl);

  // A softly sculpted body supports the exact supplied Smartup face silhouette.
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const body = new THREE.Mesh(sphere, violet);
  body.position.set(0, -0.54, -0.1);
  body.scale.set(0.83, 0.94, 0.56);
  owl.add(body);
  const bib = new THREE.Mesh(sphere, cream);
  bib.position.set(0, -0.63, 0.31);
  bib.scale.set(0.52, 0.64, 0.25);
  owl.add(bib);
  const wings = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.69, -0.2, -0.04);
    const wing = new THREE.Mesh(sphere, violet);
    wing.position.set(side * 0.18, -0.35, 0);
    wing.scale.set(0.3, 0.69, 0.25);
    wing.rotation.z = side * 0.3;
    pivot.add(wing);
    owl.add(pivot);
    return pivot;
  });
  [-1, 1].forEach(side => {
    const foot = new THREE.Mesh(sphere, yellow);
    foot.position.set(side * 0.38, -1.39, 0.16);
    foot.scale.set(0.29, 0.13, 0.36);
    foot.rotation.y = side * 0.15;
    owl.add(foot);
  });

  const head = new THREE.Group();
  head.position.set(0, 0.53, 0.27);
  owl.add(head);
  const face = new THREE.Group();
  const eyePivots = [];
  let faceBounds;
  try {
    const response = await fetch('/assessment/owl-source.svg');
    if (!response.ok) throw new Error('The Smartup owl asset could not load.');
    const source = new SVGLoader().parse(await response.text());
    source.paths.forEach((path, index) => {
      const group = new THREE.Group();
      for (const shape of path.toShapes()) {
        if (index === 0) {
          const solid = shape.clone();
          solid.holes = [];
          const backing = new THREE.Mesh(new THREE.ExtrudeGeometry(solid, {
            depth: 15, bevelEnabled: true, bevelThickness: 5, bevelSize: 4, bevelSegments: 3, curveSegments: 18
          }), cream);
          backing.position.z = -12;
          face.add(backing);
        }
        const raised = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
          depth: index === 0 ? 18 : 7,
          bevelEnabled: true, bevelThickness: index === 0 ? 3 : 2,
          bevelSize: index === 0 ? 2 : 1.2, bevelSegments: 3, curveSegments: 18
        }), violet);
        raised.position.z = index === 0 ? 0 : 6;
        group.add(raised);
      }
      if (index === 1 || index === 2) {
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.children.forEach(mesh => { mesh.position.x -= center.x; mesh.position.y -= center.y; });
        group.position.set(center.x, center.y, 0);
        eyePivots.push(group);
      }
      face.add(group);
    });
    faceBounds = new THREE.Box3().setFromObject(face);
  } catch (error) {
    const allocated = new Set();
    scene.traverse(node => { if (node.geometry) allocated.add(node.geometry); });
    face.traverse(node => { if (node.geometry) allocated.add(node.geometry); });
    allocated.forEach(geometry => geometry.dispose());
    materials.forEach(item => item.dispose());
    renderer.dispose();
    throw error;
  }
  const center = faceBounds.getCenter(new THREE.Vector3());
  const scale = 2.46 / faceBounds.getSize(new THREE.Vector3()).x;
  face.position.set(-center.x, -center.y, 0);
  const faceScale = new THREE.Group();
  faceScale.scale.set(scale, -scale, scale);
  faceScale.add(face);
  head.add(faceScale);

  // Swap only the pupil shapes for expressive arcs: the supplied outer brand mark stays intact.
  const smileEyes = new THREE.Group();
  eyePivots.forEach(eye => {
    const cx = (eye.position.x - center.x) * scale;
    const cy = -(eye.position.y - center.y) * scale;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cx - 0.145, cy - 0.025, 0.145),
      new THREE.Vector3(cx, cy + 0.185, 0.145),
      new THREE.Vector3(cx + 0.145, cy - 0.025, 0.145)
    );
    smileEyes.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.032, 7, false), deep));
  });
  head.add(smileEyes);
  smileEyes.visible = false;

  const brows = new THREE.Group();
  eyePivots.forEach(eye => {
    const cx = (eye.position.x - center.x) * scale;
    const cy = -(eye.position.y - center.y) * scale;
    const towardCenter = cx < 0 ? 1 : -1;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(cx - 0.13, cy + 0.22 - towardCenter * 0.045, 0.15),
      new THREE.Vector3(cx, cy + 0.26, 0.15),
      new THREE.Vector3(cx + 0.13, cy + 0.22 + towardCenter * 0.045, 0.15)
    );
    brows.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.024, 6, false), deep));
  });
  head.add(brows);
  brows.visible = false;

  // A warm little smile appears for a correct answer; a wrong answer gets a kind head tilt.
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.15, -0.3, 0.22),
    new THREE.Vector3(0, -0.42, 0.22),
    new THREE.Vector3(0.15, -0.3, 0.22)
  );
  const smile = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 14, 0.024, 6, false), deep);
  head.add(smile);
  smile.visible = false;

  // Small brand-yellow glints appear only during celebration, with no particle system.
  const sparks = new THREE.Group();
  const sparkGeometry = new THREE.OctahedronGeometry(0.11);
  for (let i = 0; i < 5; i++) {
    const spark = new THREE.Mesh(sparkGeometry, yellow);
    spark.position.set(Math.cos(i * 1.35) * 1.47, Math.sin(i * 1.35) * 1.2 + 0.25, -0.1);
    sparks.add(spark);
  }
  scene.add(sparks);
  sparks.visible = false;

  // Transparent radial grounding shadow. It remains legible on both cream and purple.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(37,15,68,.3)');
  gradient.addColorStop(1, 'rgba(37,15,68,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  materials.add(shadowMaterial);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.56), shadowMaterial);
  shadow.position.set(0, -1.48, -0.5);
  scene.add(shadow);

  let mood = 'neutral';
  let moodStarted = performance.now();
  let paused = false;
  let visible = true;
  let destroyed = false;
  let failed = false;
  let frame = 0;
  let lastTime = 0;

  function pose(time) {
    const moving = !paused && !reduced.matches;
    const seconds = (time - moodStarted) / 1000;
    const joyful = mood === 'happy' || mood === 'celebrate';
    const sad = mood === 'sad';
    smileEyes.visible = joyful;
    smile.visible = joyful;
    brows.visible = sad;
    eyePivots.forEach(eye => {
      eye.visible = !joyful;
      eye.scale.y = sad ? 0.72 : 1;
      // An occasional soft blink, disabled together with all ambient motion.
      if (moving && mood === 'neutral') {
        const phase = (time % 6400) / 6400;
        if (phase > 0.968) eye.scale.y = 0.1 + 0.9 * Math.abs(phase - 0.984) / 0.016;
      }
    });
    const hop = joyful && moving && seconds < 0.85 ? Math.sin(Math.min(seconds / 0.85, 1) * Math.PI) * 0.36 : 0;
    const bob = moving ? Math.sin(time * 0.0019) * 0.032 : 0;
    owl.position.y = hop + bob;
    owl.rotation.z = sad ? 0.1 : joyful && moving ? Math.sin(seconds * 7) * Math.max(0, 1 - seconds / 1.2) * 0.055 : 0;
    head.rotation.z = sad ? -0.15 : moving ? Math.sin(time * 0.0009) * 0.018 : 0;
    head.rotation.y = sad ? -0.1 : 0;
    const flap = joyful ? (moving ? Math.sin(seconds * 8) * Math.exp(-seconds * 1.5) : 0.2) : 0;
    wings.forEach((wing, index) => {
      const side = index === 0 ? -1 : 1;
      wing.rotation.z = side * (joyful ? 0.58 + flap * 0.35 : sad ? -0.13 : 0.06);
    });
    const stretch = hop * 0.12;
    owl.scale.set(1 - stretch * 0.5, 1 + stretch, 1);
    shadow.scale.setScalar(1 - hop * 0.18);
    shadow.material.opacity = 1 - hop * 0.8;
    sparks.visible = mood === 'celebrate';
    sparks.children.forEach((spark, index) => {
      spark.rotation.z = moving ? time * 0.0008 + index : index;
      spark.scale.setScalar(moving ? 0.85 + Math.sin(seconds * 3 + index) * 0.2 : 0.85);
    });
  }

  function renderOnce(time = performance.now()) {
    if (destroyed || failed || !host.clientWidth || !host.clientHeight) return;
    pose(time);
    renderer.render(scene, camera);
  }
  function animate(time) {
    frame = 0;
    if (!shouldAnimate()) return;
    // Cap ambient rendering at 30 fps; a single small renderer serves the whole journey.
    if (time - lastTime >= 1000 / 30) { renderOnce(time); lastTime = time; }
    frame = requestAnimationFrame(animate);
  }
  function shouldAnimate() { return !destroyed && !failed && visible && !document.hidden && !paused && !reduced.matches; }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (visible && !document.hidden) renderOnce();
    if (shouldAnimate()) frame = requestAnimationFrame(animate);
  }
  function resize() {
    if (destroyed || failed) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = Math.max(1.95, 1.72 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    schedule();
  }
  function contextLost(event) {
    event.preventDefault();
    failed = true;
    host.dataset.failed = 'true';
    host.classList.add('companion-failed');
    renderer.domElement.hidden = true;
    renderer.domElement.style.display = 'none';
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    schedule();
  }, { rootMargin: '100px' });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  host.append(renderer.domElement);
  host.dataset.mood = mood;
  host.dataset.failed = 'false';
  host.classList.remove('companion-failed');
  resizeObserver.observe(host);
  intersectionObserver.observe(host);
  resize();

  return {
    setMood(value) {
      const next = VALID_MOODS.has(value) ? value : 'neutral';
      mood = next;
      moodStarted = performance.now();
      host.dataset.mood = mood;
      schedule();
    },
    setPaused(value) { paused = Boolean(value); schedule(); },
    dispose() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      reduced.removeEventListener('change', schedule);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set();
      scene.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(item => item.dispose());
      shadowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
