import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["xperiment.tail2dc953.ts.net"],
  images: {
    // Depuis qu'on a retiré Supabase Storage (compte perdu), les cover_url
    // d'events/séries/bingo viennent d'une URL libre collée par un admin
    // (voir ImageUpload.tsx) — impossible de whitelister un hostname
    // précis à l'avance. On accepte tout HTTPS ; le risque est limité
    // puisque seuls les admins peuvent définir ces URLs, pas n'importe
    // quel visiteur.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;