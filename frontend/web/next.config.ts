import type { NextConfig } from "next";

// En-têtes de sécurité sur toutes les pages. Pas de CSP "script-src" stricte
// (Next a besoin de scripts inline) : on bloque l'essentiel sans rien casser —
// pas d'iframe chez un tiers (clickjacking), pas de plugins, pas de <base>
// détourné, pas de sniffing de type MIME.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
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