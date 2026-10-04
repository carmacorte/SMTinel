from pathlib import Path
import shutil

MARKER = "<!-- SMTinel Focused Red X Runtime v20 -->"
APP = Path("app.html")

if not APP.exists():
    raise SystemExit("app.html not found")

text = APP.read_text(encoding="utf-8")

def replace_one(old, new, label):
    global text
    if old not in text:
        if new in text:
            print(f"{label}: already applied")
            return
        raise SystemExit(f"Missing target: {label}")
    text = text.replace(old, new, 1)
    print(f"{label}: applied")

def insert_before(anchor, payload, label):
    global text
    if payload.strip() in text:
        print(f"{label}: already applied")
        return
    pos = text.find(anchor)
    if pos < 0:
        raise SystemExit(f"Missing anchor: {label}")
    text = text[:pos] + payload + text[pos:]
    print(f"{label}: inserted")

if MARKER not in text:
    # Default directly into the real application, not a portal.
    replace_one('var activeModuleArr = _useState("dashboard");',
                'var activeModuleArr = _useState("yieldflow");',
                "Default module Yield Flow")

    replace_one(
        'var SMTINEL_RETIRED_MODULE_KEYS = { sentinelux: true, criticalmodel: true, storyline: true, rcca: true, issueimpact: true, scheduling: true, yieldweek: true, planagent: true, recovery: true, criticalchars: true, "8d": true };',
        'var SMTINEL_RETIRED_MODULE_KEYS = { dashboard:true, vector:true, sentinelux:true, criticalmodel:true, storyline:true, rcca:true, issueimpact:true, scheduling:true, yieldweek:true, planagent:true, recovery:true, criticalchars:true, testperf:true, intellog:true, "8d":true };',
        "Retire legacy workspaces"
    )
    replace_one('var next = String(key || "dashboard");',
                'var next = String(key || "yieldflow");',
                "Fallback module Yield Flow")

    # Main React module list: strict allowlist plus a dedicated Export Center.
    replace_one(
        'moduleNavItems = moduleNavItems.filter(function (item) { return !SMTINEL_RETIRED_MODULE_KEYS[item.key]; });',
        '''moduleNavItems = moduleNavItems.filter(function (item) {
        return item.key === "yieldflow" || item.key === "boardimpact" || item.key === "bonepile";
    });
    moduleNavItems.push({
        key: "exportcenter",
        label: "Export Center",
        shortLabel: "Reportes y paquetes de salida de SMTinel",
        count: "RPT",
        anchorId: "exportcenter-section",
        tone: { bg: "#F5EEEE", border: "#D8BFC2", color: "#8F353D" }
    });''',
        "Focused React module list"
    )

    export_fn = r'''    function renderExportCenterSection() {
        return React.createElement("section", { id: "exportcenter-section", className: "trace-card smtinel-export-center-module", style: { padding: 0, overflow: "hidden", borderRadius: 22 } },
            React.createElement("div", { className: "smtinel-redx-module-head" },
                React.createElement("div", { className: "smtinel-redx-kicker" }, "SMTinel Reports"),
                React.createElement("h2", null, "Export Center"),
                React.createElement("p", null, "Reportes de turno, revisión semanal, DBN, Test Performance y Yokoten desde el mismo alcance de datos cargado.")),
            React.createElement("iframe", {
                title: "SMTinel Export Center",
                srcDoc: SMTINEL_BONEPILE_SRCDOC,
                onLoad: function(e) {
                    var frame=e&&e.currentTarget;
                    setTimeout(function(){
                        try{
                            var win=frame&&frame.contentWindow, doc=frame&&frame.contentDocument;
                            if(doc){
                                var wrap=doc.querySelector('.wrap'); if(wrap) wrap.style.display='none';
                                var close=doc.getElementById('closeEmail'); if(close) close.style.display='none';
                                var refresh=doc.getElementById('refresh'); if(refresh) refresh.style.display='none';
                            }
                            if(win&&typeof win.openEmail==='function') win.openEmail();
                            traceOpsBonepilePostToFrame(win,{type:'smtinel:bonepile:parent-ready'});
                            if(win) win.postMessage({type:'smtinel:theme',theme:document.documentElement.classList.contains('smtinel-theme-light')?'light':'dark'},'*');
                        }catch(_){}
                    },140);
                },
                style: { width: "100%", minHeight: "1180px", border: 0, display: "block" }
            })
        );
    }

'''
    insert_before('    function renderTestPerformanceSection() {',
                  export_fn,
                  "Dedicated Export Center surface")

    replace_one(
        '                        activeModule === "bonepile" && renderBonepileSection(),',
        '                        activeModule === "bonepile" && renderBonepileSection(),\n                        activeModule === "exportcenter" && renderExportCenterSection(),',
        "Export Center route"
    )

    replace_one(
        'activeModule !== "dashboard" && activeModule !== "storyline" && activeModule !== "vector" && activeModule !== "yieldflow" && activeModule !== "testperf" && activeModule !== "bonepile" &&',
        'activeModule !== "dashboard" && activeModule !== "storyline" && activeModule !== "vector" && activeModule !== "yieldflow" && activeModule !== "testperf" && activeModule !== "bonepile" && activeModule !== "exportcenter" &&',
        "Suppress legacy event log in Export Center"
    )

    replace_one(
        '        if (kind === "boardimpact")',
        '''        if (kind === "exportcenter")
            return React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" },
                React.createElement("path", { d: "M5 4.5h14v15H5z" }),
                React.createElement("path", { d: "M8 8h8M8 12h5" }),
                React.createElement("path", { d: "M12 16h5" }),
                React.createElement("path", { d: "m15 13 3 3-3 3" }));
        if (kind === "boardimpact")''',
        "Export Center React icon"
    )

    # Navigation refactor already uses bespoke SVG line icons. Keep that language and remove all archaeology.
    replace_one(
        '''    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>' ''',
        '''    exportcenter:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5z"/><path d="M8 8h8M8 12h5"/><path d="M12 16h5"/><path d="m15 13 3 3-3 3"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>' ''',
        "Export Center navigation icon"
    )

    nav_anchor = text.find('  var modules=[', text.find('smtinel-nav-refactor-controller-v2'))
    nav_end = text.find('  var retiredModuleKeys=', nav_anchor)
    if nav_anchor < 0 or nav_end < 0:
        raise SystemExit("Navigation module array not found")
    nav_modules = '''  var modules=[
    {key:"yieldflow",label:"Yield Flow",icon:icons.yield,aliases:["Yield Flow"]},
    {key:"boardimpact",label:"Board Impact",icon:icons.board,aliases:["Board Impact"]},
    {key:"bonepile",label:"Bonepile",icon:icons.bonepile,aliases:["Bonepile Visual Tracker","Bonepile","WIP Map","Layout Inventory"]},
    {key:"exportcenter",label:"Export Center",icon:icons.exportcenter,aliases:["Export Center","Reports","Reportes"]}
  ];
'''
    text = text[:nav_anchor] + nav_modules + text[nav_end:]
    print("Navigation reduced to 4 modules")

    rk_start = text.find('  var retiredModuleKeys=', nav_anchor)
    rk_end = text.find('\n  modules=modules.filter', rk_start)
    if rk_start < 0 or rk_end < 0:
        raise SystemExit("Navigation retired map not found")
    text = text[:rk_start] + '  var retiredModuleKeys={};' + text[rk_end:]

    replace_one('  var mobileKeys=["yieldflow","boardimpact","bonepile"];',
                '  var mobileKeys=["yieldflow","boardimpact","bonepile","exportcenter"];',
                "Mobile navigation 4 modules")

    global_start = text.find('  window.openCommandCenter=function(){', nav_anchor)
    global_end = text.find('  function buttonHTML', global_start)
    if global_start < 0 or global_end < 0:
        raise SystemExit("Legacy global navigation hooks not found")
    globals_new = '''  window.openYieldFlow=function(){navTo("yieldflow");};
  window.openBoardImpact=function(){navTo("boardimpact");};
  window.openBonepile=function(){navTo("bonepile");};
  window.openExportCenter=function(){navTo("exportcenter");};
'''
    text = text[:global_start] + globals_new + text[global_end:]
    print("Legacy navigation hooks removed")

    replace_one('<div class="smtinel-side-section">Command Center</div>',
                '<div class="smtinel-side-section">Módulos</div>',
                "Sidebar section label")

    # Bonepile is now dedicated to WIP; Export Center is its own module.
    replace_one(
        '<div class="head"><div><h1>Bonepile Visual Tracker</h1><p>Current SFC population with role-focused weekly execution reviews and shift handoff exports.</p></div><div class="actions"><button class="btn good" id="baseline">Capture Shift Start</button><button class="btn primary" id="shiftEmail">Export Report</button><button class="btn" id="refresh">Refresh</button></div></div>',
        '<div class="head"><div><h1>Bonepile Visual Tracker</h1><p>Current SFC population by line, station, aging, repair status and material exposure.</p></div><div class="actions"><button class="btn good" id="baseline">Capture Shift Start</button><button class="btn primary" id="shiftEmail" style="display:none">Export Report</button><button class="btn" id="refresh">Refresh</button></div></div>',
        "Bonepile report button removed from UI"
    )
    replace_one(
        'Choosing a report does not reset Bonepile filters, loaded SFC data, Repair Records, fiscal periods or the captured shift baseline.',
        'Choosing a report preserves the current SMTinel data scope, loaded SFC data, Repair Records, fiscal periods and captured shift baseline.',
        "Export Center scope copy"
    )

    # Report icons: custom line art, no emoji / OS glyphs.
    icons = {
        '<span class="export-type-icon">&#8644;</span>':'<span class="export-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h11"/><path d="m12 5 3 3-3 3"/><path d="M20 16H9"/><path d="m12 13-3 3 3 3"/></svg></span>',
        '<span class="export-type-icon">&#9638;</span>':'<span class="export-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 16v-5M12 16V7M17 16V4"/></svg></span>',
        '<span class="export-type-icon">&#10003;</span>':'<span class="export-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M8 14h8"/></svg></span>',
        '<span class="export-type-icon">&#9651;</span>':'<span class="export-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M4 20h16"/></svg></span>',
        '<span class="export-type-icon">&#8862;</span>':'<span class="export-type-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/></svg></span>',
    }
    for old, new in icons.items():
        replace_one(old, new, "Report line icon")

    replace_one(
        '<span class="role-icon" style="background:rgba(199,62,84,.10);color:#C73E54">&#128737;</span>',
        '<span class="role-icon smtinel-role-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z"/><path d="m9 12 2 2 4-5"/></svg></span>',
        "Quality role line icon"
    )
    replace_one(
        '<span class="role-icon" style="background:rgba(107,142,90,.10);color:#6B8E5A">&#128084;</span>',
        '<span class="role-icon smtinel-role-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l2 4-6 4-6-4 2-4z"/><path d="M12 12v9"/><path d="M8 21h8"/></svg></span>',
        "Executive role line icon"
    )

    redx_css = r'''
<style id="smtinel-redx-focused-palette-v20">
:root{
  --rx-red:#9D3B43;--rx-red-2:#B9565D;--rx-red-soft:#F4E8E9;
  --rx-ink:#292526;--rx-muted:#746D6F;--rx-line:#DDD6D7;
  --rx-paper:#F5F3F1;--rx-card:#FCFBFA;--rx-green:#5E7668;--rx-amber:#A18455;
}
html.smtinel-theme-light body{background:var(--rx-paper)!important;color:var(--rx-ink)!important}
html.smtinel-theme-light body #module-workspace,
html.smtinel-theme-light body #yieldflow-section,
html.smtinel-theme-light body #boardimpact-section,
html.smtinel-theme-light body #bonepile-section,
html.smtinel-theme-light body #exportcenter-section{color:var(--rx-ink)!important}
html.smtinel-theme-light body #module-workspace>div:first-child,
html.smtinel-theme-light body #yieldflow-section>div:first-child,
html.smtinel-theme-light body #boardimpact-section,
html.smtinel-theme-light body #bonepile-section,
html.smtinel-theme-light body #exportcenter-section{
  background:var(--rx-card)!important;background-image:none!important;
  border-color:var(--rx-line)!important;box-shadow:0 8px 26px rgba(55,43,46,.045)!important
}
html.smtinel-theme-light body #yieldflow-section>div:first-child,
html.smtinel-theme-light body #boardimpact-section,
html.smtinel-theme-light body #bonepile-section,
html.smtinel-theme-light body #exportcenter-section{border-top:3px solid var(--rx-red)!important}
html.smtinel-theme-light body .smtinel-desktop-sidebar{background:#F9F7F5!important;border-right-color:#E4DDDE!important}
html.smtinel-theme-light body .smtinel-side-btn{color:#5F585A!important;background:transparent!important;border-color:transparent!important}
html.smtinel-theme-light body .smtinel-side-btn:hover{background:#F1ECEB!important;color:#332E30!important}
html.smtinel-theme-light body .smtinel-side-btn.active{background:#F2E7E8!important;color:#7F2F36!important;border-color:#DFC5C7!important;box-shadow:inset 3px 0 0 var(--rx-red)!important}
html.smtinel-theme-light body .smtinel-side-ico,
html.smtinel-theme-light body .smtinel-tab-icon{color:#8B555A!important}
html.smtinel-theme-light body .smtinel-side-btn.active .smtinel-side-ico{color:var(--rx-red)!important}
html.smtinel-theme-light body .smtinel-redx-module-head{padding:18px 20px;border-bottom:1px solid #E6DFE0;background:#FBF9F8;color:var(--rx-ink)}
html.smtinel-theme-light body .smtinel-redx-module-head h2{margin:4px 0 0;font-size:26px;letter-spacing:-.035em}
html.smtinel-theme-light body .smtinel-redx-module-head p{margin:7px 0 0;color:var(--rx-muted);font-size:12px;line-height:1.5}
html.smtinel-theme-light body .smtinel-redx-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--rx-red)}
html.smtinel-theme-light body .smtinel-bottom-nav{grid-template-columns:repeat(4,1fr)!important;background:rgba(248,246,244,.94)!important;border:1px solid #DDD5D6!important;box-shadow:0 -10px 26px rgba(55,43,46,.10)!important}
html.smtinel-theme-light body .smtinel-tab{color:#675F61!important}
html.smtinel-theme-light body .smtinel-tab.active{color:var(--rx-red)!important;background:#F1E6E7!important}
html.smtinel-theme-light body .smtinel-bottom-nav svg,
html.smtinel-theme-light body .smtinel-desktop-sidebar svg{fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important}

/* Preserve the existing black-theme switch. The dark palette gets the same Red X hierarchy. */
html:not(.smtinel-theme-light) body{
  --rx-dark-bg:#0C0B0B;--rx-dark-card:#151313;--rx-dark-line:#342D2F;--rx-dark-text:#EEE9E7;--rx-dark-muted:#AAA1A2;
  background:var(--rx-dark-bg)!important;color:var(--rx-dark-text)!important
}
html:not(.smtinel-theme-light) body .smtinel-desktop-sidebar{background:#100E0F!important;border-right-color:#312A2C!important}
html:not(.smtinel-theme-light) body .smtinel-side-btn{color:#B7AFB0!important;background:transparent!important}
html:not(.smtinel-theme-light) body .smtinel-side-btn:hover{background:#1B1718!important}
html:not(.smtinel-theme-light) body .smtinel-side-btn.active{background:#271A1C!important;color:#E7CED0!important;border-color:#51343A!important;box-shadow:inset 3px 0 0 #B9565D!important}
html:not(.smtinel-theme-light) body .smtinel-side-ico,
html:not(.smtinel-theme-light) body .smtinel-tab-icon{color:#C07077!important}
html:not(.smtinel-theme-light) body #exportcenter-section{background:var(--rx-dark-card)!important;border-color:var(--rx-dark-line)!important;border-top:3px solid #B9565D!important}
html:not(.smtinel-theme-light) body .smtinel-redx-module-head{padding:18px 20px;border-bottom:1px solid var(--rx-dark-line);background:#121011;color:var(--rx-dark-text)}
html:not(.smtinel-theme-light) body .smtinel-redx-module-head h2{margin:4px 0 0;font-size:26px}
html:not(.smtinel-theme-light) body .smtinel-redx-module-head p{margin:7px 0 0;color:var(--rx-dark-muted);font-size:12px}
html:not(.smtinel-theme-light) body .smtinel-redx-kicker{font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#C66B73}
html:not(.smtinel-theme-light) body .smtinel-bottom-nav{grid-template-columns:repeat(4,1fr)!important;background:rgba(15,13,14,.96)!important;border-color:#392F32!important}
html:not(.smtinel-theme-light) body .smtinel-bottom-nav svg,
html:not(.smtinel-theme-light) body .smtinel-desktop-sidebar svg{fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important}
.smtinel-role-icon svg,.export-type-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
.export-type-icon{font-size:0!important}
@media(max-width:1024px),(hover:none) and (pointer:coarse){
  html body .smtinel-bottom-nav{grid-template-columns:repeat(4,1fr)!important;height:68px!important;bottom:max(8px,env(safe-area-inset-bottom))!important}
}
</style>
'''
    close = text.rfind("</body>")
    if close < 0:
        raise SystemExit("Main </body> not found")
    text = text[:close] + redx_css + text[close:]
    text = MARKER + "\n" + text

APP.write_text(text, encoding="utf-8")

# The deployed root is the real application again.
Path("index.html").write_text(text, encoding="utf-8")
Path("docs").mkdir(exist_ok=True)
Path("docs/index.html").write_text(text, encoding="utf-8")

# Remove the old portal as an alternative entry point. Existing bookmarks return to root.
redirect = '''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/"><title>SMTinel</title></head><body><script>location.replace('/');</script></body></html>'''
Path("home-v2.html").write_text(redirect, encoding="utf-8")
Path("docs/home-v2.html").write_text(redirect, encoding="utf-8")

print("Focused Red X runtime ready.")
