import { createElement, type ReactNode } from "react";
import { nodesToText, parseBBCode, safeUrl, type BBNode } from "../lib/bbcode";
import "./bbcode.css";

function render(nodes: BBNode[], keyPrefix = ""): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    if (typeof node === "string") return node;

    const children = render(node.children, `${key}.`);
    switch (node.tag) {
      case "b":
        return <strong key={key}>{children}</strong>;
      case "i":
        return <em key={key}>{children}</em>;
      case "u":
        return <u key={key}>{children}</u>;
      case "s":
        return <s key={key}>{children}</s>;
      case "h2":
        return <h2 key={key}>{children}</h2>;
      case "h3":
        return <h3 key={key}>{children}</h3>;
      case "quote":
        return <blockquote key={key}>{children}</blockquote>;
      case "center":
        return (
          <div key={key} className="bb-center">
            {children}
          </div>
        );
      case "hr":
        return <hr key={key} />;
      case "list": {
        const ordered = node.arg === "1" || node.arg === "a";
        return createElement(
          ordered ? "ol" : "ul",
          { key },
          node.children.map((item, j) => (typeof item === "string" ? null : <li key={`${key}.${j}`}>{render(item.children, `${key}.${j}.`)}</li>)),
        );
      }
      case "url": {
        const href = safeUrl(node.arg ?? nodesToText(node.children), { allowMailto: true });
        if (!href) return <span key={key}>{children}</span>;
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {node.arg ? children : href}
          </a>
        );
      }
      case "img": {
        const src = safeUrl(nodesToText(node.children));
        // eslint-disable-next-line @next/next/no-img-element
        return src ? <img key={key} src={src} alt="" loading="lazy" /> : null;
      }
      default:
        return <span key={key}>{children}</span>;
    }
  });
}

/** BBCode mətnini təhlükəsiz şəkildə React elementlərinə çevirir (server və client komponentlərində işləyir). */
export function BBCode({ source, className }: { source: string; className?: string }) {
  return <div className={className ? `bb ${className}` : "bb"}>{render(parseBBCode(source))}</div>;
}
