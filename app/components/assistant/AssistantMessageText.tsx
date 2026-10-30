import type { ReactNode } from "react";

/**
 * AI cavablarını minimal Markdown ilə göstərir: **qalın**, `kod`, sətir siyahıları,
 * nömrəli siyahılar və başlıqlar. Model cavabı Markdown kimi qaytarır; əvvəl bu
 * mətn düz mətn kimi göstərildiyi üçün ekranda "- **Ümumi borc:**" kimi işarələr
 * görünürdü. `dangerouslySetInnerHTML` istifadə edilmir — hər şey React node kimi
 * qurulur, ona görə model mətnindən HTML inyeksiyası mümkün deyil.
 */

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Yalnız **qalın** və `kod` dəstəklənir; qalan hər şey mətn kimi qalır.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((part) => part.length > 0);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={`${keyPrefix}-c${index}`}>{part.slice(1, -1)}</code>;
    }

    return <span key={`${keyPrefix}-t${index}`}>{part}</span>;
  });
}

export function AssistantMessageText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;

    const key = `p${blocks.length}`;
    blocks.push(<p key={key}>{renderInline(paragraph.join(" "), key)}</p>);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;

    const key = `l${blocks.length}`;
    const items = list.items.map((item, index) => (
      <li key={`${key}-i${index}`}>{renderInline(item, `${key}-i${index}`)}</li>
    ));

    blocks.push(
      list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>,
    );
    list = null;
  }

  for (const line of lines) {
    const heading = line.match(HEADING);

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <p key={`h${blocks.length}`} className="ai-msg-heading">
          {renderInline(heading[1], `h${blocks.length}`)}
        </p>,
      );
      continue;
    }

    const bullet = line.match(BULLET);

    if (bullet) {
      flushParagraph();

      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }

      list.items.push(bullet[1]);
      continue;
    }

    const numbered = line.match(NUMBERED);

    if (numbered) {
      flushParagraph();

      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }

      list.items.push(numbered[1]);
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <>{blocks}</>;
}
