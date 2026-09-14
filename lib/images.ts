export async function prepareImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  if (file.size > 20 * 1024 * 1024)
    throw new Error("A foto deve ter até 20 MB antes da redução.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a foto.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Não foi possível preparar a foto.")),
        "image/jpeg",
        0.82,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Escolha uma foto menor. O limite é 5 MB.");
    return new File([blob], "checkin.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
