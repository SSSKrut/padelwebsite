const VOWELS = new Set("aeiouAEIOUаеёиоуыэюяАЕЁИОУЫЭЮЯаеёиоуыэюяАЕЁИОУЫЭЮЯàáâãäåāăąÀÁÂÃÄÅĀĂĄèéêëēĕėęěÈÉÊËĒĔĖĘĚìíîïīĭıÌÍÎÏĪĬIòóôõöøōŏőÒÓÔÕÖØŌŎŐùúûüūŭůűÙÚÛÜŪŬŮŰýÿÝŸæœÆŒøØäÄåÅõÕāĀēĒīĪōŌūŪȧȦųŲįĮęĘёЁіїІЇєЄүӱӧӫӓӒәӘ");

/**
 * Abbreviates a last name to its leading consonant cluster + "."
 * If the name starts with a vowel, returns just the first letter + "."
 * Examples: "Schmidt" → "Schm.", "Ivanov" → "I.", "Brown" → "Br."
 */
export function abbreviateLastName(lastName: string): string {
  if (!lastName) return "";
  if (lastName.trim() === "") return "";
  let i = 0;
  // If starts with a vowel, take only the first character
  if (VOWELS.has(lastName[0])) {
    return lastName[0] + ".";
  }
  // Take the leading consonant cluster
  while (i < lastName.length && !VOWELS.has(lastName[i])) {
    i++;
  }

  if (i === lastName.length) {
    // No vowels found exmpl: "Mmmmm", return only the first letter + "."
    return lastName.slice(0, 1) + ".";;
  }

  return lastName.slice(0, i) + ".";
}

export function publicName(firstName: string, lastName: string): string {
  return `${firstName} ${abbreviateLastName(lastName)}`.trim();
}
