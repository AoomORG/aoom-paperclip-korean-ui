const INSTRUCTIONS_STORAGE_KEY = "paperclip.instructionsViewMode";

// Translation cache: Map<hash, translatedString>
const translationCache = new Map();

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function translateInstructions(text, targetLang = "ko") {
  if (!text || typeof text !== "string") return text;
  
  // Full source keys avoid collisions between distinct instructions (Aa/BB).
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const catalog = (typeof instructionsCatalog !== "undefined" ? instructionsCatalog : {}) || {};
  const headings = catalog.headings || {};
  const labels = catalog.labels || {};
  const phrases = catalog.phrases || {};
  const reverseHeadings = catalog.reverseHeadings || {};

  const tokens = [];
  function tokenize(str) {
    const idx = tokens.length;
    tokens.push(str);
    return `@@PC_TOKEN_${idx}@@`;
  }

  // 1. Protect code blocks: ```...```
  let masked = text.replace(/```[\s\S]*?```/g, (m) => tokenize(m));

  // 2. Protect inline code: `...`
  masked = masked.replace(/`[^`\n]+`/g, (m) => tokenize(m));

  // 3. Protect URLs: https?://...
  masked = masked.replace(/https?:\/\/[^\s)"]+/g, (m) => tokenize(m));

  // 4. Protect file paths: /foo/bar or ./foo/bar
  masked = masked.replace(/(?:^|[\s"'(])((?:\.{1,2}|~)?\/(?:[\w.-]+\/)*[\w.-]+)/gm, (match, p1) => {
    return match.replace(p1, tokenize(p1));
  });

  // 5. Line-by-line structural translation
  const lines = masked.split("\n");
  const translatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (targetLang === "ko") {
      // Heading translation
      const headingMatch = line.match(/^(#{1,6}\s+)(.*)$/);
      if (headingMatch) {
        const prefix = headingMatch[1];
        let title = headingMatch[2].trim();
        // Check for emoji prefix
        const emojiMatch = title.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[^\w\s])\s*(.*)$/);
        let emoji = "";
        if (emojiMatch) {
          emoji = emojiMatch[1] + " ";
          title = emojiMatch[2].trim();
        }
        if (headings[title]) {
          return `${prefix}${emoji}${headings[title]}`;
        }
        // Substring heading match
        for (const [en, ko] of Object.entries(headings)) {
          if (title.includes(en)) {
            title = title.replace(en, ko);
            return `${prefix}${emoji}${title}`;
          }
        }
        return /[a-zA-Z]{4,}/.test(line) ? line + " [미번역]" : line;
      }

      // Bold label translation: - **Label**: value or **Label**: value
      const labelMatch = line.match(/^(\s*[-*]?\s*\*\*)([^*]+)(\*\*:\s*)(.*)$/);
      if (labelMatch) {
        const lead = labelMatch[1];
        const rawLabel = labelMatch[2].trim();
        const colon = labelMatch[3];
        const rest = labelMatch[4];
        if (labels[rawLabel]) {
          return `${lead}${labels[rawLabel]}${colon}${rest}`;
        }
      }

      // Phrase translation
      for (const [en, ko] of Object.entries(phrases)) {
        if (line.includes(en)) {
          line = line.split(en).join(ko);
        }
      }

      // Check if English sentence has no translation mapping
      const isEnglish = /[a-zA-Z]{4,}/.test(line) && !/[가-힣]/.test(line);
      if (isEnglish && !line.startsWith("@@PC_TOKEN_") && line.length > 20) {
        return line + " [미번역]";
      }
      return line;
    } else {
      // targetLang === "en"
      // Reverse heading translation
      const headingMatch = line.match(/^(#{1,6}\s+)(.*)$/);
      if (headingMatch) {
        const prefix = headingMatch[1];
        const title = headingMatch[2].trim();
        if (reverseHeadings[title]) {
          return `${prefix}${reverseHeadings[title]}`;
        }
      }
      return line;
    }
  });

  let translated = translatedLines.join("\n");

  // Restore tokens
  tokens.forEach((val, idx) => {
    translated = translated.split(`@@PC_TOKEN_${idx}@@`).join(val);
  });

  if (translationCache.size >= 100) translationCache.delete(translationCache.keys().next().value);
  translationCache.set(cacheKey, translated);
  return translated;
}

// React owns instructions editing and preview. DOM overlays must not mutate editor state.
export function enhanceInstructionsPanel() {}
export function mountInstructionsPanels() {}
