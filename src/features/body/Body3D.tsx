"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { MapLevel } from "@/lib/domain/muscle-map";
import type { MuscleGroup } from "@/generated/prisma/enums";

// Modelo gerado de BodyParts3D (© DBCLS, CC BY-SA 2.1 JP): um mesh por músculo, nomeado pelo grupo
// do app (CHEST, BACK…), mais NEUTRAL (músculos sem grupo) e SKIN (pele, desenhada como vidro).
const MODEL_URL = "/models/body.glb";

interface Props {
  levels: Partial<Record<MuscleGroup, MapLevel>>;
  selected: MuscleGroup | null;
  onSelect: (group: MuscleGroup) => void;
}

/** Cores do tema lidas do CSS (funciona no claro e no escuro). */
function themeColors() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => new THREE.Color(css.getPropertyValue(name).trim() || fallback);
  const accent = read("--color-accent", "#ff5b14");
  const surface = read("--color-surface", "#161614");
  const fg = read("--color-fg", "#f3f0e8");
  const mix = (a: THREE.Color, t: number) => surface.clone().lerp(a, t);
  return {
    level: { 0: mix(fg, 0.22), 1: mix(accent, 0.54), 2: mix(accent, 0.845), 3: accent.clone() } as Record<MapLevel, THREE.Color>,
    neutral: mix(fg, 0.16),
    skin: fg,
    select: fg,
  };
}

const isGroup = (name: string): name is MuscleGroup => name !== "NEUTRAL" && name !== "SKIN";

/** Corpo 3D que gira com o dedo; toque num músculo seleciona o grupo. */
export default function Body3D({ levels, selected, onSelect }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{ paint: (levels: Props["levels"], selected: MuscleGroup | null) => void } | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const colors = themeColors();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.05, 20);
    camera.position.set(0, 0.95, 3.6);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.5, 2.5, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(-2, 1.5, -2.5);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.92, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 5;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI - 0.35;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.addEventListener("start", () => (controls.autoRotate = false));
    controls.update();

    const muscles: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
    const material = (color: THREE.Color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });

    api.current = {
      paint(lv, sel) {
        for (const m of muscles) {
          const g = m.name as MuscleGroup;
          const level = lv[g] ?? 0;
          m.material.color.copy(colors.level[level]);
          m.material.emissive.copy(sel === g ? colors.select : level === 3 ? colors.level[3] : new THREE.Color(0));
          m.material.emissiveIntensity = sel === g ? 0.1 : level === 3 ? 0.25 : 0;
        }
      },
    };

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    let disposed = false;
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        gltf.scene.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          // Nome do nó = "<GRUPO>__<arquivo original>".
          const group = obj.name.split("__")[0];
          obj.geometry.computeVertexNormals();
          if (group === "SKIN") {
            obj.material = new THREE.MeshStandardMaterial({ color: colors.skin, transparent: true, opacity: 0.08, depthWrite: false, roughness: 0.3 });
            obj.renderOrder = 2;
          } else if (group === "NEUTRAL") {
            obj.material = material(colors.neutral);
          } else {
            obj.material = material(colors.level[0]);
            obj.name = group;
            muscles.push(obj as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
          }
        });
        scene.add(gltf.scene);
        setStatus("ready");
      },
      undefined,
      () => setStatus("error"),
    );

    // Toque/clique (sem arrastar) seleciona o músculo.
    const raycaster = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(muscles, false)[0];
      if (hit && isGroup(hit.object.name)) onSelectRef.current(hit.object.name);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    });
    resize.observe(el);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m: THREE.Material) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    if (status === "ready") api.current?.paint(levels, selected);
  }, [levels, selected, status]);

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm touch-none">
      <div ref={mount} className="size-full" />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Carregando corpo 3D…
            </span>
          ) : (
            "Não foi possível carregar o 3D."
          )}
        </div>
      )}
    </div>
  );
}
