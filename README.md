# Al Jazeera Prototype

Static, buildless prototype of the Al Jazeera redesign. No dependencies —
everything runs off plain HTML/CSS/JS plus a tiny Node dev server.

## Run locally

Requires Node.js (any recent version, no `npm install` needed):

```bash
node dev-server.js
```

Then open <http://localhost:4321>.

The server serves this folder with live reload — edit any file and open
pages refresh automatically. `PORT=8080 node dev-server.js` to change the
port.

> Serving over HTTP matters: pages fetch assets (videos, JSON bundles)
> that break under `file://`, so always use the dev server rather than
> double-clicking the HTML files.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Homepage (hero slideshow, capsules rail, games section) |
| `aljazeera-foryou.html` | Personalized "For You" edition |
| `aljazeera-article.html` | Article page |
| `aljazeera-games.html` | Games hub — Daily Quiz by default, `#crossword` deep-links to the Mini Crossword |
| `aljazeera-account.html` | Account settings |

`css/aj-responsive.css` carries all tablet/mobile behavior (footer
accordions, stacked layouts); `js/` holds the runtime enhancements
(slideshow, story viewer, quiz/crossword takeover, mobile nav).
