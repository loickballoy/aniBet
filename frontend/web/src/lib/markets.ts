export type Market = {
    id: string
    question: string
    imageUrl?: string
    category?: string
    yesPct: number // 0..100
    volumeText?: string // ex: "$1M Vol."
    endDateText?: string // optionnel
    featured?: boolean
    outcomes?: { id: number; label: string; poolPoints: number }[]
  }
  
  export const featuredMarkets: Market[] = [
    {
      id: "1",
      question: "Que dira Trump lors du discours sur l’état de l’Union ?",
      imageUrl: "/images/featured/trump.jpg",
      category: "Politique",
      yesPct: 96,
      volumeText: "$1M Vol.",
      featured: true,
    },
    {
      id: "2",
      question: "One Piece : un Mugiwara va mourir avant la fin ?",
      imageUrl: "/images/featured/onepiece.jpg",
      category: "Manga",
      yesPct: 34,
      volumeText: "$240k Vol.",
      featured: true,
    },
    {
      id: "3",
      question: "JJK : Gojo revient avant le dernier arc ?",
      imageUrl: "/images/featured/jjk.jpg",
      category: "Manga",
      yesPct: 58,
      volumeText: "$510k Vol.",
      featured: true,
    },
  ]
  
  export const markets: Market[] = [
    ...featuredMarkets.map((m) => ({ ...m, featured: false })),
    {
      id: "4",
      question: "Chainsaw Man : mort d’un personnage majeur ce mois-ci ?",
      category: "Manga",
      yesPct: 41,
      volumeText: "$92k Vol.",
    },
    {
      id: "5",
      question: "Naruto : un remake annoncé cette année ?",
      category: "Anime",
      yesPct: 22,
      volumeText: "$33k Vol.",
    },
  ]