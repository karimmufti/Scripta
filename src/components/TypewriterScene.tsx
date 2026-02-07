import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom, BrightnessContrast, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

useGLTF.preload('/models/typewriter.glb');

type TypewriterSceneProps = {
  lines: string[];
  cursorVisible: boolean;
  debug?: boolean;
};

// --- Scene constants ---
const PAPER_POS: [number, number, number] = [0, 0.48, 0.32];
const PAPER_ROT: [number, number, number] = [-0.1, 0, 0];
const PAPER_W = 0.50;
const PAPER_H = 0.38;
const INK_W = 0.46;
const INK_H = 0.34;

function seeded01(seed: number) {
  const x = Math.sin(seed * 999.123) * 43758.5453123;
  return x - Math.floor(x);
}

function createCanvasAndTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 778;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return { canvas, texture };
}

function drawTypewriterText(params: {
  canvas: HTMLCanvasElement;
  lines: string[];
  cursorVisible: boolean;
}) {
  const { canvas, lines, cursorVisible } = params;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const marginX = 56;
  const marginY = 48;
  const fontSize = 24;
  const lineHeight = 32;

  ctx.font = `${fontSize}px Courier New, Courier, monospace`;
  const charWidth = ctx.measureText('M').width;

  const hasContent = lines.some((l) => l.length > 0);

  // --- Placeholder when empty ---
  if (!hasContent) {
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = `${fontSize}px Courier New, Courier, monospace`;
    ctx.fillStyle = '#0a0604';

    ctx.globalAlpha = 0.45;
    ctx.fillText('Example:', marginX, marginY);
    ctx.globalAlpha = 0.38;
    ctx.fillText("SARAH: I can't believe you're actually leaving.", marginX, marginY + lineHeight + 4);
    ctx.fillText('', marginX, marginY + lineHeight * 2 + 8);
    ctx.fillText('MICHAEL: I have to. You know I have to.', marginX, marginY + lineHeight * 3 + 12);

    if (cursorVisible) {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(marginX, marginY + 4, 2, fontSize);
    }

    ctx.restore();
    return;
  }

  // --- Typed text with ink imperfections ---
  ctx.save();
  ctx.font = `${fontSize}px Courier New, Courier, monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#0a0604';

  const maxCharsPerLine = Math.floor((canvas.width - marginX * 2) / charWidth);
  const visibleLines = Math.floor((canvas.height - marginY * 2) / lineHeight);
  const startLine = Math.max(0, lines.length - visibleLines);
  const renderLines = lines.slice(startLine);

  for (let row = 0; row < renderLines.length; row++) {
    const y = marginY + row * lineHeight;
    const text = renderLines[row] ?? '';

    for (let col = 0; col < text.length; col++) {
      const ch = text[col];
      const seed = (startLine + row) * 1000 + col * 13;
      const jx = (seeded01(seed) - 0.5) * 0.5;
      const jy = (seeded01(seed + 1) - 0.5) * 0.5;
      const a = 0.92 + seeded01(seed + 2) * 0.08;

      ctx.globalAlpha = a;
      ctx.fillText(ch, marginX + col * charWidth + jx, y + jy);
    }
  }

  // Cursor
  if (cursorVisible) {
    const lastRow = Math.max(0, renderLines.length - 1);
    const lastLine = renderLines[lastRow] ?? '';
    const cursorCol = Math.min(lastLine.length, maxCharsPerLine - 1);

    ctx.globalAlpha = 0.75;
    ctx.fillRect(marginX + cursorCol * charWidth + 1, marginY + lastRow * lineHeight + 4, 2, fontSize);
  }

  ctx.restore();
}

// --- Camera: centered on typewriter with subtle drift ---
function CameraRig() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.set(
      Math.sin(t * 0.13) * 0.012,
      0.58 + Math.sin(t * 0.09) * 0.004,
      1.50 + Math.cos(t * 0.11) * 0.006,
    );
    camera.lookAt(0, 0.28, 0.05);
  });

  return null;
}

// --- Upgrade materials for cinematic PBR: dark enamel body + chrome highlights ---
function MaterialUpgrade() {
  const { scene } = useThree();

  useEffect(() => {
    scene.traverse((obj: any) => {
      if (!obj?.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m: any) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.envMapIntensity = 0.35;

          // Detect shiny / chrome-like parts by high metalness or light color
          const lum = m.color ? m.color.r * 0.299 + m.color.g * 0.587 + m.color.b * 0.114 : 0.5;
          if (m.metalness > 0.5 || lum > 0.6) {
            // Chrome / brass accents
            m.roughness = Math.min(m.roughness, 0.25);
            m.metalness = Math.max(m.metalness, 0.85);
            m.envMapIntensity = 0.6;
          } else {
            // Dark enamel body
            m.roughness = Math.max(m.roughness, 0.55);
            m.metalness = Math.max(m.metalness, 0.15);
          }
          m.needsUpdate = true;
        }
      });
    });
  }, [scene]);

  return null;
}

// --- Typewriter GLB model with logging ---
function TypewriterModel() {
  const gltf = useGLTF('/models/typewriter.glb') as any;

  useEffect(() => {
    if (gltf?.scene) {
      console.log('[TypewriterScene] Model loaded');
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('[TypewriterScene] bbox size:', size);
      console.log('[TypewriterScene] bbox min:', box.min, 'max:', box.max);
    } else {
      console.warn('[TypewriterScene] Model failed to load or is empty');
    }
  }, [gltf]);

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    cloned.traverse((obj: any) => {
      if (!obj.isMesh) return;

      obj.castShadow = true;
      obj.receiveShadow = true;

      const material = obj.material;
      if (Array.isArray(material)) {
        obj.material = material.map((m: any) => {
          if (m instanceof THREE.MeshStandardMaterial) return m;
          return new THREE.MeshStandardMaterial({
            map: m.map ?? null,
            normalMap: m.normalMap ?? null,
            roughnessMap: m.roughnessMap ?? null,
            metalnessMap: m.metalnessMap ?? null,
            color: m.color?.clone?.() ?? new THREE.Color('#1e1e24'),
            roughness: 0.65,
            metalness: 0.2,
          });
        });
        return;
      }

      if (material && material instanceof THREE.MeshStandardMaterial) return;
      obj.material = new THREE.MeshStandardMaterial({
        map: material?.map ?? null,
        normalMap: material?.normalMap ?? null,
        roughnessMap: material?.roughnessMap ?? null,
        metalnessMap: material?.metalnessMap ?? null,
        color: material?.color?.clone?.() ?? new THREE.Color('#1e1e24'),
        roughness: 0.65,
        metalness: 0.2,
      });
    });

    return cloned;
  }, [gltf.scene]);

  return (
    <primitive
      object={scene}
      position={[0, 0.0, 0.15]}
      rotation={[0, 0, 0]}
      scale={1.55}
    />
  );
}

// --- Desk surface + realistically-sized paper + ink text ---
function DeskAndPaper({ lines, cursorVisible }: { lines: string[]; cursorVisible: boolean }) {
  const paperBase = useTexture('/textures/paper_basecolor.jpg');
  const deskNormal = useTexture('/textures/desk_normal.jpg');

  const [deskBase, setDeskBase] = useState<THREE.Texture | null>(null);
  const [paperNormal, setPaperNormal] = useState<THREE.Texture | null>(null);

  const { canvas, texture } = useMemo(() => createCanvasAndTexture(), []);
  const paperGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    paperBase.colorSpace = THREE.SRGBColorSpace;
    paperBase.needsUpdate = true;
  }, [paperBase]);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const tryLoad = (url: string) =>
      new Promise<THREE.Texture | null>((resolve) => {
        loader.load(url, resolve, undefined, () => resolve(null));
      });

    void (async () => {
      const [pn, db] = await Promise.all([
        tryLoad('/textures/paper_normal.jpg'),
        tryLoad('/textures/desk_basecolor.jpg'),
      ]);
      if (cancelled) return;
      if (pn) { pn.colorSpace = THREE.NoColorSpace; setPaperNormal(pn); }
      if (db) { db.colorSpace = THREE.SRGBColorSpace; setDeskBase(db); }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    drawTypewriterText({ canvas, lines, cursorVisible });
    texture.needsUpdate = true;
  }, [canvas, cursorVisible, lines, texture]);

  // Subtle paper breathing
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!paperGroupRef.current) return;
    paperGroupRef.current.position.y = PAPER_POS[1] + Math.sin(t * 0.45) * 0.001;
    paperGroupRef.current.rotation.x = PAPER_ROT[0] + Math.sin(t * 0.35) * 0.0005;
  });

  return (
    <group>
      {/* Desk surface — warm dark wood */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[8, 8, 1, 1]} />
        <meshStandardMaterial
          color={'#2a1610'}
          roughness={0.82}
          metalness={0.04}
          map={deskBase ?? undefined}
          normalMap={deskNormal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
        />
      </mesh>

      {/* Paper + ink */}
      <group ref={paperGroupRef} position={PAPER_POS} rotation={PAPER_ROT}>
        <mesh receiveShadow castShadow>
          <planeGeometry args={[PAPER_W, PAPER_H, 16, 16]} />
          <meshStandardMaterial
            map={paperBase}
            normalMap={paperNormal ?? undefined}
            roughness={0.92}
            metalness={0}
            color={'#f0e4d8'}
          />
        </mesh>

        {/* Ink text overlay */}
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[INK_W, INK_H, 1, 1]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

// --- Debug helpers: axes + bounding boxes ---
function DebugHelpers() {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = groupRef.current;

    // Slight delay to ensure model is loaded
    const timer = setTimeout(() => {
      scene.traverse((obj: any) => {
        if (obj.isMesh) {
          const box = new THREE.BoxHelper(obj, 0x00ff00);
          g.add(box);
        }
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      while (g.children.length) {
        const child = g.children[0];
        g.remove(child);
        if ((child as any).dispose) (child as any).dispose();
      }
    };
  }, [scene]);

  return (
    <group ref={groupRef}>
      <axesHelper args={[2]} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh position={[0, 0.25, 0.15]}>
      <boxGeometry args={[0.6, 0.3, 0.4]} />
      <meshStandardMaterial color="#555" wireframe />
    </mesh>
  );
}

// --- Configure renderer for cinematic look ---
function RendererConfig() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  return null;
}

export function TypewriterScene({ lines, cursorVisible, debug = false }: TypewriterSceneProps) {
  return (
    <div className="cinema-canvas">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ fov: 42, position: [0, 0.58, 1.50], near: 0.01, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <RendererConfig />

        <CameraRig />

        {/* === CINEMATIC DESK LAMP LIGHTING === */}

        {/* Key light: warm desk lamp from upper-left, dominant */}
        <spotLight
          position={[-1.2, 2.2, 1.5]}
          angle={0.45}
          penumbra={0.85}
          intensity={5.0}
          color={'#ffcb8e'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0003}
          shadow-normalBias={0.02}
          shadow-radius={4}
        />

        {/* Secondary warm spot from upper-right, softer */}
        <spotLight
          position={[1.0, 1.8, 1.2]}
          angle={0.55}
          penumbra={0.9}
          intensity={1.5}
          color={'#ffe4c4'}
          castShadow={false}
        />

        {/* Cool fill from right — keeps details visible without washing out */}
        <directionalLight position={[2.5, 1.0, 1.0]} intensity={0.25} color={'#b8c4e8'} />

        {/* Rim/back light — separates silhouette from background */}
        <spotLight
          position={[0.0, 1.5, -1.8]}
          angle={0.6}
          penumbra={0.8}
          intensity={2.0}
          color={'#ff9966'}
          castShadow={false}
        />

        {/* Subtle under-fill so the front of the typewriter isn't pitch black */}
        <pointLight position={[0, 0.3, 1.5]} intensity={0.6} color={'#ffe8d0'} distance={3} decay={2} />

        {/* Warm ambient — lifts overall brightness */}
        <ambientLight intensity={0.25} color={'#ffeedd'} />

        {/* Subtle environment reflections for metal/chrome */}
        <Environment preset="city" />
        <MaterialUpgrade />

        <DeskAndPaper lines={lines} cursorVisible={cursorVisible} />
        <Suspense fallback={<LoadingFallback />}>
          <TypewriterModel />
        </Suspense>

        {debug && <DebugHelpers />}

        {/* === CINEMATIC POST-PROCESSING === */}
        <EffectComposer multisampling={0} autoClear={false}>
          <Bloom
            intensity={0.25}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <BrightnessContrast brightness={-0.02} contrast={0.12} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
