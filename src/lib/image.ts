// Compressão de imagens no navegador (canvas → JPEG data URL). Só usar em componentes cliente.

const MAX_FILE_BYTES = 12 * 1024 * 1024;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function render(image: HTMLImageElement, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a foto");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export interface CompactOptions {
  maxSide: number;
  quality?: number;
  /** Tamanho máximo do data URL; reduz a qualidade até caber. */
  maxChars?: number;
}

/** Reduz um arquivo de imagem para uma ou mais resoluções (uma leitura só do arquivo). */
export async function compactImageSizes(file: File, sizes: CompactOptions[]): Promise<string[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Escolha uma foto de até 12 MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl).catch(() => {
      throw new Error("Formato de imagem não suportado");
    });
    return sizes.map(({ maxSide, quality = 0.78, maxChars }) => {
      let q = quality;
      let out = render(image, maxSide, q);
      while (maxChars && out.length > maxChars && q > 0.4) {
        q -= 0.1;
        out = render(image, maxSide, q);
      }
      return out;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function compactImage(file: File, maxSide = 720, quality = 0.78): Promise<string> {
  const [out] = await compactImageSizes(file, [{ maxSide, quality }]);
  return out;
}
