#!/usr/bin/env python3
"""Build project-standalone.html: all 5 pages in one file with an iframe router.

Run from the project root:  python3 build-standalone.py
"""
import re, base64, os, json, mimetypes

def datauri(p):
    mime = mimetypes.guess_type(p)[0] or 'application/octet-stream'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(p, 'rb').read()).decode())

def inline_assets(html):
    refs = sorted(set(re.findall(r'(?:src|href|poster)="(assets/[^"?]+)', html)), key=len, reverse=True)
    for p in refs:
        if not os.path.exists(p):
            print('  MISSING', p)
            continue
        uri = datauri(p)
        html = re.sub(r'(src|href|poster)="' + re.escape(p) + r'(\?[^"]*)?"',
                      lambda m: '%s="%s"' % (m.group(1), uri), html)
    return html

ALL_PARTIALS = {}
for name in os.listdir('partials'):
    ALL_PARTIALS['partials/' + name] = inline_assets(open('partials/' + name).read())

CHROME = ['partials/aj-header.html', 'partials/aj-footer.html']
FORYOU = CHROME + ['partials/aj-foryou-stories.html', 'partials/aj-foryou-feed.html',
                   'partials/aj-foryou-footer.html']

# resources aj-chrome.js injects at runtime, served from an embedded map instead
RES_KEYS = ['css/aj-shared.css', 'css/aj-fonts.css', 'css/aj-chrome.css', 'css/aj-responsive.css',
            'css/aj-aura-orb.css', 'js/aj-ask.js', 'js/aj-mobile-nav.js']
RES = {k: open(k).read() for k in RES_KEYS}

def patch_chrome(code):
    old_css = """      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href + '?v=1';
      document.head.appendChild(l);"""
    new_css = """      var st2 = document.createElement('style');
      st2.setAttribute('data-aj-href', href);
      st2.textContent = (window.__AJ_RES && window.__AJ_RES[href]) || '';
      document.head.appendChild(st2);"""
    assert old_css in code
    code = code.replace(old_css, new_css)
    code = code.replace(
        """if (document.querySelector('link[href^="' + href + '"]')) return;""",
        """if (document.querySelector('link[href^="' + href + '"]') || document.querySelector('style[data-aj-href="' + href + '"]')) return;""")
    old_js = """      var s = document.createElement('script');
      s.src = src + '?v=1';
      s.defer = true;
      document.body.appendChild(s);"""
    new_js = """      var s = document.createElement('script');
      s.setAttribute('data-aj-src', src);
      s.textContent = (window.__AJ_RES && window.__AJ_RES[src]) || '';
      document.body.appendChild(s);"""
    assert old_js in code
    code = code.replace(old_js, new_js)
    code = code.replace(
        """if (document.querySelector('script[src^="' + src + '"]')) return;""",
        """if (document.querySelector('script[src^="' + src + '"]') || document.querySelector('script[data-aj-src="' + src + '"]')) return;""")
    # srcdoc iframes have no pathname — page identity comes from the shim
    code = code.replace('/account/i.test(location.pathname)',
                        '/account/i.test(window.__AJ_PAGE || location.pathname)')
    return code

def fetch_shim(keys, with_res, page=''):
    P = {k: ALL_PARTIALS[k] for k in keys}
    parts = ['var P=' + json.dumps(P)]
    if page:
        parts.append('window.__AJ_PAGE=' + json.dumps(page))
    if with_res:
        parts.append('window.__AJ_RES=' + json.dumps(RES))
    return ('<script>\n(function(){' + ';'.join(parts) +
            ';var of=window.fetch?window.fetch.bind(window):null;'
            'window.fetch=function(u,o){var k=String(u).split("?")[0];'
            'if(P[k])return Promise.resolve({ok:true,text:function(){return Promise.resolve(P[k])}});'
            'return of?of(u,o):Promise.reject(new Error("offline"))};})();\n</script>')

# Runs in the BUBBLE phase and defers to the page's own handlers: components
# like the globe bind click handlers that preventDefault() and open in-page
# views — a capture-phase router would hijack those clicks.
ROUTER_CHILD = ('<script>\n(function(){document.addEventListener("click",function(e){'
                'if(e.defaultPrevented)return;'
                'var a=e.target.closest&&e.target.closest("a[href$=\\".html\\"],a[href*=\\".html#\\"]");'
                'if(!a)return;var m=a.getAttribute("href").match(/(aljazeera-[a-z]+|index)\\.html(#[\\w-]+)?/);'
                'if(!m)return;e.preventDefault();'
                'var t=window;while(t.parent&&t.parent!==t){t=t.parent}'
                'try{t.postMessage({ajPage:m[1]==="index"?"index":m[1].replace("aljazeera-",""),ajHash:m[2]||""},"*")}catch(x){}'
                '},false);})();\n</script>')

def inline_one_js(path):
    code = open(path).read()
    if path.endswith('aj-chrome.js'):
        code = patch_chrome(code)
    if path.endswith('aj-article.js'):
        code = code.replace('/aljazeera-article/i.test(location.pathname)',
                            '/aljazeera-article/i.test(window.__AJ_PAGE || location.pathname)')
    if path.endswith('aj-quiz.js'):
        code = code.replace("if (location.hash !== '#crossword') return;",
                            "if ((window.__AJ_HASH || location.hash) !== '#crossword') return;")
    return code

def inline_scripts_html(html):
    return re.sub(r'<script src="(js/[^"?]+)[^"]*"[^>]*></script>',
                  lambda m: '<script>\n' + inline_one_js(m.group(1)) + '\n</script>', html)

def inline_css_html(html):
    return re.sub(r'<link rel="stylesheet" href="(css/[^"?]+)[^"]*">',
                  lambda m: '<style data-aj-href="' + m.group(1) + '">\n' + open(m.group(1)).read() + '\n</style>', html)

def embed_video_swap(html):
    if "src: 'assets/foryou/film-volcano.mp4'" in html:
        html = html.replace("src: 'assets/foryou/film-volcano.mp4'",
                            "src: '" + datauri('assets/foryou/film-volcano.mp4') + "'")
    return html

def build_page(path, partial_keys, with_res=False, bundled=False):
    print('==', path)
    s = open(path).read()
    s = inline_css_html(s)
    s = inline_scripts_html(s)
    inject = fetch_shim(partial_keys, with_res, page=path) + ROUTER_CHILD
    if bundled:
        def tpl_repl(m):
            t = json.loads(m.group(1))
            t = re.sub(r'<script src="(js/[^"?]+)[^"]*"[^>]*></script>',
                       lambda mm: '<script>\n' + inline_one_js(mm.group(1)) + '\n</script>', t)
            t = t.replace('<head>', '<head>' + inject +
                          '<style>#__bundler_loading{display:none!important}</style>', 1)
            # escape only at the JSON-text layer so the decoded doc keeps real tags
            payload = json.dumps(t).replace('</', '<\\/')
            return '<script type="__bundler/template" data-bundler-template="true">' + payload + '</script>'
        s = re.sub(r'<script type="__bundler/template"[^>]*>(.*?)</script>', tpl_repl, s, flags=re.S)
    s = inline_assets(s)
    s = embed_video_swap(s)
    splash = '<style>#__bundler_loading{display:none!important}</style>' if bundled else ''
    s = s.replace('<head>', '<head>' + inject + splash, 1)
    print('  size MB:', round(len(s) / 1e6, 1))
    return s

PAGES = {
    'index':   build_page('index.html', []),
    'foryou':  build_page('aljazeera-foryou.html', FORYOU, with_res=True),
    'article': build_page('aljazeera-article.html', CHROME, with_res=True),
    'games':   build_page('aljazeera-games.html', CHROME, with_res=True, bundled=True),
    'account': build_page('aljazeera-account.html', CHROME, with_res=True, bundled=True),
}

parts = []
for name, html in PAGES.items():
    parts.append('<script type="application/json" id="aj-page-%s">%s</script>'
                 % (name, json.dumps(html).replace('</', '<\\/')))

shell = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Al Jazeera — Prototype (standalone)</title>
<style>
html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#fff}
#aj-frame{border:0;width:100%;height:100%;display:block}
</style>
</head>
<body>
<iframe id="aj-frame" title="Al Jazeera prototype"></iframe>
''' + '\n'.join(parts) + '''
<script>
(function () {
  var frame = document.getElementById('aj-frame');
  var cache = {};
  var current = null;
  function resolve(name) {
    return document.getElementById('aj-page-' + name) ? name : 'index';
  }
  function page(name) {
    if (!cache[name]) cache[name] = JSON.parse(document.getElementById('aj-page-' + name).textContent);
    return cache[name];
  }
  function render(name, hash) {
    name = resolve(name);
    if (name === current && !hash) return;
    current = name;
    var html = page(name);
    if (hash) {
      html = html.replace('<head>', '<head><scr' + 'ipt>window.__AJ_HASH=' + JSON.stringify(hash) + '</scr' + 'ipt>');
    }
    frame.srcdoc = html;
  }
  function navigate(name, hash) {
    name = resolve(name);
    if (name === current && !hash) return;
    try { history.pushState({ ajPage: name }, '', '#' + name); } catch (e) {}
    render(name, hash);
  }
  window.addEventListener('message', function (e) {
    if (e.data && e.data.ajPage) navigate(e.data.ajPage, e.data.ajHash || '');
  });
  // back/forward buttons: restore the page recorded in that history entry
  window.addEventListener('popstate', function (e) {
    render((e.state && e.state.ajPage) || (location.hash || '#index').slice(1));
  });
  // typing a #hash in the URL bar (no popstate on some direct edits)
  window.addEventListener('hashchange', function () {
    render((location.hash || '#index').slice(1));
  });
  var first = resolve((location.hash || '#index').slice(1));
  try { history.replaceState({ ajPage: first }, '', '#' + first); } catch (e) {}
  render(first);
})();
</script>
</body>
</html>'''

open('project-standalone.html', 'w').write(shell)
print('TOTAL MB:', round(os.path.getsize('project-standalone.html') / 1e6, 1))
