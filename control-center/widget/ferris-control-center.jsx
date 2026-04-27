const CONFIG_PATH = '/Users/Shared/FerrisControlCenter/config.json';

const fallbackDataPath = '/Users/levikritzik/.openclaw/workspace/ferris-control-center/data/business-state.json';

export const command = `python3 - <<'PY'
import json, os, urllib.request
config_path = ${JSON.stringify('/Users/Shared/FerrisControlCenter/config.json')}
fallback_path = ${JSON.stringify('/Users/levikritzik/.openclaw/workspace/ferris-control-center/data/business-state.json')}
config = {}
if os.path.exists(config_path):
    try:
        with open(config_path) as f:
            config = json.load(f)
    except Exception:
        config = {}
url = config.get('dataUrl')
path = config.get('dataPath') or fallback_path
if url:
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            print(r.read().decode('utf-8'))
            raise SystemExit
    except Exception:
        pass
with open(path) as f:
    print(f.read())
PY`;

export const refreshFrequency = 30000;
export const className = `
  top: 20px;
  left: 20px;
  width: 420px;
  padding: 18px;
  background: rgba(15,18,24,0.86);
  color: #fff;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  font-family: Inter, system-ui, sans-serif;
  z-index: 99999;
  .eyebrow { font-size: 11px; color: #8fb7ff; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; font-weight: 700; }
  .title { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
  .grid { display:grid; grid-template-columns: repeat(3,1fr); gap:10px; margin-bottom: 12px; }
  .card { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; }
  .label { font-size: 11px; color: rgba(255,255,255,.6); text-transform: uppercase; margin-bottom: 4px; }
  .value { font-size: 24px; font-weight: 800; }
  ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; }
  li { background: rgba(255,255,255,0.04); padding:10px 12px; border-radius:12px; }
  .item { font-size: 14px; font-weight: 700; }
  .note { font-size: 12px; color: rgba(255,255,255,.72); margin-top: 4px; }
  .footer { font-size:11px; color: rgba(255,255,255,.55); margin-top: 10px; }
`;
export const render = ({output}) => {
  let data = {meta:{lastUpdated:'unknown'},earnings:{currentRevenue:0,goal:50000},leads:{total:0,hot:0,warm:0,closed:0},today:[]};
  try { data = JSON.parse(output); } catch (e) {}
  const rev = data.earnings?.currentRevenue || 0;
  const goal = data.earnings?.goal || 50000;
  const gap = Math.max(goal - rev, 0);
  const leads = data.leads || {total:0,hot:0,warm:0,closed:0};
  const tasks = (data.today || []).slice(0,3);
  return <div>
    <div className='eyebrow'>Ferris Control Center</div>
    <div className='title'>FerrisAutomations</div>
    <div className='grid'>
      <div className='card'><div className='label'>Revenue</div><div className='value'>${rev}</div></div>
      <div className='card'><div className='label'>To Goal</div><div className='value'>${gap}</div></div>
      <div className='card'><div className='label'>Leads</div><div className='value'>{leads.total||0}</div></div>
    </div>
    <div className='grid'>
      <div className='card'><div className='label'>Hot</div><div className='value'>{leads.hot||0}</div></div>
      <div className='card'><div className='label'>Warm</div><div className='value'>{leads.warm||0}</div></div>
      <div className='card'><div className='label'>Closed</div><div className='value'>{leads.closed||0}</div></div>
    </div>
    <ul>{tasks.map((t,i)=><li key={i}><div className='item'>{t.title}</div><div className='note'>{t.note}</div></li>)}</ul>
    <div className='footer'>Updated: {data.meta?.lastUpdated||'unknown'} • auto-refresh 30s</div>
  </div>
}
