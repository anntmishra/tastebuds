// Combinatorial playlist-name generator. Word banks live here (no server-only
// imports) so the client reroll can re-sample without a round trip.

export const NAME_ADJECTIVES = [
  "Feral",
  "Unhinged",
  "Emotional",
  "3AM",
  "Delusional",
  "Sentimental",
  "Chaotic",
  "Nocturnal",
  "Unbothered",
  "Menacing",
  "Tender",
  "Cursed",
  "Radiant",
  "Sweaty",
  "Haunted",
  "Gremlin",
  "Certified",
  "Suspicious",
  "Velvet",
  "Reckless",
  "Wistful",
  "Deranged",
];

export const NAME_NOUNS = [
  "Damage",
  "Hours",
  "Energy",
  "Chaos",
  "Behaviour",
  "Season",
  "Agenda",
  "Delusions",
  "Regrets",
  "Renaissance",
  "Era",
  "Situation",
  "Aftermath",
  "Frequencies",
  "Feelings",
  "Overthinking",
  "Lore",
  "Phase",
  "Origin Story",
  "Group Chat",
  "Yearning",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomBlendName(): string {
  return `${pick(NAME_ADJECTIVES)} ${pick(NAME_NOUNS)}`;
}
