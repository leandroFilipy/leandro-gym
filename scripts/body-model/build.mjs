// OBJ do BodyParts3D → GLB único, simplificado e comprimido (meshopt), um mesh por arquivo.
// Nome do mesh = grupo do app (CHEST, BACK…), NEUTRAL ou SKIN.
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { MeshoptSimplifier, MeshoptEncoder } from "meshoptimizer";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, weld, dedup } from "@gltf-transform/functions";

await MeshoptSimplifier.ready;
await MeshoptEncoder.ready;

const OUT = process.argv[2];
// Fração de triângulos mantida (a pele é bem mais densa que os músculos).
const RATIO = { SKIN: 0.06, NEUTRAL: 0.25, DEFAULT: 0.3 };
const MAX_ERR = 0.01;

function parseObj(text) {
  const pos = [];
  const idx = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      pos.push(x, y, z);
    } else if (line.startsWith("f ")) {
      const f = line.trim().split(/\s+/).slice(1).map((t) => Number(t.split("/")[0]) - 1);
      for (let i = 1; i < f.length - 1; i++) idx.push(f[0], f[i], f[i + 1]);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

const files = readdirSync("obj").filter((f) => f.endsWith(".obj"));
const meshes = [];
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];

for (const f of files) {
  const group = f.split("__")[0];
  const { pos, idx } = parseObj(readFileSync(`obj/${f}`, "utf8"));
  const ratio = RATIO[group] ?? RATIO.DEFAULT;
  const target = Math.max(300, Math.floor((idx.length * ratio) / 3) * 3);
  const [simple] = MeshoptSimplifier.simplify(idx, pos, 3, target, MAX_ERR, ["LockBorder"]);
  // Compacta vértices usados.
  const remap = new Map();
  const outPos = [];
  const outIdx = new Uint32Array(simple.length);
  for (let i = 0; i < simple.length; i++) {
    const v = simple[i];
    let n = remap.get(v);
    if (n === undefined) {
      n = remap.size;
      remap.set(v, n);
      // BodyParts3D: mm, Z para cima → Y para cima, metros.
      const x = pos[v * 3] / 1000, y = pos[v * 3 + 2] / 1000, z = -pos[v * 3 + 1] / 1000;
      outPos.push(x, y, z);
      min = [Math.min(min[0], x), Math.min(min[1], y), Math.min(min[2], z)];
      max = [Math.max(max[0], x), Math.max(max[1], y), Math.max(max[2], z)];
    }
    outIdx[i] = n;
  }
  meshes.push({ group, name: f.replace(/\.obj$/, ""), pos: new Float32Array(outPos), idx: outIdx, before: idx.length / 3, after: simple.length / 3 });
}

// Centraliza: pés no y=0, eixo do corpo em x=z=0.
const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, y0 = min[1];

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("body");
for (const m of meshes) {
  for (let i = 0; i < m.pos.length; i += 3) {
    m.pos[i] -= cx;
    m.pos[i + 1] -= y0;
    m.pos[i + 2] -= cz;
  }
  const position = doc.createAccessor().setType("VEC3").setArray(m.pos).setBuffer(buffer);
  const indices = doc.createAccessor().setType("SCALAR").setArray(m.idx).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute("POSITION", position).setIndices(indices);
  const mesh = doc.createMesh(m.group).addPrimitive(prim);
  scene.addChild(doc.createNode(m.name).setMesh(mesh));
}

doc.createExtension(KHRMeshQuantization).setRequired(true);
await doc.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
writeFileSync(OUT, await io.writeBinary(doc));

const tris = meshes.reduce((a, m) => [a[0] + m.before, a[1] + m.after], [0, 0]);
console.log(`meshes ${meshes.length} · triângulos ${tris[0]} → ${tris[1]} · altura ${(max[1] - min[1]).toFixed(2)} m · ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
