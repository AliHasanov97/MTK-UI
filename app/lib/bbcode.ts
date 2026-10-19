/**
 * Minimal, təhlükəsiz BBCode analizatoru. HTML heç vaxt buraxılmır: nəticə AST-dir,
 * komponent onu React elementlərinə çevirir (dangerouslySetInnerHTML yoxdur).
 *
 * Dəstəklənən teqlər:
 *   [b] [i] [u] [s] [h2] [h3] [quote] [center]
 *   [url]https://…[/url]   [url=https://…]mətn[/url]
 *   [img]https://…[/img]
 *   [list] [*] bənd [*] bənd [/list]    [list=1] — nömrəli
 *   [hr]
 * Tanınmayan və ya bağlanmamış teqlər adi mətn kimi qalır (heç nə itmir).
 */

export type BBNode = string | { tag: string; arg?: string; children: BBNode[] };
type Element = Exclude<BBNode, string>;

const ALLOWED = new Set(["b", "i", "u", "s", "h2", "h3", "quote", "center", "url", "img", "list", "*", "hr"]);
export const BLOCK_TAGS = new Set(["h2", "h3", "quote", "center", "list", "hr"]);

const TAG_RE = /\[(\/?)([a-zA-Z0-9*]+)(?:=([^\]\n]*))?\]/g;

export function parseBBCode(source: string): BBNode[] {
  const root: Element = { tag: "root", children: [] };
  const stack: Element[] = [root];
  const top = () => stack[stack.length - 1];
  const addText = (text: string) => {
    if (!text) return;
    const siblings = top().children;
    const last = siblings[siblings.length - 1];
    if (typeof last === "string") siblings[siblings.length - 1] = last + text;
    else siblings.push(text);
  };

  let last = 0;
  for (const m of source.matchAll(TAG_RE)) {
    const [raw, closing, rawName, arg] = m;
    const name = rawName.toLowerCase();
    addText(source.slice(last, m.index));
    last = (m.index ?? 0) + raw.length;

    if (!ALLOWED.has(name)) {
      addText(raw);
      continue;
    }

    if (closing) {
      if (name === "*" || name === "hr") {
        addText(raw);
        continue;
      }
      // ən yaxın uyğun açıq teqi tap; aralarındakılar avtomatik bağlanır
      let idx = -1;
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) {
          idx = i;
          break;
        }
      }
      if (idx === -1) addText(raw);
      else stack.length = idx;
      continue;
    }

    if (name === "hr") {
      top().children.push({ tag: "hr", children: [] });
      continue;
    }

    if (name === "*") {
      if (top().tag === "*") stack.pop();
      if (top().tag !== "list") {
        addText(raw);
        continue;
      }
    }

    const node: Element = { tag: name, arg: arg?.trim() || undefined, children: [] };
    top().children.push(node);
    stack.push(node);
  }
  addText(source.slice(last));

  return normalize(root.children);
}

/** Siyahı bəndinin əvvəlindəki boşluğu və sonundakı sətir keçidlərini təmizləyir. */
function trimItem(item: Element): Element {
  const children = normalize(item.children);
  const first = children[0];
  if (typeof first === "string") children[0] = first.replace(/^\s+/, "");
  const last = children[children.length - 1];
  if (typeof last === "string") children[children.length - 1] = last.replace(/\s+$/, "");
  return { ...item, children };
}

/** Blok teqlərin ətrafındakı artıq sətir keçidlərini (bir ədəd) təmizləyir, siyahıda yalnız bəndləri saxlayır. */
function normalize(nodes: BBNode[]): BBNode[] {
  const out: BBNode[] = nodes.map((n) => {
    if (typeof n === "string") return n;
    if (n.tag === "list") {
      const items = n.children.filter((c): c is Element => typeof c !== "string");
      return { ...n, children: items.map(trimItem) };
    }
    return { ...n, children: normalize(n.children) };
  });

  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    if (typeof n === "string" || !BLOCK_TAGS.has(n.tag)) continue;
    const prev = out[i - 1];
    if (typeof prev === "string") out[i - 1] = prev.replace(/\n$/, "");
    const next = out[i + 1];
    if (typeof next === "string") out[i + 1] = next.replace(/^\n/, "");
    // blokun öz içindəki baş və son sətir keçidi
    if (n.tag !== "list" && n.tag !== "hr") {
      const first = n.children[0];
      if (typeof first === "string") n.children[0] = first.replace(/^\n/, "");
      const lastChild = n.children[n.children.length - 1];
      if (typeof lastChild === "string") n.children[n.children.length - 1] = lastChild.replace(/\n$/, "");
    }
  }
  return out;
}

export function nodesToText(nodes: BBNode[]): string {
  return nodes.map((n) => (typeof n === "string" ? n : nodesToText(n.children))).join("");
}

/** Yalnız http(s), mailto və saytdaxili ünvanlar; javascript: və s. rədd edilir. */
export function safeUrl(value: string | undefined, { allowMailto = false } = {}): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
  if (allowMailto && /^mailto:/i.test(url)) return url;
  return null;
}
