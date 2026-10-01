import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageMarkdown } from "../components/message-markdown";

const render = (text: string) => renderToStaticMarkup(createElement(MessageMarkdown, { text }));

test("teacher messages render emphasis, lists, tables and code as Markdown", () => {
  const html = render('**yes** and *no*\n\n- first\n- second\n\n| Word | Meaning |\n| --- | --- |\n| yes | ใช่ |\n\n```js\nconst x = "**literal**";\n```');
  assert.match(html, /<strong>yes<\/strong>/);
  assert.match(html, /<em>no<\/em>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<table>/);
  assert.match(html, /<pre tabindex="0"><code class="language-js">/);
  assert.match(html, /\*\*literal\*\*/);
});

test("math renders and unsafe HTML and link protocols stay inactive", () => {
  const math = render('สูตร $x^2$\n\n$$\n\\frac{1}{2}\n$$');
  assert.match(math, /class="katex"/);
  assert.match(math, /katex-display/);
  const html = render('<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)\n\n[docs](https://example.com)');
  assert.doesNotMatch(html, /<script|href="javascript:/);
  assert.match(html, /rel="noopener noreferrer"/);
});
