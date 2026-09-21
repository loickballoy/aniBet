export type Market = {
    id: string
    question: string
    imageUrl?: string
    category?: string
    yesPct: number // 0..100
    volumeText?: string // ex: "12k AniCoins pariés"
    endDateText?: string // optionnel
    featured?: boolean
    outcomes?: { id: number; label: string; poolPoints: number }[]
  }
  
  // NOTE: ceci était rempli avec des données de démo type Polymarket (dont un
  // marché sur un discours politique réel) — retiré : hors-sujet pour aniBet
  // (100% anime/manga) et problématique à afficher tel quel en prod.
  // Remplacer ces IDs par de vrais events dès que l'API events est branchée
  // côté frontend.
  export const featuredMarkets: Market[] = [
    {
      id: "1",
      question: "One Piece : un Mugiwara va mourir avant la fin ?",
      imageUrl: "/images/featured/onepiece.jpg",
      category: "Manga",
      yesPct: 34,
      volumeText: "240k AniCoins pariés",
      featured: true,
    },
    {
      id: "2",
      question: "JJK : Gojo revient avant le dernier arc ?",
      imageUrl: "/images/featured/jjk.jpg",
      category: "Manga",
      yesPct: 58,
      volumeText: "510k AniCoins pariés",
      featured: true,
    },
  ]
  
  export const markets: Market[] = [
    ...featuredMarkets.map((m) => ({ ...m, featured: false })),
    {
      id: "3",
      question: "Chainsaw Man : mort d'un personnage majeur ce mois-ci ?",
      category: "Manga",
      yesPct: 41,
      volumeText: "92k AniCoins pariés",
    },
    {
      id: "4",
      question: "Naruto : un remake annoncé cette année ?",
      category: "Anime",
      yesPct: 22,
      volumeText: "33k AniCoins pariés",
    },
  ]