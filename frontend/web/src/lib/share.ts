// Textes de partage façon Wordle : résultat lisible d'un coup d'œil, sans
// spoiler (jamais la réponse), avec un lien vers le jeu pour ramener du monde.

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function link(path: string): string {
  return typeof window === "undefined" ? path : `${window.location.origin}${path}`
}

function streakSuffix(streak?: number | null): string {
  return streak && streak > 1 ? ` · 🔥${streak}` : ""
}

export function triviaShareText(date: string, correct: boolean[], streak?: number | null): string {
  const grid = correct.map((c) => (c ? "🟩" : "🟥")).join("")
  const score = correct.filter(Boolean).length
  return `aniBet Trivia ${shortDate(date)}\n${grid} ${score}/${correct.length}${streakSuffix(streak)}\n${link("/daily")}`
}

export function silhouetteShareText(date: string, guessesUsed: number, solved: boolean, maxGuesses: number, streak?: number | null): string {
  // 🟥 = essai raté, 🟩 = trouvé, ⬛ = essai non utilisé
  const cells = Array.from({ length: maxGuesses }, (_, i) => {
    if (i < guessesUsed - 1) return "🟥"
    if (i === guessesUsed - 1) return solved ? "🟩" : "🟥"
    return "⬛"
  }).join("")
  const score = solved ? `${guessesUsed}/${maxGuesses}` : `X/${maxGuesses}`
  return `aniBet Silhouette ${shortDate(date)}\n${cells} ${score}${streakSuffix(streak)}\n${link("/daily")}`
}

export function weeklyShareText(weekOf: string, groupsFound: number, mistakes: number, solved: boolean): string {
  const groups = ["🟩", "🟦", "🟨", "🟪"].slice(0, groupsFound).join("") + "⬛".repeat(4 - groupsFound)
  const result = solved ? `${groupsFound}/4 · ${mistakes} mistake${mistakes === 1 ? "" : "s"}` : `${groupsFound}/4`
  return `aniBet AniConnections · week of ${shortDate(weekOf)}\n${groups} ${result}\n${link("/weekly")}`
}

export function calledItShareText(eventTitle: string, outcome: string, payout: number, eventId: number): string {
  return `I called it on aniBet 🎯\n"${eventTitle}" → ${outcome}\n+${payout.toLocaleString("en-US")} 🪙\n${link(`/markets/${eventId}`)}`
}

export function marketShareText(eventTitle: string, eventId: number): string {
  return `What's your call? 🔮\n"${eventTitle}"\n${link(`/markets/${eventId}`)}`
}
