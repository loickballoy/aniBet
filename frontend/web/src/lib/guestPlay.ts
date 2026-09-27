// Progression des parties jouées en invité, gardée dans le navigateur.
// Le serveur n'enregistre rien pour un invité : c'est ce qui permet de
// recharger la page sans perdre ses essais. Aucune valeur de sécurité.

const PREFIX = "anibet:guest:"

export function loadGuestProgress<T>(game: string, id: number): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${game}:${id}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveGuestProgress(game: string, id: number, value: unknown): void {
  try {
    localStorage.setItem(`${PREFIX}${game}:${id}`, JSON.stringify(value))
  } catch {
    // stockage plein ou désactivé : la partie continue, sans reprise possible
  }
}
