from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='SMTinel Commit Execution Board V2'
if marker not in s:
    s=s.replace('/* SMTinel End-of-Shift Commit Readiness V1','/* SMTinel Commit Execution Board V2 */\n/* SMTinel End-of-Shift Commit Readiness V1',1)

# Section language: keep the PM mental model centered on commit, not on the forecast engine.
s=s.replace('Commit Readiness / JIT Forecast','Commit Execution Board')
s=s.replace('Can the current run complete the requirement by the expected planning window?','What is the requirement, what is complete, what is the balance, and what can delay the commit?')

# Do not call a missing Cesium bridge zero production.
s=s.replace("remaining=plan==null?null:Math.max(0,plan-completedGood)","remaining=(plan==null||!terminal)?null:Math.max(0,plan-completedGood)")
s=s.replace("progress=m.plan==null?'N/D':('<b>'+Number(m.completedGood||0).toLocaleString()+'</b> good / '+Number(m.remaining||0).toLocaleString()+' remain')","progress=m.plan==null?'N/D':(m.terminal==='N/D'?'<b>FT completion N/D</b><div style=\"font-size:9px;color:#60758f;margin-top:2px\">Current SFC WIP '+Number(g.units||0).toLocaleString()+' · FT not observed</div>':('<b>'+Number(m.completedGood||0).toLocaleString()+'</b> good / '+Number(m.remaining||0).toLocaleString()+' remain'))")

# Past due is a different state from future risk. Forecast is pending until Cesium exists.
s=s.replace("if(cutMs>dueMs&&remaining>0)status='AT RISK'","if(cutMs>dueMs&&(remaining>0||!terminal))status='PAST DUE'")
s=s.replace("else if(!terminal||confidence==='LOW'||(marginHours!=null&&marginHours<24))status='WATCH'","else if(!terminal)status='FORECAST PENDING';else if(confidence==='LOW'||(marginHours!=null&&marginHours<24))status='WATCH'")

# If FT is not visible, SFC is authoritative for the blocker and mobilization.
s=s.replace("pendingToFt!=null&&pendingToFt>0&&smtUnits>0&&pendingToFt>=Math.max(1,(remaining||0)*0.4)","pendingToFt!=null&&pendingToFt>0&&!terminal")
s=s.replace(".filter(function(x){return x.rank>=0&&x.rank<=stockRank}).sort(function(a,b){return b.qty-a.qty})[0]",".filter(function(x){return x.qty>0}).sort(function(a,b){return b.qty-a.qty||b.rank-a.rank})[0]")
s=s.replace("mobilize='Production / Process / Quality'","mobilize=(up&&reportCommitStationCode(up.station)==='STOCKIN')?'Test / Production':'Production / Process / Quality'",1)

# HxH detail only exists when Cesium evidence exists.
s=s.replace("function reportCommitEvidenceHtml(m){var hrs=","function reportCommitEvidenceHtml(m){if(!m||m.ftObserved<=0||m.terminal==='N/D')return '<div style=\"margin-top:5px;padding:6px 8px;border:1px solid #d9e2ec;border-radius:5px;background:#f8fafc;color:#60758f;font-size:9px\"><b>Cesium performance:</b> No FT evidence detected for this WO. SFC remains the blocker source.</div>';var hrs=",1)

# Add current location + execution state to the familiar commit matrix.
needle="fpy=m.fpy==null?'N/D':m.fpy.toFixed(1)+'%';return"
insert="fpy=m.fpy==null?'N/D':m.fpy.toFixed(1)+'%',sfcQ=Object.keys(g.stations||{}).map(function(st){return{station:st,qty:Number(g.stations[st]||0),rank:reportCommitStationRank(st)}}).filter(function(x){return x.qty>0}).sort(function(a,b){return b.qty-a.qty||b.rank-a.rank}),loc=sfcQ[0]||null,execState=m.ftObserved>0&&m.terminal!=='N/D'?'FT ACTIVE':(loc&&reportCommitStationCode(loc.station)==='STOCKIN'?'WAITING FT':(loc?'UPSTREAM':'DATA NEEDED')),currentLocation=loc?(reportCommitStationCode(loc.station)+' · '+loc.qty):'N/D';return"
s=s.replace(needle,insert,1)
s=s.replace("<th style=\"'+th+'\">WO</th><th style=\"'+th+'\">Requirement</th>","<th style=\"'+th+'\">WO</th><th style=\"'+th+'\">Current Location</th><th style=\"'+th+'\">Requirement</th>",1)
s=s.replace("<td style=\"'+td+'\"><b>'+esc(g.wo||'N/D')+'</b></td><td style=\"'+td+'text-align:right\">'+plan+","<td style=\"'+td+'\"><b>'+esc(g.wo||'N/D')+'</b></td><td style=\"'+td+'\"><b>'+esc(currentLocation)+'</b><div style=\"font-size:9px;color:#60758f\">'+esc(execState)+'</div></td><td style=\"'+td+'text-align:right\">'+plan+",1)
s=s.replace('colspan="13"','colspan="14"',1)

# Status colors for the new semantics.
s=re.sub(r"function reportCommitRiskRank\(status\)\{.*?\}\n", "function reportCommitRiskRank(status){var x=String(status||'').toUpperCase();return x==='PAST DUE'?7:(x==='BLOCKED'?6:(x==='AT RISK'?5:(x==='WATCH'?4:(x==='FORECAST PENDING'?3:(x==='DATA NEEDED'?2:(x==='ON TRACK'?1:0))))))}\n", s, count=1)
s=s.replace("if(s==='BLOCKED')return{color:'#8f1d15',bg:'#fdecea'};","if(s==='PAST DUE')return{color:'#8f1d15',bg:'#fde7e4'};if(s==='BLOCKED')return{color:'#8f1d15',bg:'#fdecea'};",1)
s=s.replace("if(s==='WATCH')return{color:'#946200',bg:'#fff8e6'};","if(s==='WATCH')return{color:'#946200',bg:'#fff8e6'};if(s==='FORECAST PENDING')return{color:'#315d8e',bg:'#eef5ff'};",1)

# Top-level attention includes past-due WOs, but missing forecast does not become fake risk.
s=s.replace("m.status==='AT RISK'||m.status==='BLOCKED'","m.status==='AT RISK'||m.status==='BLOCKED'||m.status==='PAST DUE'")
s=s.replace("'At risk / blocked'","'At risk / blocked / past due'")

# Landing navigation + default open state.
s=s.replace("'Executive Snapshot by Business Unit',\n      'Work Order Breakdown by Business Unit',","'Executive Snapshot by Business Unit',\n      'Commit Execution Board',\n      'Work Order Breakdown by Business Unit',",1)
s=s.replace('Shift Overview|Weekly Decision Overview','Shift Overview|Commit Execution Board|Weekly Decision Overview',1)

# Fix pale values exported by adaptive styling in standalone reports.
call="setupProductionFilters();\n    setupExecutiveQualityPrototype();"
fix="setupProductionFilters();\n    [].slice.call(content.querySelectorAll('[style*=\\\"rgb(232, 232, 230)\\\"]')).forEach(function(el){el.style.setProperty('color','#536b86','important')});\n    setupExecutiveQualityPrototype();"
s=s.replace(call,fix,1)

# Source note must state the authority handoff clearly.
s=s.replace('Forecast Finish uses the highest downstream Cesium Test Area with PASS evidence and the observed good output rate across up to the last four complete hours since that Test Area became active.','SFC remains the blocker source until Cesium activity is observed. Forecast Finish is enabled only after FT evidence exists, using the highest downstream Cesium Test Area with PASS evidence and the observed good output rate across up to the last four complete hours since that Test Area became active.')

p.write_text(s,encoding='utf-8',newline='')
print('SMTinel Commit Execution Board V2 applied')
