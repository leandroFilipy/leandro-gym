# Modelo 3D do corpo (`public/models/body.glb`)

Gerado a partir do **BodyParts3D 4.3** (© Database Center for Life Science — DBCLS, licença
[CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/)), meshes obtidas de
<https://github.com/olivercase/body_parts_3d_api>. O modelo derivado (`body.glb`) segue a mesma licença.

- `groups.json`: arquivos FJ por grupo muscular do app (lado esquerdo = sufixo `M`). `NEUTRAL` = músculos sem
  grupo; `SKIN` = pele (desenhada como vidro). O BodyParts3D não tem grande dorsal nem reto abdominal.
- `build.mjs`: lê `obj/<GRUPO>__<arquivo>.obj`, simplifica (meshoptimizer), converte mm/Z-up → m/Y-up,
  põe os pés em y=0 e grava um GLB com compressão meshopt. Nome de cada nó: `<GRUPO>__<arquivo>`.

Para gerar de novo: baixe os `.obj` listados em `groups.json` para `obj/` (prefixando o grupo),
instale `meshoptimizer @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions` e rode
`node build.mjs body.glb`.
