import Image from "next/image";
import { Heart } from "lucide-react";

export default function WeddingBanner() {
  return (
    <div className="relative mx-4 my-3 overflow-hidden rounded-xl2 border border-pink-900/30">
      <div className="relative h-72 w-full">
        <Image
          src="/couple-photo.jpg"
          alt="Luca e Roberta"
          fill
          className="object-cover"
          style={{
            objectPosition: "50% 32%",
            filter: "brightness(1.45) contrast(1.05) saturate(1.1)",
          }}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-pink-200">
          <Heart size={12} className="fill-pink-300 text-pink-300" />
          Rumo ao casamento
        </p>
        <p className="mt-1 text-sm text-white/90">
          Um dia de cada vez, juntos.
        </p>
      </div>
    </div>
  );
}
