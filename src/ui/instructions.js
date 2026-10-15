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
  
  const cacheKey = `${targetLang}:${hashString(text)}`;
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
        return line;
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

  translationCache.set(cacheKey, translated);
  return translated;
}

export function enhanceInstructionsPanel(container, lang) {
  if (!container || container.hasAttribute("data-pc-inst-enhanced")) return;
  container.setAttribute("data-pc-inst-enhanced", "true");

  const header = container.querySelector(".flex.items-center.justify-between") || container.firstElementChild;
  const editorElem = container.querySelector(".cm-editor, textarea, [contenteditable]");
  if (!header || !editorElem) return;

  let isEditing = false;
  let viewMode = lang === "ko" ? "translated" : "original";
  let baselineText = "";

  function getEditorText() {
    if (editorElem.tagName === "TEXTAREA") return editorElem.value || "";
    return editorElem.textContent || "";
  }

  baselineText = getEditorText();

  // Create preview container
  const previewDiv = document.createElement("div");
  previewDiv.className = "min-h-[420px] w-full rounded-md border border-border bg-transparent p-4 font-mono text-sm whitespace-pre-wrap overflow-y-auto leading-relaxed";
  previewDiv.setAttribute("data-pc-inst-preview", "true");
  previewDiv.style.display = "none";
  editorElem.parentElement.insertBefore(previewDiv, editorElem.nextSibling);

  // Create toolbar inside header
  const toolbar = document.createElement("div");
  toolbar.className = "flex items-center gap-2 text-xs";
  toolbar.setAttribute("data-pc-inst-toolbar", "true");

  const statusBadge = document.createElement("span");
  statusBadge.className = "px-2 py-0.5 rounded text-[11px] font-medium border border-border text-muted-foreground bg-muted/30";
  statusBadge.textContent = "읽기 전용";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "px-2.5 py-1 rounded border border-border text-xs font-medium hover:bg-accent transition-colors";
  editBtn.textContent = "지침 수정";

  const viewToggleBtn = document.createElement("button");
  viewToggleBtn.type = "button";
  viewToggleBtn.className = "px-2.5 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors";
  viewToggleBtn.textContent = viewMode === "translated" ? "원문 보기" : "번역 보기";

  toolbar.appendChild(statusBadge);
  toolbar.appendChild(editBtn);
  toolbar.appendChild(viewToggleBtn);

  // Insert toolbar into header actions
  const actionGroup = header.querySelector(".flex.items-center.gap-2") || header;
  actionGroup.insertBefore(toolbar, actionGroup.firstChild);

  function updateDisplay() {
    const currentLang = (typeof getUiLanguage === "function" ? getUiLanguage() : lang) || "ko";
    
    if (isEditing) {
      statusBadge.textContent = "수정 중";
      statusBadge.className = "px-2 py-0.5 rounded text-[11px] font-medium border border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200";
      editBtn.textContent = "수정 취소";
      viewToggleBtn.style.display = "none";
      
      // Editor visible and editable
      previewDiv.style.display = "none";
      editorElem.style.display = "";
      editorElem.style.pointerEvents = "auto";
      if (editorElem.tagName === "TEXTAREA") editorElem.readOnly = false;
      const contentEl = editorElem.querySelector(".cm-content");
      if (contentEl) contentEl.setAttribute("contenteditable", "true");
    } else {
      statusBadge.textContent = "읽기 전용";
      statusBadge.className = "px-2 py-0.5 rounded text-[11px] font-medium border border-border text-muted-foreground bg-muted/30";
      editBtn.textContent = "지침 수정";
      viewToggleBtn.style.display = "";

      if (viewMode === "translated") {
        viewToggleBtn.textContent = "원문 보기";
        editorElem.style.display = "none";
        previewDiv.style.display = "block";
        const raw = getEditorText();
        previewDiv.textContent = translateInstructions(raw, currentLang);
      } else {
        viewToggleBtn.textContent = "번역 보기";
        previewDiv.style.display = "none";
        editorElem.style.display = "";
        // Lock editor in read-only mode
        editorElem.style.pointerEvents = "auto";
        if (editorElem.tagName === "TEXTAREA") editorElem.readOnly = true;
        const contentEl = editorElem.querySelector(".cm-content");
        if (contentEl) contentEl.setAttribute("contenteditable", "false");
      }
    }
  }

  editBtn.addEventListener("click", () => {
    if (!isEditing) {
      isEditing = true;
      baselineText = getEditorText();
    } else {
      // Cancel edit: revert to baseline if needed
      isEditing = false;
    }
    updateDisplay();
  });

  viewToggleBtn.addEventListener("click", () => {
    viewMode = viewMode === "translated" ? "original" : "translated";
    updateDisplay();
  });

  window.addEventListener("paperclip-ui-language", () => {
    const nextLang = (typeof getUiLanguage === "function" ? getUiLanguage() : "ko");
    viewMode = nextLang === "ko" ? "translated" : "original";
    updateDisplay();
  });

  updateDisplay();
}
