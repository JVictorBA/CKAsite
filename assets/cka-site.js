import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

(() => {
  const config = window.CKA_SUPABASE_CONFIG;
  if (!config?.url || !config?.publishableKey) return;
  const fetchWithTimeout = (input, init = {}) => {
    const controller = new AbortController();
    const originalSignal = init.signal;
    const abortFromCaller = () => controller.abort();
    if (originalSignal?.aborted) controller.abort();
    else originalSignal?.addEventListener('abort', abortFromCaller, { once: true });
    const timer = window.setTimeout(() => controller.abort(), 20000);
    return fetch(input, { ...init, signal: controller.signal }).finally(() => {
      window.clearTimeout(timer);
      originalSignal?.removeEventListener('abort', abortFromCaller);
    });
  };
  const db = createClient(config.url, config.publishableKey, { global: { fetch: fetchWithTimeout } });
  const publicState = { races: [], pilots: [], teams: [], stagePoints: [], standings: [], results: [], ready: false, error: null };
  function showPublicSyncNotice(message) {
    if(!publicState.ready)window.ckaMarkLiveDataFailed?.(`${message} A tabela antiga foi ocultada para não apresentar pontos incorretos.`);
    let notice = document.getElementById('cka-public-sync-warning');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'cka-public-sync-warning';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      const text = document.createElement('span');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Tentar sincronizar';
      retry.onclick = async () => {
        retry.disabled = true;
        retry.textContent = 'Sincronizando…';
        await refreshPublicData();
        if (document.body.contains(retry)) {
          retry.disabled = false;
          retry.textContent = 'Tentar sincronizar';
        }
      };
      notice.append(text, retry);
      document.body.append(notice);
    }
    notice.querySelector('span').textContent = message;
  }
  function clearPublicSyncNotice() {
    document.getElementById('cka-public-sync-warning')?.remove();
  }
  const nav = document.querySelector('.tabs');
  const main = document.querySelector('main');
  if (!nav || !main) return;

  const style = document.createElement('style');
  style.textContent = `
    :root{--cka-night:#070d16;--cka-navy:#0d1928;--cka-card:#111f31;--cka-line:#29415b;--cka-orange:#ff922e;--cka-gold:#ffd54a;--cka-green:#78d989;--cka-teal:#41c6bb;--cka-text:#f4f7fb;--cka-muted:#9eacc0}
    @keyframes ckaPanelEnter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
    main .panel.active{animation:ckaPanelEnter .28s cubic-bezier(.2,.7,.2,1) both}
    @media(prefers-reduced-motion:reduce){main .panel.active{animation:none}}
    body{background:radial-gradient(ellipse at 78% 0%,rgba(49,91,115,.24),transparent 38%),radial-gradient(ellipse at 0% 45%,rgba(30,75,88,.15),transparent 40%),var(--cka-night);color:var(--cka-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    .wrap{width:min(1480px,calc(100% - 40px))}
    .top{height:78px!important;min-height:78px!important;margin:12px auto 0;padding:0 20px!important;position:sticky;top:8px;z-index:80;display:flex;justify-content:space-between!important;gap:18px;border:1px solid rgba(91,143,187,.32)!important;border-radius:20px!important;background:rgba(8,18,31,.94)!important;box-shadow:0 14px 40px rgba(0,0,0,.34)!important;backdrop-filter:blur(18px)}
    .top:before,.top:after{pointer-events:none}
    .top .brand{display:flex!important;position:relative;z-index:2;align-items:center;gap:11px;color:#fff;font-size:17px;letter-spacing:.05em;white-space:nowrap}
    .top .brand img{width:42px!important;height:42px!important;object-fit:contain;border-radius:12px}
    .top .brand small{display:block!important;margin-top:4px;color:var(--cka-gold)!important;font-size:8px!important;letter-spacing:.18em}
    .top .ey,.top .top-nav{display:none!important}
    .top .tabs{position:relative;z-index:2;display:flex!important;justify-content:flex-end;align-items:center;gap:5px;margin:0 0 0 auto;padding:0;overflow-x:auto;scrollbar-width:none}
    .top .tabs::-webkit-scrollbar{display:none}
    .top .tab{min-width:0;padding:11px 13px;border:1px solid transparent;border-radius:11px;background:transparent;color:#c2cedd;font-size:12px;font-weight:750;letter-spacing:.01em;transition:background .18s,border-color .18s,color .18s}
    .top .tab:hover{background:rgba(255,255,255,.06);color:#fff}
    .top .tab.active{background:linear-gradient(110deg,rgba(255,146,46,.22),rgba(255,213,74,.1));border-color:rgba(255,164,61,.55);color:#ffe18a;box-shadow:inset 0 0 0 1px rgba(255,213,74,.08)}
    main.wrap{padding-bottom:24px}
    .hero{position:relative;display:flex;min-height:300px;margin:20px 0 22px;padding:clamp(28px,5vw,58px);flex-direction:column;align-items:flex-start;justify-content:center;overflow:hidden;border:1px solid rgba(79,139,187,.38);border-radius:24px;background:radial-gradient(circle at 83% 50%,rgba(55,110,124,.28),transparent 24%),linear-gradient(115deg,#101e30 0%,#0c1827 56%,#121d2b 100%);box-shadow:0 24px 55px rgba(0,0,0,.25)}
    .hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,17,28,.1),transparent 55%,rgba(11,25,39,.15));pointer-events:none}
    .hero:after{content:"";position:absolute;z-index:0;right:3%;top:50%;width:min(30vw,310px);height:min(30vw,310px);transform:translateY(-50%);background:url('assets/cka-mark.png') center/contain no-repeat;opacity:.14;filter:grayscale(1);pointer-events:none}
    .hero>*{position:relative;z-index:1}
    .hero .ey{color:var(--cka-gold);font-size:11px;letter-spacing:.2em}
    .hero h1{max-width:800px;margin:16px 0 12px;font-size:clamp(34px,5.4vw,68px);line-height:.98;letter-spacing:-.045em;text-transform:none}
    .hero p{max-width:560px;margin:0;color:#b7c5d6;font-size:15px;line-height:1.55}
    .cka-hero-cta{margin-top:22px;padding:12px 18px;border-radius:11px!important;background:linear-gradient(105deg,#ff9b35,#ffd34b)!important;border:0!important;color:#141a21!important;font-weight:850;box-shadow:0 8px 24px rgba(255,151,49,.2)}
    .tabs:not(.top .tabs){display:none!important}
    .panel{margin:22px 0 30px;padding:0;background:transparent}
    .head{display:flex;align-items:end;gap:20px;margin:24px 4px 16px}
    .head .ey{color:var(--cka-teal);font-size:10px;letter-spacing:.2em}
    .head h2{margin:6px 0 0;font-size:clamp(24px,3vw,34px);letter-spacing:-.035em}
    .head p{max-width:440px;margin:0 0 3px;color:var(--cka-muted);font-size:12px;line-height:1.5}
    .note{margin:0 4px 14px;padding:12px 15px;border:1px solid rgba(78,122,158,.26);border-left:3px solid var(--cka-teal);border-radius:0 12px 12px 0;background:rgba(16,31,48,.7);color:#adbed0;line-height:1.5}
    .scroll{border:1px solid rgba(74,116,154,.38);border-radius:18px;background:rgba(13,25,40,.78);box-shadow:0 16px 42px rgba(0,0,0,.16)}
    #classification.table{min-width:1480px;background:transparent}
    #classification .row{background:rgba(15,29,46,.92);border-color:rgba(76,112,146,.24)}
    #classification .row.headrow{background:linear-gradient(100deg,#182c40,#1a2638);color:#b5c3d2}
    #classification .row:not(.headrow):hover{background:#192b40}
    #teams .teams{border:1px solid rgba(74,116,154,.38);border-radius:18px;overflow:hidden;background:rgba(13,25,40,.78)}
    #teams .teamrow{background:rgba(15,29,46,.92);border-color:rgba(76,112,146,.24)}
    #teams .teamrow.headrow{background:linear-gradient(100deg,#182c40,#1a2638)}
    .pilotcards{gap:12px;border:0;background:transparent;overflow:visible}
    .pilot-card{border:1px solid rgba(74,116,154,.4)!important;border-radius:16px!important;background:linear-gradient(120deg,rgba(19,34,52,.98),rgba(13,24,39,.98))!important;box-shadow:0 12px 30px rgba(0,0,0,.17)}
    .pilot-card:hover{border-color:rgba(255,165,60,.55)!important;transform:translateY(-2px)}
    .result-buttons{display:flex;gap:9px;overflow-x:auto;padding:4px 2px 12px;scrollbar-width:thin}
    .result-buttons .result-btn{flex:0 0 auto;border:1px solid #314b67!important;border-radius:12px!important;background:#132238!important;color:#d7e1ec!important;padding:12px 16px!important;font-weight:750}
    .result-buttons .result-btn.active{border-color:var(--cka-orange)!important;background:linear-gradient(105deg,#ff9b35,#ffd34b)!important;color:#141a21!important}
    #results.results{overflow:hidden;border:1px solid rgba(74,116,154,.4);border-radius:18px;background:rgba(13,25,40,.82);box-shadow:0 16px 42px rgba(0,0,0,.16)}
    #results .resultrow{background:transparent!important;border-color:rgba(76,112,146,.24)!important}
    #results .resultrow:first-child{background:linear-gradient(100deg,#182c40,#1a2638)!important;color:#bdcad8}
    #results .resultrow:not(:first-child):hover{background:rgba(35,55,78,.5)!important}
    footer.wrap{display:flex;justify-content:space-between;gap:12px;padding:18px 4px 24px;border-top:1px solid rgba(74,116,154,.25);color:#8394aa;font-size:11px}
    @media(max-width:850px){.wrap{width:min(100% - 24px,1480px)}.top{height:auto!important;min-height:68px!important;padding:8px 12px!important;gap:8px}.top .brand{font-size:13px}.top .brand img{width:34px!important;height:34px!important}.top .tabs{gap:2px}.top .tab{padding:9px 8px;font-size:11px}.hero{min-height:260px}.hero:after{right:-5%;width:240px;height:240px;opacity:.1}}
    @media(max-width:560px){.wrap{width:calc(100% - 20px)}.top{position:relative;top:0;flex-wrap:wrap;border-radius:16px!important}.top .brand{font-size:12px}.top .tabs{width:100%;justify-content:flex-start;margin:0;order:2}.top .tab{padding:8px 10px;font-size:10px}.hero{min-height:250px;margin-top:12px;padding:25px 21px;border-radius:18px}.hero h1{max-width:340px;font-size:clamp(33px,10vw,48px)}.hero p{max-width:300px;font-size:13px}.hero:after{right:-44px;top:24%;width:190px;height:190px}.head{display:block;margin:20px 2px 12px}.head p{margin-top:8px}.note{font-size:11px}.scroll{border-radius:14px}footer.wrap{display:block;line-height:1.8}}
    .top{height:auto!important;min-height:64px;padding-top:8px;padding-bottom:8px}.top .tabs{height:auto;flex-wrap:wrap;overflow:visible;justify-content:flex-end}
    .cka-extra{margin-top:24px}.cka-extra[hidden]{display:none!important}
    .cka-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
    .cka-card,.cka-box{padding:18px;border:1px solid #2a405e;border-radius:14px;background:#101b2b;color:#edf3fc}
    .cka-card h3{margin:6px 0 10px}.cka-muted{color:#9cacc2}.cka-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:14px 0}
    .cka-form label{display:grid;gap:6px;color:#b7c4d8;font-size:12px}.cka-form input,.cka-form select,.cka-form textarea{width:100%;padding:10px;border:1px solid #344962;border-radius:8px;background:#0b1421;color:#f5f7fb;font:inherit}
    .cka-result-toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin:16px 0}.cka-result-toolbar label{display:grid;gap:6px;color:#b7c4d8;font-size:12px}.cka-result-toolbar select{min-width:250px;padding:10px;border:1px solid #344962;border-radius:8px;background:#0b1421;color:#f5f7fb;font:inherit}.cka-result-scroll,.cka-pilots-scroll{overflow:auto;border:1px solid #2a405e;border-radius:10px}.cka-result-table,.cka-pilots-table{width:100%;min-width:1100px;border-collapse:collapse}.cka-result-table th,.cka-result-table td,.cka-pilots-table th,.cka-pilots-table td{padding:9px;border-bottom:1px solid #273950;text-align:left}.cka-result-table th,.cka-pilots-table th{color:#9cacc2;font-size:11px;text-transform:uppercase}.cka-result-table input,.cka-result-table select{max-width:150px;padding:8px;border:1px solid #344962;border-radius:7px;background:#0b1421;color:#f5f7fb;font:inherit}.cka-result-table .cka-pilot-cell{min-width:150px;font-weight:700}.cka-result-table .cka-check{width:18px;height:18px;accent-color:#ff982d}.cka-result-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0}.cka-result-empty{padding:18px;color:#9cacc2}.cka-pilots-table{min-width:650px;margin-top:18px}.cka-pilot-inactive{color:#ffbd64}
    .cka-form textarea{min-height:70px}.cka-action{border:1px solid #3d75aa;border-radius:8px;padding:10px 14px;background:#123355;color:#fff;font-weight:700;cursor:pointer}.cka-action.primary{background:#ff982d;color:#17120c;border-color:#ff982d}
    .cka-stack{display:grid;gap:18px}.cka-status{min-height:20px;color:#8ce0ad}.cka-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.cka-tabs button{background:#15243a;color:#eaf1fb;border:1px solid #304560;border-radius:8px;padding:9px 12px;cursor:pointer}.cka-tabs button.active{border-color:#ff982d;color:#ffbd64}
    .cka-media img{width:100%;max-height:320px;object-fit:cover;border-radius:10px}.cka-media iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:10px}
    .cka-winner{display:flex;align-items:center;gap:12px}.cka-winner img{width:54px;height:54px;object-fit:cover;object-position:top;border-radius:50%;background:#192d45}
    @media(max-width:560px){.cka-extra .head h2{font-size:25px}.cka-form{grid-template-columns:1fr}}
    .top{height:78px!important;min-height:78px!important;padding:0 20px!important;flex-wrap:nowrap!important;justify-content:space-between!important}
    .top .tabs{height:auto!important;flex-wrap:nowrap!important;overflow-x:auto!important;justify-content:flex-end!important}
    .top .tab{min-width:0!important}
    @media(max-width:850px){.top{height:auto!important;min-height:68px!important;padding:8px 12px!important;flex-wrap:nowrap!important}.top .tabs{overflow-x:auto!important;flex-wrap:nowrap!important;justify-content:flex-end!important}}
    @media(max-width:560px){.top{height:auto!important;min-height:0!important;padding:9px 10px!important;flex-wrap:wrap!important;justify-content:flex-start!important}.top .tabs{width:100%;order:2;justify-content:flex-start!important;margin:0!important}.top .brand{font-size:12px}.top .tab{padding:8px 10px;font-size:10px}}
    .top{background:rgba(11,13,16,.88)!important;border-color:rgba(255,255,255,.09)!important;border-radius:18px!important;backdrop-filter:blur(12px)!important}
    .top .brand img{filter:drop-shadow(0 0 10px rgba(212,175,55,.3))}
    .top .brand span{font-size:15px;letter-spacing:.02em}
    .top .brand small{color:#d4af37!important}
    .top .tab{border-radius:999px!important;color:#c5ccd6}
    .top .tab.active{border-color:rgba(212,175,55,.62)!important;background:rgba(212,175,55,.1)!important;color:#f1d98a!important;box-shadow:0 0 18px rgba(212,175,55,.08)!important}
    .cka-home-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.8fr);gap:16px;align-items:stretch;margin:22px 0 26px}
    .cka-home-layout>.hero{height:100%;min-height:350px;margin:0}
    .hero{border-color:rgba(255,255,255,.09)!important;background:radial-gradient(ellipse at 84% 55%,rgba(0,230,118,.09),transparent 32%),linear-gradient(120deg,#151a22 0%,#10151c 58%,#171c24 100%)!important}
    .hero .ey{color:#d4af37!important}
    .hero h1{text-transform:uppercase!important;letter-spacing:-.035em!important;font-weight:900}
    .hero:after{right:6%!important;width:min(28vw,290px)!important;height:min(28vw,290px)!important;opacity:.1!important;filter:grayscale(1) brightness(1.3)!important}
    .cka-checkered-texture{position:absolute;z-index:0;inset:0 0 0 auto;width:48%;opacity:.065;pointer-events:none;background-image:linear-gradient(45deg,rgba(0,230,118,.8) 25%,transparent 25%,transparent 75%,rgba(0,230,118,.8) 75%),linear-gradient(45deg,rgba(255,235,59,.8) 25%,transparent 25%,transparent 75%,rgba(255,235,59,.8) 75%);background-position:0 0,14px 14px;background-size:28px 28px;mask-image:linear-gradient(90deg,transparent,#000 45%)}
    .hero>*{z-index:1}
    .hero .cka-hero-cta{background:linear-gradient(105deg,#d4af37,#f2ca5c)!important;color:#15130d!important;box-shadow:0 8px 24px rgba(212,175,55,.15)!important}
    .cka-standings-widget{display:flex;min-width:0;flex-direction:column;padding:20px 18px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:linear-gradient(150deg,#171c24,#11161d);box-shadow:0 18px 45px rgba(0,0,0,.25)}
    .cka-widget-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08)}
    .cka-widget-kicker{color:#d4af37;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
    .cka-widget-head h2{margin:5px 0 0;color:#fff;font-size:21px;letter-spacing:-.03em}
    .cka-widget-link{flex:0 0 auto;padding:8px 10px;border:1px solid rgba(212,175,55,.28);border-radius:999px;background:rgba(212,175,55,.07);color:#f1d98a;font-family:inherit;font-size:10px;font-weight:700;cursor:pointer}
    .cka-widget-columns,.cka-mini-standing{display:grid;grid-template-columns:28px minmax(0,1fr) 54px;gap:8px;align-items:center}
    .cka-widget-columns{padding:12px 2px 7px;color:#718096;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    .cka-mini-standing{min-height:48px;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,.055)}
    .cka-mini-standing:last-child{border-bottom:0}
    .cka-mini-pos{color:#8995a4;font-size:12px;font-weight:800}
    .cka-mini-standing:nth-child(2) .cka-mini-pos{color:#f2d36d}
    .cka-mini-standing:nth-child(3) .cka-mini-pos{color:#d4dce5}
    .cka-mini-standing:nth-child(4) .cka-mini-pos{color:#c58b5a}
    .cka-mini-pilot{display:flex;min-width:0;align-items:center;gap:8px}
    .cka-mini-pilot img,.cka-mini-avatar{width:30px;height:30px;min-width:30px;object-fit:cover;object-position:top;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:#202833}
    .cka-mini-name{overflow:hidden;color:#edf1f6;font-size:11px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
    .cka-mini-team{display:block;overflow:hidden;margin-top:2px;color:#8491a2;font-size:9px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
    .cka-mini-points{text-align:right;color:#f3d36d;font-size:14px;font-weight:900}
    .cka-standings-empty{padding:18px 2px;color:#94a3b8;font-size:12px}
    .panel .head h2{color:#fff}
    .panel .head .ey{color:#d4af37!important}
    .note{border-left-color:#00e676!important;background:linear-gradient(90deg,rgba(0,230,118,.045),rgba(20,24,31,.78))!important;color:#aeb8c6}
    .scroll,#teams .teams,#results.results{border-color:rgba(255,255,255,.09)!important;background:#14181f!important}
    #classification .row,#teams .teamrow{background:#14181f!important;border-color:rgba(255,255,255,.065)!important}
    #classification .row.headrow,#teams .teamrow.headrow,#results .resultrow:first-child{background:#1a2028!important;color:#aab5c4!important}
    #classification .row:not(.headrow):hover,#teams .teamrow:not(.headrow):hover{background:#1a2029!important}
    #classification .row:nth-child(2) .pos{color:#f2d36d!important}
    #classification .row:nth-child(3) .pos{color:#d1d9e2!important}
    #classification .row:nth-child(4) .pos{color:#c58b5a!important}
    #classification .pilot small{display:none!important}
    .points{color:#f3d36d!important}.bonus{color:#00e676!important}.stage.gold{color:#f3d36d!important}.stage.silver{color:#d1d9e2!important}.stage.bronze{color:#c58b5a!important}
    #pilotcards.pilotcards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;overflow:visible;border:0;background:transparent}
    #pilotcards .pilotcard:first-child{display:none}
    #pilotcards .pilotcard:not(:first-child){position:relative;display:flex;min-height:190px;flex-direction:column;align-items:flex-start;gap:10px;overflow:hidden;padding:16px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(145deg,#191f28,#11161d);box-shadow:0 12px 30px rgba(0,0,0,.19);transition:transform .18s,border-color .18s}
    #pilotcards .pilotcard:not(:first-child):before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,#d4af37,#00e676,#ffeb3b);opacity:.78}
    #pilotcards .pilotcard:not(:first-child):hover{transform:translateY(-2px);border-color:rgba(212,175,55,.36)}
    #pilotcards .pilotinfo{display:flex;align-items:center;gap:10px;color:#fff;font-size:14px}
    #pilotcards .pilotinfo .avatar,#pilotcards .pilotinfo .placeholder{width:48px;height:48px;min-width:48px;border:1px solid rgba(212,175,55,.22);box-shadow:0 0 16px rgba(212,175,55,.07)}
    #pilotcards .series{padding:5px 8px;border:1px solid rgba(0,230,118,.18);border-radius:999px;background:rgba(0,230,118,.07);color:#76e9a3;font-size:9px;font-weight:800;letter-spacing:.12em}
    #pilotcards .pilotcard>span:last-child{color:#94a3b8;font-size:11px}
    .result-buttons .result-btn.active{border-color:#d4af37!important;background:linear-gradient(110deg,#d4af37,#f2ca5c)!important;color:#15130d!important}
    footer.wrap{position:relative;overflow:hidden;border-color:rgba(255,255,255,.08)!important}
    footer.wrap:after{content:"";position:absolute;right:0;bottom:0;width:130px;height:42px;opacity:.07;background-image:linear-gradient(45deg,#00e676 25%,transparent 25%,transparent 75%,#00e676 75%),linear-gradient(45deg,#ffeb3b 25%,transparent 25%,transparent 75%,#ffeb3b 75%);background-position:0 0,12px 12px;background-size:24px 24px;pointer-events:none}
    @media(max-width:900px){.cka-home-layout{grid-template-columns:minmax(0,1.35fr) minmax(275px,.85fr);gap:12px}.cka-standings-widget{padding:16px 13px}.cka-widget-link{font-size:9px;padding:7px 8px}#pilotcards.pilotcards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:680px){.cka-home-layout{grid-template-columns:1fr}.cka-home-layout>.hero{min-height:285px}.cka-standings-widget{min-height:300px}.cka-mini-standing{min-height:42px}.cka-widget-head h2{font-size:19px}}
    @media(max-width:560px){#pilotcards.pilotcards{grid-template-columns:1fr}.cka-home-layout{margin:12px 0 22px;gap:10px}.cka-home-layout>.hero{min-height:270px}.cka-standings-widget{border-radius:16px}.cka-widget-columns,.cka-mini-standing{grid-template-columns:26px minmax(0,1fr) 48px}.cka-mini-name{font-size:12px}}

    /* Portal esportivo: superfícies abertas, tipografia forte e divisórias discretas. */
    body{background:#0a0c10!important;color:#fff}
    .top{position:sticky!important;inset:0 0 auto!important;width:100%!important;max-width:none!important;height:auto!important;min-height:70px!important;margin:0!important;padding:10px clamp(16px,3.2vw,48px)!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;background:rgba(10,12,16,.95)!important;box-shadow:none!important;backdrop-filter:blur(10px)!important}
    .top .brand img{border-radius:8px!important;filter:drop-shadow(0 0 8px rgba(212,175,55,.2))}
    .top .tab{position:relative;padding:13px 12px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#c1c5cc!important;box-shadow:none!important}
    .top .tab:after{position:absolute;right:12px;bottom:4px;left:12px;height:2px;border-radius:2px;background:#d4af37;content:"";transform:scaleX(0);transform-origin:left;transition:transform .18s ease}
    .top .tab:hover{color:#fff!important;background:rgba(255,255,255,.035)!important}
    .top .tab.active{color:#fff!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .top .tab.active:after{transform:scaleX(1)}
    main.wrap{padding-top:10px}
    .cka-home-layout{grid-template-columns:minmax(0,1.7fr) minmax(310px,.8fr);gap:22px;margin:24px 0 36px}
    .cka-home-layout>.hero{min-height:360px;margin:0;padding:clamp(28px,4vw,54px);border:0!important;border-radius:14px!important;background:linear-gradient(90deg,rgba(10,12,16,.92) 0%,rgba(10,12,16,.68) 50%,rgba(10,12,16,.2) 100%),url("assets/cka-banner.png") center/cover no-repeat,#14181f!important;box-shadow:none!important}
    .hero:before{background:linear-gradient(90deg,rgba(10,12,16,.14),transparent 70%)!important}
    .hero:after{opacity:.08!important}
    .hero h1{max-width:760px!important;font-size:clamp(36px,5.1vw,66px)!important}
    .hero .cka-hero-cta{padding:12px 17px!important;border:0!important;border-radius:8px!important;background:#e5a917!important;color:#15130d!important;box-shadow:none!important}
    .cka-standings-widget{padding:18px 0!important;border:0!important;border-radius:14px!important;background:#14181f!important;box-shadow:none!important}
    .cka-widget-head{align-items:center!important;margin:0 16px;padding-bottom:12px!important;border-bottom:1px solid rgba(255,255,255,.08)!important}
    .cka-widget-kicker{display:none}
    .cka-widget-head h2{margin:0!important;font-size:20px!important}
    .cka-widget-link{padding:5px 0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#e5b644!important;font-size:11px!important}
    .cka-widget-link:hover{color:#fff!important}
    .cka-widget-columns,.cka-mini-list{margin-right:16px;margin-left:16px}
    .cka-widget-columns{grid-template-columns:28px minmax(0,1fr) 54px!important;padding-top:12px!important}
    .cka-mini-standing{grid-template-columns:28px minmax(0,1fr) 54px!important;min-height:49px!important;border-bottom-color:rgba(255,255,255,.065)!important}
    .cka-mini-pilot img,.cka-mini-avatar{border:0!important;border-radius:8px!important;background-color:transparent!important;box-shadow:none!important}
    .cka-mini-avatar{background:url("assets/cka-mark.png") center/contain no-repeat!important;opacity:.72}
    .scroll,#teams .teams,#results.results,.cka-result-scroll,.cka-pilots-scroll{overflow-x:auto!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    #classification.table{background:transparent!important}
    #classification .row,#teams .teamrow,#results .resultrow{border:0!important;border-bottom:1px solid rgba(255,255,255,.065)!important;border-radius:0!important;background:transparent!important}
    #classification .row.headrow,#teams .teamrow.headrow,#results .resultrow:first-child{border-bottom-color:rgba(255,255,255,.1)!important;background:#14181f!important;color:#aab5c4!important}
    #classification .row:not(.headrow):hover,#teams .teamrow:not(.headrow):hover,#results .resultrow:not(:first-child):hover{background:rgba(255,255,255,.025)!important}
    #pilotcards.pilotcards{gap:20px!important}
    #pilotcards .pilotcard:not(:first-child){min-height:0!important;gap:8px!important;padding:12px 0 16px!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transition:opacity .18s ease!important}
    #pilotcards .pilotcard:not(:first-child):before{display:none!important}
    #pilotcards .pilotcard:not(:first-child):hover{transform:none!important;border-color:rgba(255,255,255,.08)!important;opacity:.88}
    #pilotcards .pilotinfo .avatar,#pilotcards .pilotinfo .placeholder{border:0!important;border-radius:10px!important;box-shadow:none!important;background-color:#171c24!important}
    .panel{margin-top:30px!important}
    .note{border:0!important;border-left:2px solid #00e676!important;border-radius:0!important;background:rgba(20,24,31,.7)!important}
    footer.wrap{border-top:1px solid rgba(255,255,255,.08)!important}
    @media(max-width:900px){.cka-home-layout{grid-template-columns:minmax(0,1.35fr) minmax(275px,.85fr);gap:16px}}
    @media(max-width:680px){.top{flex-wrap:wrap!important}.top .tabs{width:100%;justify-content:flex-start!important}.top .tab{padding:10px 10px!important}.cka-home-layout{grid-template-columns:1fr;gap:12px}.cka-home-layout>.hero{min-height:300px}.cka-standings-widget{min-height:0;padding:16px 0!important}}
    @media(max-width:560px){.top{padding:8px 14px!important}.top .tabs{overflow-x:auto!important;flex-wrap:nowrap!important}.top .tab{flex:0 0 auto;padding:9px 9px!important;font-size:10px!important}.cka-home-layout{margin:14px 0 26px}.cka-home-layout>.hero{min-height:270px;padding:24px 20px!important;border-radius:12px!important}.cka-home-layout>.hero h1{font-size:clamp(32px,9vw,46px)!important}.cka-standings-widget{border-radius:12px!important}.cka-widget-head,.cka-widget-columns,.cka-mini-list{margin-right:12px;margin-left:12px}}

    /* A mesma linguagem visual em todas as seções públicas e no painel administrativo. */
    .panel .head{margin:30px 0 16px!important}
    .panel .head h2{font-size:clamp(25px,3.4vw,36px)!important;letter-spacing:-.035em}
    .panel .head p{color:#9ba3ae!important}
    .cka-content,.cka-extra .cka-content{min-width:0}
    .cka-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))!important;gap:18px!important}
    .cka-card{padding:18px!important;border:0!important;border-radius:12px!important;background:#14181f!important;color:#f4f5f7!important;box-shadow:none!important}
    .cka-card h3{color:#fff}
    .cka-card .ey{color:#d4af37!important}
    .cka-muted,.cka-card .cka-muted{color:#9ba3ae!important}
    #cka-admin .cka-box{padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#f4f5f7!important;box-shadow:none!important}
    #cka-admin .cka-box>div:first-child{padding:0 0 14px;border-bottom:1px solid rgba(255,255,255,.08)}
    #cka-admin .cka-tabs{display:flex;gap:18px!important;overflow-x:auto;flex-wrap:nowrap!important;margin:14px 0 24px!important;padding:0 0 2px;border-bottom:1px solid rgba(255,255,255,.08)}
    #cka-admin .cka-tabs button{position:relative;flex:0 0 auto;padding:11px 2px 13px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#aeb4be!important;font-size:13px;font-weight:700;white-space:nowrap}
    #cka-admin .cka-tabs button:after{position:absolute;right:0;bottom:-3px;left:0;height:2px;border-radius:2px;background:#d4af37;content:"";transform:scaleX(0);transform-origin:left;transition:transform .18s ease}
    #cka-admin .cka-tabs button:hover,#cka-admin .cka-tabs button.active{color:#fff!important}
    #cka-admin .cka-tabs button.active:after{transform:scaleX(1)}
    #cka-admin h3{margin:0 0 8px;color:#fff;font-size:20px;letter-spacing:-.02em}
    #cka-admin #cka-editor>p{max-width:760px;line-height:1.55}
    .cka-form{grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))!important;gap:15px 18px!important;margin:18px 0 24px!important}
    .cka-form label,.cka-result-toolbar label{gap:7px!important;color:#b5bbc5!important;font-size:12px!important;font-weight:600}
    .cka-form input:not([type="checkbox"]),.cka-form select,.cka-form textarea,.cka-result-toolbar select,.cka-result-table input,.cka-result-table select{min-height:42px;padding:10px 12px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:7px!important;background:#101319!important;color:#f5f6f8!important;outline:none;box-shadow:none!important}
    .cka-form input:focus,.cka-form select:focus,.cka-form textarea:focus,.cka-result-toolbar select:focus,.cka-result-table input:focus,.cka-result-table select:focus{border-color:rgba(212,175,55,.75)!important;box-shadow:0 0 0 2px rgba(212,175,55,.12)!important}
    .cka-form input[type="file"]{padding:6px!important;color:#aeb4be!important}
    .cka-form input[type="file"]::file-selector-button{margin-right:10px;padding:7px 10px;border:0;border-radius:5px;background:#242831;color:#f5f6f8;cursor:pointer}
    .cka-form input[type="checkbox"],.cka-result-actions input[type="checkbox"],.cka-result-table input[type="checkbox"]{width:17px!important;height:17px!important;min-height:0!important;accent-color:#d4af37}
    .cka-result-toolbar{align-items:end!important;gap:12px!important}
    .cka-result-toolbar select{min-width:230px}
    .cka-action{min-height:40px;padding:10px 15px!important;border:1px solid rgba(255,255,255,.17)!important;border-radius:7px!important;background:#20242c!important;color:#f4f5f7!important;font-weight:750;transition:background .16s,color .16s,border-color .16s}
    .cka-action:hover{border-color:rgba(255,255,255,.28)!important;background:#2a2f38!important}
    .cka-action.primary{border-color:#e5a917!important;background:#e5a917!important;color:#15130d!important}
    .cka-action.primary:hover{border-color:#f0bd3c!important;background:#f0bd3c!important}
    .cka-result-actions{gap:14px!important;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
    .cka-result-scroll,.cka-pilots-scroll{max-width:100%;border:0!important;border-radius:0!important;background:transparent!important}
    .cka-result-table,.cka-pilots-table{min-width:1050px;border-collapse:collapse!important;background:transparent!important}
    .cka-pilots-table{min-width:720px}
    .cka-result-table th,.cka-result-table td,.cka-pilots-table th,.cka-pilots-table td{padding:12px 10px!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.075)!important;text-align:left;background:transparent!important}
    .cka-result-table th,.cka-pilots-table th{background:#14181f!important;color:#aeb4be!important;font-size:10px!important;font-weight:750;letter-spacing:.06em}
    .cka-result-table tbody tr:hover td,.cka-pilots-table tbody tr:hover td{background:rgba(255,255,255,.025)!important}
    .cka-result-table input,.cka-result-table select{max-width:170px;min-width:110px}
    .cka-result-table .cka-pilot-cell{min-width:160px;color:#fff}
    .cka-result-table .cka-check{min-width:17px;width:17px}
    .cka-result-empty{padding:18px 10px!important;color:#9ba3ae!important}
    .cka-status{padding:6px 0;color:#92d6a6!important;line-height:1.5}
    .cka-status[style*="255, 156, 145"]{color:#ff9c91!important}
    #cka-admin .cka-content>p,#cka-admin #cka-editor>p{color:#aeb4be}
    @media(max-width:680px){#cka-admin .cka-tabs{gap:16px!important}.cka-form{grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))!important}.cka-result-toolbar{align-items:stretch!important}.cka-result-toolbar label,.cka-result-toolbar select{min-width:0;width:100%}.cka-result-actions{align-items:flex-start!important;flex-direction:column}}
    @media(max-width:560px){.panel .head{margin:22px 0 14px!important}.cka-grid{grid-template-columns:1fr!important;gap:10px!important}.cka-card{padding:14px!important;border-radius:10px!important}#cka-admin .cka-box>div:first-child{align-items:flex-start!important;flex-wrap:wrap}#cka-admin .cka-tabs{margin:12px 0 20px!important}.cka-form{grid-template-columns:1fr!important;gap:13px!important}.cka-result-scroll,.cka-pilots-scroll{overflow-x:auto!important}.cka-result-table,.cka-pilots-table{min-width:900px}}

    :root{--bg:#090a0f;--surface:#12151c;--surface-hover:#191e28;--border:rgba(255,255,255,.08);--gold:#d4af37;--gold-hover:#f59e0b;--text-primary:#fff;--text-muted:#8e9bb0;--accent-green:#00e676;--accent-yellow:#ffeb3b}
    body{margin:0!important;background-color:var(--bg)!important;background-image:radial-gradient(circle at 50% 0%,rgba(212,175,55,.04),transparent 40%)!important;color:var(--text-primary)!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;-webkit-font-smoothing:antialiased}
    header.top{position:sticky!important;top:0!important;z-index:100!important;display:flex!important;width:100%!important;max-width:100%!important;height:64px!important;min-height:64px!important;margin:0!important;padding:0 32px!important;align-items:center!important;justify-content:space-between!important;border:0!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:rgba(9,10,15,.92)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;box-shadow:none!important;overflow:visible!important}
    header.top:before,header.top:after{display:none!important}
    header.top .brand{display:flex!important;align-items:center!important;gap:12px!important;color:#fff!important;font-size:18px!important;font-weight:800!important;letter-spacing:.04em!important}
    header.top .brand img{width:36px!important;height:36px!important;border-radius:6px!important}
    header.top .tabs{display:flex!important;gap:4px!important;min-width:0;margin:0 0 0 auto!important;padding:0!important;overflow-x:auto!important;border:0!important;background:transparent!important}
    header.top .tab{position:relative;flex:0 0 auto;min-width:0!important;padding:12px 14px!important;border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;background:transparent!important;color:var(--text-muted)!important;font-size:13px!important;font-weight:650!important;box-shadow:none!important;transition:color .2s,border-color .2s}
    header.top .tab:after{display:none!important}
    header.top .tab:hover{color:#fff!important;background:transparent!important}
    header.top .tab.active{border-bottom-color:var(--gold)!important;background:transparent!important;color:#fff!important;box-shadow:none!important}
    .cka-home-layout{display:block!important;margin:24px 0 32px!important}
    .cka-standings-widget{display:none!important}
    body.cka-home-active .cka-home-layout{display:grid!important;grid-template-columns:minmax(0,1.7fr) minmax(310px,.8fr)!important;gap:22px!important}
    body.cka-home-active .cka-standings-widget{display:flex!important}
    .cka-home-layout>.hero{min-height:360px!important;margin:0!important;padding:clamp(28px,4vw,48px)!important;border:1px solid var(--border)!important;border-radius:12px!important;background:linear-gradient(100deg,rgba(9,10,15,.95) 30%,rgba(9,10,15,.6) 80%),url("assets/cka-banner.png") center/cover no-repeat,#12151c!important;box-shadow:none!important}
    .cka-home-layout>.hero:after{display:none!important}
    .hero:before{display:none!important}
    .hero h1{max-width:800px!important;margin:12px 0!important;color:#fff!important;font-size:clamp(32px,4.5vw,56px)!important;font-weight:900!important;letter-spacing:-.02em!important;line-height:.98!important}
    .hero .ey{color:var(--gold)!important;font-size:11px!important;font-weight:700!important;letter-spacing:.15em!important}
    .hero p{max-width:600px!important;color:var(--text-muted)!important;font-size:15px!important;line-height:1.5!important}
    .cka-home-layout .cka-hero-cta{border-radius:8px!important;background:var(--gold)!important;color:#15130d!important;box-shadow:none!important}
    .cka-standings-widget{padding:18px 16px!important;border:0!important;border-radius:12px!important;background:var(--surface)!important;box-shadow:none!important}
    .cka-widget-head{margin:0 0 8px!important;padding:0 0 12px!important;border-bottom:1px solid var(--border)!important}
    .cka-widget-head h2{font-size:20px!important}
    .cka-insight-section{padding:12px 0 14px;border-bottom:1px solid var(--border)}
    .cka-next-section{padding-bottom:0;border-bottom:0}
    .cka-insight-title{display:flex;flex-direction:column;gap:3px;margin-bottom:8px}
    .cka-insight-title .cka-widget-kicker{color:var(--text-muted)!important;font-size:9px!important}
    .cka-insight-title>strong{color:#fff;font-size:14px}
    .cka-wins-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:43px;border-bottom:1px solid rgba(255,255,255,.055)}
    .cka-wins-row:last-child{border-bottom:0}
    .cka-wins-rank{color:var(--text-muted);font-size:11px;font-weight:800}
    .cka-wins-row:first-child .cka-wins-rank{color:var(--gold)}
    .cka-wins-identity{display:flex;min-width:0;align-items:center;gap:8px}
    .cka-wins-identity img,.cka-wins-avatar{width:30px;height:30px;min-width:30px;object-fit:cover;object-position:top;border-radius:7px;background:#20242c}
    .cka-wins-avatar{background:url("assets/cka-mark.png") center/contain no-repeat!important}
    .cka-wins-copy{display:flex;min-width:0;flex-direction:column;gap:2px}
    .cka-wins-copy strong{overflow:hidden;color:#fff;font-size:11px;text-overflow:ellipsis;white-space:nowrap}
    .cka-wins-copy span{overflow:hidden;color:var(--text-muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}
    .cka-wins-count{color:var(--gold);font-size:10px;white-space:nowrap}
    .cka-next-race{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:baseline;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03)}
    .cka-next-round{grid-column:1/-1;color:var(--gold);font-size:9px;font-weight:800;letter-spacing:.12em}
    .cka-next-date{grid-row:2/4;color:#fff;font-size:24px;letter-spacing:-.04em}
    .cka-next-venue{overflow:hidden;color:#fff;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
    .cka-next-details{overflow:hidden;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}
    #pilotcards.pilotcards{display:block!important;width:100%!important;min-width:0!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important}
    #pilotcards .pilot-grid{display:grid!important;width:100%!important;grid-template-columns:repeat(auto-fill,minmax(min(100%,205px),1fr))!important;gap:16px!important}
    #pilotcards .pilot-card{display:flex!important;min-width:0!important;min-height:0!important;flex-direction:column!important;align-items:stretch!important;overflow:hidden!important;padding:10px!important;border:1px solid var(--border)!important;border-radius:10px!important;background:var(--surface)!important;box-shadow:none!important;backdrop-filter:none!important;cursor:pointer;transition:background .16s,border-color .16s!important}
    #pilotcards .pilot-card:before{display:none!important}
    #pilotcards .pilot-card:hover{transform:none!important;border-color:rgba(212,175,55,.38)!important;background:var(--surface-hover)!important;box-shadow:none!important}
    #pilotcards .pilot-card img,#pilotcards .pilot-card>.placeholder{display:block!important;width:100%!important;height:180px!important;min-width:0!important;margin:0!important;object-fit:contain!important;object-position:center center!important;border:0!important;border-radius:7px!important;background:#171b22!important}
    #pilotcards .pilot-card h3{margin:10px 2px 2px!important;color:#fff!important;font-size:15px!important;line-height:1.25!important;overflow-wrap:anywhere}
    #pilotcards .pilot-detail{margin-top:18px!important;padding:18px!important;border:1px solid var(--border)!important;border-radius:12px!important;background:var(--surface)!important;box-shadow:none!important;backdrop-filter:none!important}
    #pilotcards .pilot-detail-head img,#pilotcards .pilot-detail-head>.placeholder{border:0!important;border-radius:8px!important;box-shadow:none!important}
    #pilotcards .pilot-detail-stats{border:0!important;border-radius:8px!important;background:rgba(255,255,255,.035)!important}
    #pilotcards .pilot-detail-stats div{border-color:var(--border)!important}
    #pilotcards .pilot-detail-stats b{color:var(--gold)!important}
    #pilotcards .pilot-detail-stats div:nth-child(2) b,#pilotcards .pilot-detail-stats div:nth-child(3) b,#pilotcards .pilot-detail-stats div:nth-child(4) b,#pilotcards .pilot-detail-stats div:nth-child(5) b{color:var(--gold)!important}
    @media(max-width:900px){body.cka-home-active .cka-home-layout{grid-template-columns:minmax(0,1.35fr) minmax(275px,.85fr)!important;gap:14px!important}}
    @media(max-width:680px){header.top{height:auto!important;min-height:64px!important;padding:8px 16px!important;flex-wrap:wrap!important}header.top .tabs{width:100%;margin:0!important;justify-content:flex-start!important}.cka-home-layout{margin:16px 0 24px!important}body.cka-home-active .cka-home-layout{grid-template-columns:1fr!important;gap:12px!important}.cka-home-layout>.hero{min-height:300px!important}#pilotcards .pilot-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr))!important}}
    @media(max-width:480px){header.top .tabs{gap:0!important}header.top .tab{padding:10px 9px!important;font-size:11px!important}.cka-home-layout>.hero{min-height:270px!important;padding:24px 18px!important}#pilotcards .pilot-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}#pilotcards .pilot-card{padding:8px!important}#pilotcards .pilot-card img,#pilotcards .pilot-card>.placeholder{height:150px!important}#pilotcards .pilot-detail-head{align-items:flex-start!important;gap:12px!important}#pilotcards .pilot-detail-head img,#pilotcards .pilot-detail-head>.placeholder{width:72px!important;height:90px!important}#pilotcards .pilot-detail-stats{grid-template-columns:repeat(2,1fr)!important}.cka-next-date{font-size:22px}}
    #classification .scroll,#teams .scroll,#teams .teams{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    #classification .row:not(.headrow),#teams .teamrow:not(.headrow){border:0!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:var(--surface)!important;color:var(--text-primary)!important;box-shadow:none!important}
    #classification .row.headrow,#teams .teamrow.headrow{border:0!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:rgba(255,255,255,.035)!important;color:var(--text-muted)!important}
    #classification .row:not(.headrow):hover,#teams .teamrow:not(.headrow):hover{background:var(--surface-hover)!important}
    #classification .pilot strong,#teams .teamrow strong,#teams .teamrow b{color:#fff!important}
    #classification .team,#teams .teamrow>span:last-child{color:#a5adba!important}
    #classification .points,#teams .points{color:var(--gold)!important}
    #classification .pos,#teams .teamrow b{color:#d8dce3!important}
    #classification .row:nth-child(2) .pos,#teams .teamrow:nth-child(2) b{color:var(--gold)!important}
    #classification .row:nth-child(3) .pos,#teams .teamrow:nth-child(3) b{color:#c9ced6!important}
    #classification .row:nth-child(4) .pos,#teams .teamrow:nth-child(4) b{color:#b98356!important}
    #classification .avatar,#classification .placeholder,#teams .avatar,#teams .placeholder{border-color:var(--border)!important;background-color:#191d25!important}
    #teams .team-stage-breakdown{margin:12px 0 4px!important;padding:12px!important;border:1px solid var(--border)!important;border-radius:8px!important;background:#101319!important;box-shadow:none!important}
    #teams .team-stage-breakdown h4{margin:0 0 9px!important;color:var(--gold)!important;font-size:10px!important;letter-spacing:.1em!important}
    #teams .team-stage-line{grid-template-columns:90px minmax(0,1fr) 58px!important;gap:8px!important;padding:8px 2px!important;border:0!important;border-top:1px solid rgba(255,255,255,.07)!important;background:transparent!important;color:var(--text-primary)!important;font-size:12px!important}
    #teams .team-stage-line:first-of-type{border-top:0!important}
    #teams .team-stage-line span:first-child{color:var(--text-muted)!important}
    #teams .team-stage-line span:nth-child(2){color:#e8eaf0!important}
    #teams .team-stage-line b{color:var(--gold)!important}
    #teams .team-details summary{color:#fff!important}
    #teams .team-details summary:after{color:var(--gold)!important}
    #teams .team-details ul{border-color:var(--border)!important;color:var(--text-muted)!important}
    #teams .team-details li img,#teams .team-details li .placeholder{background-color:#191d25!important}
    @media(max-width:560px){#teams .team-stage-breakdown{padding:9px!important}#teams .team-stage-line{grid-template-columns:67px minmax(0,1fr) 48px!important;gap:5px!important;font-size:11px!important}}
    *{scrollbar-color:#d4af37 #14181f;scrollbar-width:thin}
    *::-webkit-scrollbar{width:8px;height:8px}
    *::-webkit-scrollbar-track{border-radius:8px;background:#14181f}
    *::-webkit-scrollbar-thumb{border:2px solid #14181f;border-radius:8px;background:linear-gradient(135deg,#b88d22,#f2ca5c)}
    *::-webkit-scrollbar-thumb:hover{background:#f2ca5c}
    #resultados .result-buttons{display:flex!important;gap:22px!important;overflow-x:auto!important;overflow-y:hidden!important;margin:10px 0 14px!important;padding:0 2px 2px!important;border-bottom:1px solid var(--border)!important;border-radius:0!important;background:transparent!important;scrollbar-color:#d4af37 #14181f!important;scrollbar-width:thin!important}
    #resultados .result-buttons .result-btn{position:relative!important;flex:0 0 auto!important;padding:12px 2px 13px!important;border:0!important;border-bottom:2px solid transparent!important;border-radius:0!important;background:transparent!important;color:var(--text-muted)!important;font-size:13px!important;font-weight:700!important;box-shadow:none!important;transition:color .18s,border-color .18s!important}
    #resultados .result-buttons .result-btn:hover:not(:disabled){color:#fff!important;background:transparent!important}
    #resultados .result-buttons .result-btn.active{border:0!important;border-bottom:2px solid var(--gold)!important;border-radius:0!important;background:transparent!important;color:#fff!important;box-shadow:none!important}
    #resultados .result-buttons .result-btn:disabled{color:#68717e!important;opacity:.65!important;cursor:not-allowed!important}
    #resultados .result-buttons::-webkit-scrollbar{height:5px}
    #resultados .result-buttons::-webkit-scrollbar-track{background:#14181f}
    #resultados .result-buttons::-webkit-scrollbar-thumb{border:0;background:#d4af37}
    #cka-public-sync-warning{position:fixed;z-index:1200;top:12px;left:50%;transform:translateX(-50%);width:min(620px,calc(100% - 24px));display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border:1px solid rgba(212,175,55,.45);border-radius:8px;background:#17191d;color:#e8e2d2;font-size:12px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.32)}
    #cka-public-sync-warning button{flex:0 0 auto;padding:7px 10px;border:1px solid rgba(212,175,55,.55);border-radius:6px;background:transparent;color:#f1d98a;font:inherit;font-weight:700;cursor:pointer}
    #cka-public-sync-warning button:disabled{opacity:.65;cursor:wait}

    /* Mobile: keep the standings and race results inside the viewport. */
    @media(max-width:640px){
      .wrap{width:calc(100% - 20px)!important}
      #classificacao .scroll{position:static!important;max-height:none!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #classification.table{width:100%!important;min-width:0!important}
      #classification .row.headrow,#classification .row:not(.headrow){display:grid!important;width:100%!important;min-width:0!important;grid-template-columns:38px minmax(0,1fr) 64px!important;gap:8px!important;align-items:center!important}
      #classification .row.headrow{min-height:40px!important;padding:8px 10px!important;background:rgba(255,255,255,.035)!important}
      #classification .row:not(.headrow){min-height:62px!important;padding:9px 10px!important;margin:0!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;overflow:hidden!important;background:transparent!important}
      #classification .row.headrow>:nth-child(3),#classification .row:not(.headrow)>.team,#classification .row:not(.headrow)>.stage,#classification .row:not(.headrow)>:nth-child(n+16){display:none!important}
      #classification .row.headrow>:nth-child(n+5){display:none!important}
      #classification .row.headrow>:nth-child(4),#classification .row:not(.headrow)>:nth-child(4){display:block!important}
      #classification .row.headrow>*{min-width:0!important;padding:0!important;font-size:9px!important;text-align:left!important;white-space:nowrap!important}
      #classification .row:not(.headrow)>*{min-width:0!important;padding:0!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere;font-size:13px!important}
      #classification .row:not(.headrow)>.pos{position:static!important;padding-left:0!important;font-size:14px!important;font-weight:800!important}
      #classification .row:not(.headrow)>.pilot{position:static!important;display:flex!important;min-width:0!important;gap:9px!important;white-space:normal!important}
      #classification .row:not(.headrow)>.pilot strong{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:13px!important}
      #classification .row:not(.headrow)>.pilot small{display:none!important}
      #classification .row:not(.headrow)>.pilot .avatar,#classification .row:not(.headrow)>.pilot .placeholder{width:38px!important;height:38px!important;min-width:38px!important;flex:0 0 38px!important}
      #classification .row:not(.headrow)>.points{font-size:16px!important;text-align:right!important}
      #classification .row.headrow>:first-child{grid-column:1!important}
      #classification .row.headrow>:nth-child(2){grid-column:2!important}
      #classification .row.headrow>:nth-child(4){grid-column:3!important;text-align:right!important}
      #resultados .result-buttons{gap:16px!important;padding:4px 2px 8px!important;scroll-snap-type:x proximity!important;touch-action:pan-x!important;-webkit-overflow-scrolling:touch!important}
      #resultados .result-buttons .result-btn{max-width:78vw!important;white-space:nowrap!important;scroll-snap-align:center!important}
      #resultados .results{width:100%!important;min-width:0!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #resultados .resultrow{display:grid!important;width:100%!important;min-width:0!important;box-sizing:border-box!important;grid-template-columns:34px minmax(0,1fr) 70px 62px!important;grid-template-rows:auto!important;gap:4px!important;align-items:center!important;padding:8px 4px!important;margin:0!important;border:0!important;border-bottom:1px solid rgba(255,255,255,.08)!important;border-radius:0!important;overflow:hidden!important}
      #resultados .resultrow:first-child{position:static!important}
      #resultados .resultrow:first-child>span{min-width:0!important;padding:0!important;white-space:normal!important;text-align:center!important;font-size:8px!important;line-height:1.15!important;overflow-wrap:anywhere}
      #resultados .resultrow:not(:first-child)>b{grid-column:auto!important;grid-row:auto!important;text-align:left!important;font-size:12px!important}
      #resultados .resultrow:not(:first-child)>.result-pilot{grid-column:auto!important;grid-row:auto!important;display:flex!important;min-width:0!important;gap:5px!important;white-space:nowrap!important;overflow:hidden!important;font-size:10px!important}
      #resultados .resultrow:not(:first-child)>.result-pilot strong{display:block!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #resultados .resultrow:not(:first-child)>:nth-child(3),#resultados .resultrow:not(:first-child)>:nth-child(4){grid-column:auto!important;grid-row:auto!important;min-width:0!important;text-align:center!important;font-size:9px!important;white-space:nowrap!important}
      #resultados .resultrow:not(:first-child)>[data-label]::before{display:none!important}
      #resultados .resultrow .result-pilot img,#resultados .resultrow .result-pilot .placeholder{display:block!important;width:26px!important;height:26px!important;min-width:26px!important;flex:0 0 26px!important}
      #teams .teams{width:100%!important;min-width:0!important}
      #teams .teamrow:not(.headrow){grid-template-columns:42px minmax(0,1fr) 68px!important;gap:6px!important;padding:12px 8px!important}
      #teams .teamrow:not(.headrow)>.team-details{grid-column:2!important;grid-row:1!important;min-width:0!important}
      #teams .teamrow:not(.headrow)>strong.points,#teams .teamrow:not(.headrow)>:nth-child(3){display:block!important;grid-column:3!important;grid-row:1!important;text-align:right!important;font-size:16px!important}
      #teams .teamrow:not(.headrow)>:nth-child(4){display:none!important}
      #teams .teamrow.headrow{grid-template-columns:42px minmax(0,1fr) 68px!important;padding:10px 8px!important}
      #teams .teamrow.headrow>:nth-child(4){display:none!important}
    }
  `;
  const hero=document.querySelector('.hero');
  const brandLabel=document.querySelector('.top .brand span');
  if(brandLabel)brandLabel.innerHTML='CKA<small>CLUBE KART DOS AMIGOS · TEMPORADA 2026</small>';
  if(hero&&!hero.querySelector('.cka-hero-cta')){
    const cta=document.createElement('button');cta.type='button';cta.className='cka-action primary cka-hero-cta';cta.textContent='Ver classificação';
    cta.addEventListener('click',()=>{document.querySelector('.tab[data-panel="classificacao"]')?.click();document.querySelector('#classificacao')?.scrollIntoView({behavior:'smooth',block:'start'});});hero.append(cta);
  }
  document.head.append(style);

  document.body.classList.add('cka-home-active');
  nav.addEventListener('click',event=>{
    const tab=event.target.closest('.tab');
    if(tab)document.body.classList.toggle('cka-home-active',tab.dataset.panel==='classificacao');
  });
  if(hero&&!hero.parentElement?.classList.contains('cka-home-layout')){
    const layout=document.createElement('div');layout.className='cka-home-layout';
    hero.before(layout);layout.append(hero);
    const widget=document.createElement('aside');widget.className='cka-standings-widget';widget.setAttribute('aria-label','Informações e destaques do campeonato');
    widget.innerHTML='<div class="cka-widget-head"><div><div class="cka-widget-kicker">Em números · CKA</div><h2>Fatos da temporada</h2></div></div><section class="cka-insight-section"><div class="cka-insight-title"><span class="cka-widget-kicker">Pilotos em destaque</span><strong>Mais vitórias</strong></div><div class="cka-most-wins-list"><div class="cka-standings-empty">Calculando os destaques…</div></div></section><section class="cka-insight-section cka-next-section"><div class="cka-insight-title"><span class="cka-widget-kicker">Calendário</span><strong>Próxima etapa</strong></div><div class="cka-next-race"><div class="cka-standings-empty">Carregando calendário…</div></div></section>';
    layout.append(widget);
    const syncWins=()=>{
      const list=widget.querySelector('.cka-most-wins-list');
      const leaders=[...document.querySelectorAll('#classification .row:not(.headrow)')].map(row=>{
        const wins=publicState.ready?Number(publicState.standings.find(item=>item.pilot_id===row.dataset.pilotId)?.wins)||0:[...row.querySelectorAll('.stage')].filter(cell=>((cell.querySelector('span')||cell).textContent.trim()==='1º')).length;
        return {row,wins,name:row.querySelector('.pilot strong')?.textContent.trim()||'Piloto'};
      }).filter(pilot=>pilot.wins>0).sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name,'pt-BR')).slice(0,3);
      if(!leaders.length){list.innerHTML='<div class="cka-standings-empty">As vitórias serão destacadas quando os resultados oficiais forem publicados.</div>';return;}
      list.replaceChildren(...leaders.map((entry,index)=>{
        const item=document.createElement('div');item.className='cka-wins-row';
        const rank=document.createElement('span');rank.className='cka-wins-rank';rank.textContent=`${index+1}º`;item.append(rank);
        const identity=document.createElement('div');identity.className='cka-wins-identity';
        const photo=entry.row.querySelector('.pilot img');
        if(photo){const image=photo.cloneNode();image.removeAttribute('srcset');image.alt='';identity.append(image);}
        else{const avatar=document.createElement('span');avatar.className='cka-wins-avatar';avatar.setAttribute('aria-hidden','true');identity.append(avatar);}
        const info=document.createElement('div');info.className='cka-wins-copy';
        const name=document.createElement('strong');name.textContent=entry.name;info.append(name);
        const team=entry.row.querySelector('.team')?.textContent.trim();if(team){const teamName=document.createElement('span');teamName.textContent=team;info.append(teamName);}
        identity.append(info);item.append(identity);
        const count=document.createElement('strong');count.className='cka-wins-count';count.textContent=`${entry.wins} ${entry.wins===1?'vitória':'vitórias'}`;item.append(count);return item;
      }));
    };
    const renderNextRace=race=>{
      const box=widget.querySelector('.cka-next-race');box.replaceChildren();
      if(!race){const empty=document.createElement('div');empty.className='cka-standings-empty';empty.textContent='Calendário encerrado. Aguarde a divulgação da próxima etapa.';box.append(empty);return;}
      const round=document.createElement('span');round.className='cka-next-round';round.textContent=`ETAPA ${race.round_number}`;box.append(round);
      const date=document.createElement('strong');date.className='cka-next-date';date.textContent=new Date(`${race.race_date}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});box.append(date);
      const venue=document.createElement('strong');venue.className='cka-next-venue';venue.textContent=race.venue;box.append(venue);
      const details=document.createElement('span');details.className='cka-next-details';details.textContent=`${String(race.start_time||'').slice(0,5)} · ${race.location}`;box.append(details);
    };
    const loadNextRace=async()=>{
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
      const {data,error}=await db.from('cka_races').select('round_number,race_date,start_time,venue,location,status').eq('is_published',true).eq('status','scheduled').gte('race_date',today).order('race_date',{ascending:true}).limit(1).maybeSingle();
      if(error){widget.querySelector('.cka-next-race').textContent='Não foi possível carregar a próxima etapa.';return;}
      renderNextRace(data);
    };
    window.addEventListener('cka:public-data-updated',loadNextRace);
    syncWins();loadNextRace();
    const standings=document.querySelector('#classification');
    if(standings)new MutationObserver(syncWins).observe(standings,{childList:true,subtree:true,characterData:true});
    const texture=document.createElement('span');texture.className='cka-checkered-texture';texture.setAttribute('aria-hidden','true');hero.prepend(texture);
  }

  function makeTab(id, label) {
    const b = document.createElement('button'); b.className = 'tab'; b.dataset.panel = id; b.textContent = label; nav.append(b);
    b.addEventListener('click', () => activate(id)); return b;
  }
  function makePanel(id, title, intro) {
    const s = document.createElement('section'); s.id = id; s.className = 'panel cka-extra';
    s.innerHTML = `<div class="head"><div><div class="ey">Campeonato CKA</div><h2>${title}</h2></div><p>${intro || ''}</p></div><div class="cka-content"></div>`;
    main.append(s); return s.querySelector('.cka-content');
  }
  function activate(id) {
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    document.querySelectorAll('main .panel').forEach(s => s.classList.toggle('active', s.id === id));
    if (id === 'cka-calendario') loadCalendar();
    if (id === 'cka-fotos') loadMedia('photo');
    if (id === 'cka-videos') loadMedia('youtube');
    if (id === 'cka-admin') renderAdmin();
  }
  const calendarBox = makePanel('cka-calendario', 'Calendário de etapas', 'Toque em uma etapa para ver o vencedor.');
  const photosBox = makePanel('cka-fotos', 'Fotos das etapas', 'Galeria oficial do campeonato.');
  const videosBox = makePanel('cka-videos', 'Vídeos dos pilotos', 'Vídeos publicados no YouTube.');
  const adminBox = makePanel('cka-admin', 'Administração CKA', 'Acesso restrito ao administrador.');
  makeTab('cka-calendario', 'Calendário'); makeTab('cka-fotos', 'Fotos'); makeTab('cka-videos', 'Vídeos'); makeTab('cka-admin', 'Admin');
  const state = { admin: false, user: null, races: [], pilots: [], teams: [], initialized: false, editingPilotId: null };
  let adminDataPromise = null;
  const html = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const replaceHTML = (root, markup) => { if (root && root.innerHTML !== markup) root.innerHTML = markup; };
  const photoUrl = pilot => {
    if (pilot?.photo_path) return /^https?:\/\//i.test(pilot.photo_path) || pilot.photo_path.startsWith('assets/') ? pilot.photo_path : db.storage.from('cka-media').getPublicUrl(pilot.photo_path).data.publicUrl;
    return assetPhoto(pilot?.display_name || pilot?.full_name || '');
  };
  const avatarMarkup = pilot => {
    const src = photoUrl(pilot);
    return src ? `<img class="avatar" loading="lazy" src="${html(src)}" alt="Foto de ${html(pilot.display_name)}">` : '<span class="placeholder" aria-hidden="true"></span>';
  };
  const lapText = ms => ms == null ? '—' : `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}.${String(ms % 1000).padStart(3,'0')}`;
  async function refreshPublicData() {
    try {
    const [seasonResult, raceResult, pointsResult, standingsResult, pilotsResult, teamsResult] = await Promise.all([
      db.from('cka_seasons').select('id,season_year').eq('is_active', true).maybeSingle(),
      db.from('cka_races').select('id,season_id,round_number,race_date,start_time,venue,location,status,is_published,results_published').eq('is_published', true).order('round_number'),
      db.from('cka_pilot_stage_points').select('*').order('round_number'),
      db.from('cka_pilot_standings').select('*'),
      db.from('cka_pilots').select('id,season_id,pilot_number,full_name,display_name,default_team_id,photo_path,is_active').eq('is_active', true).order('pilot_number'),
      db.from('cka_teams').select('id,season_id,name,is_active').eq('is_active', true).order('name')
    ]);
    const failed = [seasonResult, raceResult, pointsResult, standingsResult, pilotsResult, teamsResult].find(result => result.error);
    if (failed) { publicState.error = failed.error; console.warn('CKA: falha ao sincronizar os dados públicos.', failed.error); showPublicSyncNotice(`Falha ao sincronizar os dados do campeonato: ${failed.error.message||'erro de conexão'}. Os dados exibidos podem estar desatualizados.`); return false; }
    const activeSeasonId=seasonResult.data?.id;
    if(!activeSeasonId){publicState.error=new Error('Não há temporada ativa configurada.');showPublicSyncNotice('Nenhuma temporada ativa está configurada no Supabase.');return false;}
    const races = (raceResult.data || []).filter(race=>race.season_id===activeSeasonId);
    const eligibleIds = races.filter(race => race.status === 'completed' && race.results_published).map(race => race.id);
    let results = [];
    if (eligibleIds.length) {
      const result = await db.from('cka_race_results').select('race_id,pilot_id,team_id,status,finish_position,best_lap_ms,gap_display').in('race_id', eligibleIds).order('finish_position');
      if (result.error) { publicState.error = result.error; console.warn('CKA: falha ao carregar os tempos oficiais.', result.error); showPublicSyncNotice(`Não foi possível carregar os resultados publicados: ${result.error.message||'erro de conexão'}.`); return false; }
      results = result.data || [];
    }
    publicState.races = races;
    publicState.stagePoints = (pointsResult.data || []).filter(row=>row.season_id===activeSeasonId);
    publicState.standings = (standingsResult.data || []).filter(row=>row.season_id===activeSeasonId);
    publicState.pilots = (pilotsResult.data || []).filter(row=>row.season_id===activeSeasonId);
    publicState.teams = (teamsResult.data || []).filter(row=>row.season_id===activeSeasonId);
    publicState.results = results;
    publicState.ready = true;
    publicState.error = null;
    renderLiveStandings();
    renderLiveTeams();
    renderLivePilots();
    renderLiveResults();
    syncLiveSeasonFacts();
    window.ckaMarkLiveDataReady?.();
    clearPublicSyncNotice();
    window.dispatchEvent(new CustomEvent('cka:public-data-updated'));
    return true;
    } catch (error) {
      publicState.error = error;
      console.warn('CKA: erro ou timeout ao sincronizar os dados públicos.', error);
      showPublicSyncNotice(`A sincronização não foi concluída: ${error.message||'verifique sua conexão com o Supabase'}.`);
      return false;
    }
  }
  function renderLiveStandings() {
    const root = document.querySelector('#classification'); if (!root) return;
    const races = publicState.races.filter(r => r.status === 'completed' && r.results_published);
    const raceById = new Map(races.map(r => [r.id, r]));
    const pilots = publicState.pilots.map(pilot => {
      const stats = publicState.standings.find(row => row.pilot_id === pilot.id) || {};
      const entries = publicState.stagePoints.filter(row => row.pilot_id === pilot.id && raceById.has(row.race_id));
      const byRound = new Map(entries.map(row => [row.round_number, row]));
      const discardCount = Math.min(2, Math.max(0, races.length - 1));
      const scoreOf = row => (Number(row.race_points)||0) + (Number(row.bonus_points)||0) - (Number(row.penalty_points)||0);
      const discardedEntries = [...entries].sort((a,b)=>scoreOf(a)-scoreOf(b)||Number(a.round_number)-Number(b.round_number)).slice(0,discardCount);
      const discarded = new Set(discardedEntries.map(row=>Number(row.round_number)));
      const finalPoints = entries.reduce((sum,row)=>sum+scoreOf(row),0)-discardedEntries.reduce((sum,row)=>sum+scoreOf(row),0);
      const team = publicState.teams.find(item => item.id === pilot.default_team_id);
      const podiums = entries.filter(row => row.result_status === 'finished' && Number(row.finish_position) <= 5).length;
      return { ...pilot, stats, teamName: team?.name || 'Sem equipe', byRound, discarded, podiums, wins: Number(stats.wins) || 0, finalPoints };
    }).sort((a,b) => b.finalPoints - a.finalPoints || a.pilot_number - b.pilot_number);
    const heading = ['Pos.','Piloto','Equipe','Pontos',...Array.from({length:11},(_,i)=>`Etapa ${i+1}`),'Bônus','Saldo','Descarte 1','Descarte 2'];
    const header = `<div class="row headrow">${heading.map(label=>`<span>${html(label)}</span>`).join('')}</div>`;
    const rows = pilots.map((pilot,index) => {
      const stages = Array.from({length:11},(_,i)=>{
        const round=i+1, entry=pilot.byRound.get(round), race=races.find(item=>item.round_number===round);
        const pos=entry?.finish_position ? `${entry.finish_position}º` : '—';
        const points=entry ? Number(entry.race_points)||0 : 0;
        const klass=pos==='1º'?'gold':pos==='2º'?'silver':pos==='3º'?'bronze':pos==='—'?'future':'';
        return `<span class="stage ${klass}" data-label="Etapa ${round}"><span>${pos}</span>${race?`<small>${points} pts</small>`:''}</span>`;
      }).join('');
      const bonus=Number(pilot.stats.bonus_points)||0, penalty=Number(pilot.stats.penalty_points)||0;
      const discardValues=[...pilot.discarded].map(Number).map(round=>{
        const entry=pilot.byRound.get(round);return entry ? (Number(entry.race_points)+Number(entry.bonus_points||0)-Number(entry.penalty_points||0)) : 0;
      }).sort((a,b)=>a-b);
      const row=`<div class="row" data-pilot-id="${html(pilot.id)}"><b class="pos" data-label="Pos.">${index+1}º</b><div class="pilot" data-label="Piloto">${avatarMarkup(pilot)}<span><strong>${html(pilot.display_name)}</strong><small>${index===0?'Líder do campeonato':''}</small></span></div><span class="team" data-label="Equipe">${html(pilot.teamName)}</span><b class="points" data-label="Pontos">${pilot.finalPoints}</b>${stages}<span class="bonus" data-label="Bônus">${bonus}</span><span class="points" data-label="Saldo">${bonus-penalty}</span><span class="discard" data-label="Descarte 1">${discardValues[0] ?? '—'}</span><span class="discard" data-label="Descarte 2">${discardValues[1] ?? '—'}</span></div>`;
      return row;
    }).join('');
    replaceHTML(root,header+rows);
    const meta=document.querySelector('#classificacao .head>p'); if(meta)meta.textContent=`${pilots.length} pilotos · ${races.length} etapas publicadas`;
  }
  function renderLiveTeams() {
    const root=document.querySelector('#teams');if(!root)return;
    const races=publicState.races.filter(r=>r.status==='completed'&&r.results_published);
    const driversByTeam=new Map();
    publicState.stagePoints.forEach(row=>{
      if(!row.team_id||!races.some(r=>r.id===row.race_id))return;
      const key=`${row.team_id}:${row.race_id}`;
      if(!driversByTeam.has(key))driversByTeam.set(key,[]);
      driversByTeam.get(key).push(row);
    });
    const scores=new Map(publicState.teams.map(team=>[team.id,{team,total:0,rounds:new Map(),pilots:new Map()}]));
    driversByTeam.forEach((drivers,key)=>{
      const [teamId,raceId]=key.split(':');const team=scores.get(teamId);if(!team)return;
      const round=Number(publicState.races.find(r=>r.id===raceId)?.round_number);if(!round)return;
      const counted=drivers.sort((a,b)=>(Number(b.race_points)||0)-(Number(a.race_points)||0)||(Number(a.finish_position)||999)-(Number(b.finish_position)||999)||String(a.pilot_id).localeCompare(String(b.pilot_id))).slice(0,2);
      const points=counted.reduce((sum,item)=>sum+(Number(item.race_points)||0),0);team.total+=points;team.rounds.set(round,{points,drivers:counted});
      drivers.forEach(item=>{const pilot=publicState.pilots.find(p=>p.id===item.pilot_id);if(pilot)team.pilots.set(pilot.id,pilot);});
    });
    const ranked=[...scores.values()].sort((a,b)=>b.total-a.total||a.team.name.localeCompare(b.team.name,'pt-BR'));
    const header='<div class="teamrow headrow"><span>Pos.</span><span>Equipe</span><span>Pontos</span><span>Pilotos</span></div>';
    replaceHTML(root,header+ranked.map((entry,index)=>{
      const memberList=[...entry.pilots.values()].map(p=>`<li>${avatarMarkup(p)}<strong>${html(p.display_name)}</strong></li>`).join('');
      const breakdown=`<div class="team-stage-breakdown"><h4>Pontos da equipe por etapa</h4>${Array.from({length:11},(_,i)=>{const round=i+1,score=entry.rounds.get(round),contributors=score?.drivers.map(d=>`${html(d.pilot_name)} (${Number(d.race_points)||0})`).join(' + ');return `<div class="team-stage-line"><span>Etapa ${round}</span><span>${contributors||'Sem resultado pontuado'}</span><b>${score?.points||0} pts</b></div>`;}).join('')}</div>`;
      return `<div class="teamrow"><b class="team-position">${index+1}º</b><details class="team-details"><summary>${html(entry.team.name)}</summary><ul>${memberList||'<li>Sem pilotos vinculados</li>'}</ul>${breakdown}</details><strong class="points">${entry.total}</strong><span>${[...entry.pilots.values()].map(p=>html(p.display_name)).join(' · ')||'Sem equipe definida'}</span></div>`;
    }).join(''));
  }
  function renderLivePilots() {
    const root=document.querySelector('#pilotcards');if(!root)return;
    const races=publicState.races.filter(r=>r.status==='completed'&&r.results_published);
    const raceIds=new Set(races.map(r=>r.id));
    const ordered=publicState.pilots.map(pilot=>{
      const stats=publicState.standings.find(row=>row.pilot_id===pilot.id)||{};
      const points=publicState.stagePoints.filter(row=>row.pilot_id===pilot.id&&raceIds.has(row.race_id));
      const scoreOf=row=>(Number(row.race_points)||0)+(Number(row.bonus_points)||0)-(Number(row.penalty_points)||0);
      const discardCount=Math.min(2,Math.max(0,races.length-1));
      const discarded=[...points].sort((a,b)=>scoreOf(a)-scoreOf(b)||Number(a.round_number)-Number(b.round_number)).slice(0,discardCount);
      const total=points.reduce((sum,row)=>sum+scoreOf(row),0)-discarded.reduce((sum,row)=>sum+scoreOf(row),0);
      return {...pilot,stats,points:total,wins:Number(stats.wins)||0,podiums:points.filter(row=>row.result_status==='finished'&&Number(row.finish_position)<=5).length,starts:Number(stats.starts)||0};
    }).sort((a,b)=>b.points-a.points||a.pilot_number-b.pilot_number);
    replaceHTML(root,`<div class="pilot-grid">${ordered.map(p=>`<article class="pilot-card" data-pilot-id="${html(p.id)}">${avatarMarkup(p)}<h3>${html(p.display_name)}</h3><span class="team">${html(publicState.teams.find(t=>t.id===p.default_team_id)?.name||'Sem equipe')}</span><div class="pilot-detail-stats"><div><b>${p.points}</b><span>Pontos</span></div><div><b>${p.wins}</b><span>Vitórias</span></div><div><b>${p.podiums}</b><span>Pódios</span></div><div><b>${p.starts}</b><span>Etapas</span></div></div></article>`).join('')}</div>`);
  }
  function renderLiveResults(selectedRound) {
    const buttonBox=document.querySelector('#resultbuttons'),resultBox=document.querySelector('#results');if(!buttonBox||!resultBox)return;
    const completed=publicState.races.filter(r=>r.status==='completed'&&r.results_published);
    const requested=selectedRound||publicState.selectedRound;
    const current=requested&&completed.some(r=>r.round_number===requested)?requested:(completed.at(-1)?.round_number||null);
    publicState.selectedRound=current;
    replaceHTML(buttonBox,publicState.races.map(r=>`<button type="button" class="result-btn ${r.round_number===current?'active':''}" data-round="${r.round_number}" ${completed.includes(r)?'':'disabled'}>Etapa ${r.round_number} · ${html(r.venue)}</button>`).join(''));
    buttonBox.onclick=event=>{const button=event.target.closest('[data-round]');if(!button)return;publicState.selectedRound=Number(button.dataset.round);renderLiveResults(publicState.selectedRound);};
    const race=completed.find(r=>r.round_number===current);
    if(!race){replaceHTML(resultBox,'<p class="cka-muted">Ainda não há resultados publicados.</p>');return;}
    const rows=publicState.results.filter(row=>row.race_id===race.id).sort((a,b)=>(a.finish_position??999)-(b.finish_position??999));
    replaceHTML(resultBox,'<div class="resultrow"><span>Posição</span><span>Piloto</span><span>Melhor volta</span><span>Diferença</span></div>'+rows.map(row=>{const pilot=publicState.pilots.find(p=>p.id===row.pilot_id)||{display_name:'Piloto'};return `<div class="resultrow"><b>${row.finish_position?`${row.finish_position}º`:'—'}</b><span class="result-pilot">${avatarMarkup(pilot)}<strong>${html(pilot.display_name)}</strong></span><span>${lapText(row.best_lap_ms)}</span><span>${html(row.gap_display||'—')}</span></div>`;}).join(''));
  }
  function syncLiveSeasonFacts() {
    const standings=new Map(publicState.standings.map(row=>[row.pilot_id,row]));
    const cells=[...document.querySelectorAll('#classification .row:not(.headrow)')];
    if(!cells.length)return;
    const leaders=publicState.pilots.map(p=>({pilot:p,stats:standings.get(p.id)||{wins:0}})).sort((a,b)=>(Number(b.stats.wins)||0)-(Number(a.stats.wins)||0)).slice(0,3);
    const list=document.querySelector('.cka-most-wins-list');
    if(list)list.innerHTML=leaders.some(x=>Number(x.stats.wins)>0)?leaders.map((x,i)=>`<div class="cka-wins-row"><span class="cka-wins-rank">${i+1}º</span><div class="cka-wins-identity">${avatarMarkup(x.pilot)}<div class="cka-wins-copy"><strong>${html(x.pilot.display_name)}</strong><span>${html(publicState.teams.find(t=>t.id===x.pilot.default_team_id)?.name||'')}</span></div></div><strong class="cka-wins-count">${Number(x.stats.wins)||0} ${Number(x.stats.wins)===1?'vitória':'vitórias'}</strong></div>`).join(''):'<div class="cka-standings-empty">As vitórias serão destacadas quando os resultados oficiais forem publicados.</div>';
  }
  const status = (el, text, bad = false) => { const n = el.querySelector('.cka-status'); if(n){n.textContent=text;n.style.color=bad?'#ff9c91':'#8ce0ad';} };
  const showError = (el, error) => { el.innerHTML = `<p class="cka-muted">Não foi possível carregar agora: ${html(error?.message || error)}.</p>`; };
  const assetPhoto = (name) => {
    const map = {'Alexandre Monnerat':'alexandre-monnerat-cka.png','André Mitta':'andre-mitta-cka.png','Leonardo Rocha':'leonardo-rocha-cka.png','Luiz Felipe':'luiz-felipe-cka.png','Sardinha':'sardinha-cka.png','Bernardo Gaertner':'bernardo-gaertner-cka.png'};
    return map[name] ? `assets/${map[name]}` : '';
  };
  async function loadCalendar() {
    calendarBox.innerHTML = '<p class="cka-muted">Carregando calendário…</p>';
    const [{data:races,error}, {data:winners}] = await Promise.all([
      db.from('cka_races').select('id,round_number,race_date,start_time,venue,location,status,results_published').eq('is_published',true).order('round_number'),
      db.from('cka_race_winners').select('race_id,winner_name,winner_photo_path,pilot_number')
    ]);
    if(error) return showError(calendarBox,error);
    const winnerMap = new Map((winners||[]).map(w=>[w.race_id,w]));
    calendarBox.innerHTML = `<div class="cka-grid">${(races||[]).map(r=>{
      // The database result is the sole source of truth; never infer a winner from the old HTML.
      const winner=r.status==='completed'&&r.results_published?winnerMap.get(r.id):null;
      let pic=winner?.photo_url||assetPhoto(winner?.winner_name);
      if(!winner?.photo_url&&winner?.winner_photo_path)pic=db.storage.from('cka-media').getPublicUrl(winner.winner_photo_path).data.publicUrl;
      return `<article class="cka-card"><div class="ey">Etapa ${r.round_number}</div><h3>${html(r.venue)}</h3><p>${new Date(`${r.race_date}T12:00:00`).toLocaleDateString('pt-BR')} · ${html(String(r.start_time).slice(0,5))}</p><p class="cka-muted">${html(r.location)}</p>${winner?.winner_name?`<div class="cka-winner">${pic?`<img src="${html(pic)}" alt="Foto de ${html(winner.winner_name)}">`:''}<strong>Vencedor: ${html(winner.winner_name)}</strong></div>`:`<p class="cka-muted">${r.status==='completed'?'Resultado ainda não publicado':'Etapa prevista'}</p>`}</article>`;
    }).join('')}</div>`;
  }
  async function loadMedia(type) {
    const box = type==='photo'?photosBox:videosBox;
    box.innerHTML='<p class="cka-muted">Carregando…</p>';
    const {data,error}=await db.from('cka_media').select('id,title,description,media_type,storage_path,youtube_url,alt_text,race_id,sort_order').eq('is_published',true).eq('media_type',type).order('sort_order').order('created_at');
    if(error)return showError(box,error);
    const races=state.races.length?state.races:(await db.from('cka_races').select('id,round_number').eq('is_published',true)).data||[];
    const raceMap=new Map(races.map(r=>[r.id,r.round_number]));
    if(!data?.length){box.innerHTML='<p class="cka-muted">Ainda não há publicações nesta seção.</p>';return;}
    box.innerHTML=`<div class="cka-grid">${data.map(m=>{const src=m.media_type==='photo'?db.storage.from('cka-media').getPublicUrl(m.storage_path).data.publicUrl:`https://www.youtube-nocookie.com/embed/${youtubeId(m.youtube_url)}`;return `<article class="cka-card cka-media">${m.media_type==='photo'?`<img loading="lazy" src="${html(src)}" alt="${html(m.alt_text||m.title)}">`:`<iframe loading="lazy" src="${html(src)}" title="${html(m.title)}" allowfullscreen></iframe>`}<h3>${html(m.title)}</h3><p class="cka-muted">Etapa ${raceMap.get(m.race_id)||'—'} · ${html(m.description||'')}</p></article>`}).join('')}</div>`;
  }
  function youtubeId(url='') { try {const u=new URL(url);return u.hostname.includes('youtu.be')?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()||'';}catch{return '';} }
  function field(label,name,type='text',opts={}) { return `<label>${label}${opts.help?`<small class="cka-muted">${opts.help}</small>`:''}${type==='select'?`<select name="${name}" ${opts.required?'required':''}>${opts.options||''}</select>`:`<input name="${name}" type="${type}" ${opts.required?'required':''} ${opts.step?`step="${opts.step}"`:''} ${opts.accept?`accept="${opts.accept}"`:''} ${opts.min?`min="${opts.min}"`:''} ${opts.placeholder?`placeholder="${opts.placeholder}"`:''}>`}</label>`; }
  function options(items, label, val='id') { return (items||[]).map(x=>`<option value="${html(x[val])}">${html(label(x))}</option>`).join(''); }
  async function initAdminData() {
    if(state.initialized)return;
    if(adminDataPromise)return adminDataPromise;
    adminDataPromise=(async()=>{
      const [r,p,t]=await Promise.all([
        db.from('cka_races').select('id,season_id,round_number,race_date,start_time,venue,location,status,results_published').order('round_number'),
        db.from('cka_pilots').select('id,season_id,pilot_number,full_name,display_name,default_team_id,photo_path,is_active').order('pilot_number'),
        db.from('cka_teams').select('id,name').eq('is_active',true).order('name')
      ]);
      if(r.error||p.error||t.error)throw r.error||p.error||t.error;
      state.races=r.data;state.pilots=p.data;state.teams=t.data;state.initialized=true;
    })();
    try{await adminDataPromise;}finally{adminDataPromise=null;}
  }
  async function renderAdmin() {
    if(state.admin&&adminBox.querySelector('.cka-box'))return;
    const {data:{session}}=await db.auth.getSession(); state.user=session?.user||null;
    if(!state.user){loginView();return;}
    const {data:isAdmin,error}=await db.rpc('cka_is_admin');
    if(error||!isAdmin){adminBox.innerHTML='<div class="cka-box"><p>Esta conta não está autorizada como administradora do CKA.</p><button class="cka-action" id="cka-logout">Sair</button></div>';adminBox.querySelector('#cka-logout').onclick=()=>db.auth.signOut().then(renderAdmin);return;}
    state.admin=true;
    try { await initAdminData(); adminView(); } catch(e){showError(adminBox,e);}
  }
  function loginView() {
    adminBox.innerHTML=`<div class="cka-box"><h3>Entrar no painel CKA</h3><form id="cka-login" class="cka-form">${field('E-mail','email','email',{required:true})}${field('Senha','password','password',{required:true})}<button class="cka-action primary">Entrar</button></form><p class="cka-status" role="status"></p></div>`;
    adminBox.querySelector('#cka-login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)status(adminBox,error.message,true);else renderAdmin();};
  }
  function adminView() {
    adminBox.innerHTML=`<div class="cka-box"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>Sessão: ${html(state.user.email)}</strong><button class="cka-action" id="cka-logout">Sair</button></div><div class="cka-tabs"><button data-admin-tab="race">Resultados</button><button data-admin-tab="schedule">Calendário</button><button data-admin-tab="team">Equipes</button><button data-admin-tab="pilots">Pilotos</button><button data-admin-tab="media">Fotos / YouTube</button></div><div id="cka-editor"></div><p class="cka-status" role="status"></p></div>`;
    adminBox.querySelector('#cka-logout').onclick=()=>db.auth.signOut().then(()=>{state.admin=false;renderAdmin();});
    adminBox.querySelectorAll('[data-admin-tab]').forEach(b=>b.onclick=()=>{adminBox.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===b));renderEditor(b.dataset.adminTab);});
    adminBox.querySelector('[data-admin-tab="race"]').click();
  }
  function renderEditor(which) {
    const host=adminBox.querySelector('#cka-editor'); if(!host)return;
    const raceOpts=options(state.races,r=>`Etapa ${r.round_number} · ${r.venue}`), pilotOpts=options(state.pilots.filter(p=>p.is_active),p=>`${p.pilot_number} · ${p.display_name}`), teamOpts='<option value="">Sem equipe / não definida</option>'+options(state.teams,t=>t.name);
    if(which==='race') host.innerHTML=`<h3>Lançamento de resultados por etapa</h3><p class="cka-muted">Digite apenas números nos campos de melhor volta e diferença; o formato é aplicado automaticamente ao sair do campo. O rascunho fica salvo neste navegador enquanto você preenche. A camisa CKA aplica +5 pontos; cada advertência desconta automaticamente 3 pontos, inclusive no cálculo dos descartes.</p><form id="cka-result"><div class="cka-result-toolbar"><label>Etapa<select name="race_id" required><option value="">Selecione uma etapa</option>${raceOpts}</select></label><label>Piloto para adicionar<select name="add_pilot_id"><option value="">Selecione um piloto</option>${pilotOpts}</select></label><button class="cka-action" type="button" data-add-pilot>Adicionar piloto</button></div><div class="cka-result-scroll"><table class="cka-result-table"><thead><tr><th>Piloto</th><th>Equipe na etapa</th><th>Situação</th><th>Posição</th><th>Melhor volta</th><th>Diferença para o 1º</th><th>Camisa CKA (+5)</th><th>Advertência (−3)</th><th></th></tr></thead><tbody data-result-rows><tr><td class="cka-result-empty" colspan="9">Selecione uma etapa para carregar os resultados já cadastrados.</td></tr></tbody></table></div><div class="cka-result-actions"><label style="display:flex;align-items:center;gap:8px;color:#b7c4d8"><input name="publish" type="checkbox"> Publicar etapa após salvar — atualiza resultados e pontuação no site</label><button class="cka-action primary" type="submit">Salvar resultados da etapa</button></div></form>`;
    if(which==='schedule') host.innerHTML=`<h3>Editar etapa</h3><form class="cka-form" id="cka-schedule">${field('Etapa','race_id','select',{required:true,options:raceOpts})}${field('Data','race_date','date',{required:true})}${field('Horário','start_time','time',{required:true})}${field('Kartódromo','venue','text',{required:true})}${field('Localidade','location','text',{required:true})}<button class="cka-action primary">Salvar etapa</button></form>`;
    if(which==='team') host.innerHTML=`<h3>Vincular piloto a uma equipe padrão</h3><form class="cka-form" id="cka-team">${field('Piloto','pilot_id','select',{required:true,options:pilotOpts})}${field('Equipe','team_id','select',{options:teamOpts})}<button class="cka-action primary">Salvar equipe</button></form>`;
    if(which==='pilots') {
      const editOpts='<option value="">＋ Novo piloto</option>'+options(state.pilots,p=>`${p.pilot_number} · ${p.display_name}${p.is_active?'':' (inativo)'}`);
      host.innerHTML=`<h3>Gerenciar pilotos</h3><p class="cka-muted">Cadastre ou edite os dados do piloto. Se já houver resultados, ajustes ou mídias vinculadas, inative o cadastro para preservar o histórico do campeonato.</p><form class="cka-form" id="cka-pilot">${field('Selecionar piloto para editar','existing_pilot_id','select',{options:editOpts})}${field('Número do piloto','pilot_number','number',{required:true,min:'1'})}${field('Nome completo','full_name','text',{required:true})}${field('Nome exibido no site','display_name','text',{required:true})}${field('Equipe padrão','default_team_id','select',{options:teamOpts})}${field('Caminho da foto atual (opcional)','photo_path','text')}${field('Enviar nova foto (JPG/PNG/WebP)','photo_file','file',{accept:'image/jpeg,image/png,image/webp'})}<label style="display:flex;align-items:center;gap:8px"><input name="is_active" type="checkbox" checked> Piloto ativo</label><button class="cka-action primary">Salvar piloto</button></form><h3>Relação de pilotos</h3><div class="cka-pilots-scroll"><table class="cka-pilots-table"><thead><tr><th>Nº</th><th>Nome exibido</th><th>Nome completo</th><th>Equipe padrão</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.pilots.map(p=>`<tr><td>${html(p.pilot_number)}</td><td>${html(p.display_name)}</td><td>${html(p.full_name)}</td><td>${html(state.teams.find(t=>t.id===p.default_team_id)?.name||'Sem equipe')}</td><td class="${p.is_active?'':'cka-pilot-inactive'}">${p.is_active?'Ativo':'Inativo'}</td><td><button type="button" class="cka-action" data-edit-pilot="${html(p.id)}">Editar</button> <button type="button" class="cka-action" data-delete-pilot="${html(p.id)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`;
      state.editingPilotId=null;
    }
    if(which==='media') host.innerHTML=`<h3>Publicar foto ou link do YouTube</h3><form class="cka-form" id="cka-media">${field('Etapa','race_id','select',{required:true,options:raceOpts})}${field('Tipo','media_type','select',{options:'<option value="photo">Foto</option><option value="youtube">YouTube</option>'})}${field('Título','title','text',{required:true})}${field('Descrição','description')}${field('Piloto relacionado (opcional)','pilot_id','select',{options:'<option value="">Não relacionado</option>'+pilotOpts})}${field('Arquivo de imagem (JPG/PNG/WebP)','image','file',{accept:'image/jpeg,image/png,image/webp'})}${field('Link do YouTube','youtube_url','url')}<label style="display:flex;align-items:center;gap:8px"><input name="is_published" type="checkbox"> Publicar imediatamente</label><button class="cka-action primary">Salvar mídia</button></form>`;
    bindEditor(which,host);
  }
  function bindEditor(which,host) {
    const form=host.querySelector('form');if(!form)return;
    const select=form.querySelector('[name="race_id"]');
    if(which==='race') {
      const rows=form.querySelector('[data-result-rows]'),addPilot=form.elements.add_pilot_id,added=new Set();
      const teamOptions='<option value="">Sem equipe / não definida</option>'+options(state.teams,t=>t.name);
      const pilotById=id=>state.pilots.find(p=>p.id===id);
      const draftKey=raceId=>`cka:result-draft:${raceId}`;
      const readDraft=raceId=>{
        const key=draftKey(raceId);
        try{const value=localStorage.getItem(key);if(value)return JSON.parse(value);}catch(error){console.warn('CKA: não foi possível ler o rascunho persistente.',error);}
        try{const value=sessionStorage.getItem(key);return value?JSON.parse(value):null;}catch{try{sessionStorage.removeItem(key);}catch{}return null;}
      };
      const clearDraft=raceId=>{try{localStorage.removeItem(draftKey(raceId));}catch{}try{sessionStorage.removeItem(draftKey(raceId));}catch{}};
      const saveDraft=()=>{
        if(!select.value)return;
        const draft={publish:form.elements.publish.checked,rows:[...rows.querySelectorAll('tr[data-pilot-id]')].map(tr=>({pilotId:tr.dataset.pilotId,team:tr.querySelector('[name="team_id"]').value,status:tr.querySelector('[name="status"]').value,position:tr.querySelector('[name="finish_position"]').value,bestLap:tr.querySelector('[name="best_lap"]').value,gap:tr.querySelector('[name="gap_display"]').value,shirt:tr.querySelector('[name="cka_shirt"]').checked,warning:tr.querySelector('[name="warning"]').checked}))};
        const key=draftKey(select.value),value=JSON.stringify(draft);
        try{localStorage.setItem(key,value);}catch(error){try{sessionStorage.setItem(key,value);}catch{console.warn('CKA: não foi possível guardar o rascunho local.',error);}}
      };
      form.addEventListener('input',event=>{if(!['race_id','add_pilot_id'].includes(event.target.name))saveDraft();});
      form.addEventListener('change',event=>{if(!['race_id','add_pilot_id'].includes(event.target.name))saveDraft();});
      const rowMarkup=(pilotId,data={},adjustments=[])=>{
        const pilot=pilotById(pilotId);if(!pilot||added.has(pilotId))return;
        added.add(pilotId);
        const shirt=adjustments.find(a=>a.kind==='bonus'&&a.reason_code==='cka_shirt');
        const warning=adjustments.find(a=>a.kind==='penalty'&&a.reason_code==='warning');
        const lap=data.best_lap_ms?`${String(Math.floor(data.best_lap_ms/60000)).padStart(2,'0')}:${String(Math.floor(data.best_lap_ms/1000)%60).padStart(2,'0')}.${String(data.best_lap_ms%1000).padStart(3,'0')}`:'';
        rows.insertAdjacentHTML('beforeend',`<tr data-pilot-id="${html(pilotId)}"><td class="cka-pilot-cell">${html(pilot.display_name)}</td><td><select name="team_id">${teamOptions}</select></td><td><select name="status"><option value="finished">Concluiu</option><option value="dnf">Abandonou</option><option value="dns">Não largou</option><option value="absent">Ausente</option><option value="disqualified">Desclassificado</option></select></td><td><input name="finish_position" type="number" min="1" placeholder="—"></td><td><input name="best_lap" type="text" inputmode="numeric" autocomplete="off" placeholder="Só números: 0103607"></td><td><input name="gap_display" type="text" inputmode="numeric" autocomplete="off" placeholder="Só números: 6981 ou 1 volta"></td><td><input class="cka-check" name="cka_shirt" type="checkbox" aria-label="Camisa CKA, mais 5 pontos"></td><td><input class="cka-check" name="warning" type="checkbox" aria-label="Recebeu advertência, menos 3 pontos"></td><td><button class="cka-action" type="button" data-remove-pilot>Remover</button></td></tr>`);
        const tr=rows.querySelector(`tr[data-pilot-id="${CSS.escape(pilotId)}"]`);
        tr.querySelector('[name="team_id"]').value=data.team_id||pilot.default_team_id||'';
        tr.querySelector('[name="status"]').value=data.status||'finished';
        tr.querySelector('[name="finish_position"]').value=data.finish_position||'';
        tr.querySelector('[name="best_lap"]').value=lap;
        tr.querySelector('[name="gap_display"]').value=data.gap_display||'';
        tr.querySelector('[name="cka_shirt"]').checked=!!shirt;
        tr.querySelector('[name="warning"]').checked=!!warning;
        tr.querySelector('[name="best_lap"]').addEventListener('input',event=>{event.currentTarget.value=event.currentTarget.value.replace(/[^\d:.+]/g,'');saveDraft();});
        tr.querySelector('[name="gap_display"]').addEventListener('input',saveDraft);
        const normalizeLapInput=event=>{const input=event.currentTarget,ms=parseLap(input.value);if(ms!=null)input.value=formatLap(ms);saveDraft();};
        const normalizeGapInput=event=>{const input=event.currentTarget,gap=parseGap(input.value);if(gap?.gap_ms!=null)input.value=gap.gap_display;saveDraft();};
        tr.querySelector('[name="best_lap"]').addEventListener('blur',normalizeLapInput);
        tr.querySelector('[name="best_lap"]').addEventListener('change',normalizeLapInput);
        tr.querySelector('[name="gap_display"]').addEventListener('blur',normalizeGapInput);
        tr.querySelector('[name="gap_display"]').addEventListener('change',normalizeGapInput);
        tr.querySelector('[data-remove-pilot]').onclick=()=>{added.delete(pilotId);tr.remove();saveDraft();};
      };
      form.querySelector('[data-add-pilot]').onclick=()=>{const id=addPilot.value;if(!id)return status(adminBox,'Escolha um piloto para adicionar.',true);if(added.has(id))return status(adminBox,'Esse piloto já está na lista desta etapa.',true);rowMarkup(id);addPilot.value='';saveDraft();};
      select.onchange=async()=>{
        added.clear();rows.innerHTML='<tr><td class="cka-result-empty" colspan="9">Carregando resultados da etapa…</td></tr>';
        if(!select.value){rows.innerHTML='<tr><td class="cka-result-empty" colspan="9">Selecione uma etapa para carregar os resultados já cadastrados.</td></tr>';return;}
        const raceId=select.value;
        const [result,adjustmentResult]=await Promise.all([
          db.from('cka_race_results').select('pilot_id,team_id,status,finish_position,best_lap_ms,gap_display').eq('race_id',raceId),
          db.from('cka_race_adjustments').select('pilot_id,kind,reason_code,points').eq('race_id',raceId)
        ]);
        if(result.error||adjustmentResult.error){rows.innerHTML='';return status(adminBox,(result.error||adjustmentResult.error).message,true);}
        if(select.value!==raceId)return;
      const results=result.data||[],adjustments=adjustmentResult.data||[];
        rows.innerHTML='';
        for(const r of results)rowMarkup(r.pilot_id,r,adjustments.filter(a=>a.pilot_id===r.pilot_id));
        let draft=null;
      let recoveredDraft=false;
        draft=readDraft(raceId);
        if(draft&&Array.isArray(draft.rows)){
        recoveredDraft=true;
          for(const item of draft.rows){
            if(!added.has(item.pilotId))rowMarkup(item.pilotId);
            const tr=rows.querySelector(`tr[data-pilot-id="${CSS.escape(item.pilotId)}"]`);if(!tr)continue;
            tr.querySelector('[name="team_id"]').value=item.team||'';tr.querySelector('[name="status"]').value=item.status||'finished';
            tr.querySelector('[name="finish_position"]').value=item.position||'';tr.querySelector('[name="best_lap"]').value=item.bestLap||'';tr.querySelector('[name="gap_display"]').value=item.gap||'';
            tr.querySelector('[name="cka_shirt"]').checked=!!item.shirt;tr.querySelector('[name="warning"]').checked=!!item.warning;
          }
          form.elements.publish.checked=!!draft.publish;
          status(adminBox,'Rascunho recuperado neste navegador. Confira os dados antes de salvar.');
        }
        if(!rows.children.length)rows.innerHTML='<tr><td class="cka-result-empty" colspan="9">Nenhum resultado cadastrado nesta etapa. Adicione os pilotos para começar.</td></tr>';
        if(!recoveredDraft){
          const selectedRace=state.races.find(item=>item.id===raceId);
          status(adminBox,selectedRace?.results_published?'Etapa publicada. Ao salvar, as alterações serão recalculadas na classificação.':'Etapa em rascunho: para exibir os resultados e atualizar os pontos, marque “Publicar etapa após salvar”.');
        }
      };
      const parseLap=value=>{
        const text=String(value||'').trim();
        if(/^\d{1,9}$/.test(text)){
          if(text.length<=3)return Number(text)||null;
          const digits=text.padStart(5,'0'),millis=Number(digits.slice(-3)),seconds=Number(digits.slice(-5,-3)),minutes=Number(digits.slice(0,-5)||0);
          return seconds<60?(minutes*60+seconds)*1000+millis:null;
        }
        const match=text.match(/^(?:(\d+):)?(\d{1,2})(?:\.(\d{1,3}))?$/);
        if(!match)return null;
        const minutes=Number(match[1]||0),seconds=Number(match[2]),millis=Number((match[3]||'').padEnd(3,'0'));
        if(seconds>=60)return null;
        const total=(minutes*60+seconds)*1000+millis;
        return total||null;
      };
      const formatLap=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
      const parseGap=value=>{
        const text=String(value||'').trim();
        if(!text||text==='—'||text==='-')return {gap_display:text||null,gap_ms:null,gap_laps:null};
        const lapMatch=text.match(/^(\d+)\s+volta(?:s)?$/i);
        if(lapMatch)return {gap_display:text,gap_ms:null,gap_laps:Number(lapMatch[1])||null};
        if(/^\+?\d{1,9}$/.test(text)){
          const ms=parseLap(text.replace(/^\+/,''));
          if(!ms)return null;
          return {gap_display:`+${formatLap(ms)}`,gap_ms:ms,gap_laps:null};
        }
        const timeMatch=text.match(/^\+?(?:(\d+):)?(\d{1,2})\.(\d{1,3})$/);
        if(!timeMatch)return null;
        const minutes=Number(timeMatch[1]||0),seconds=Number(timeMatch[2]),millis=Number(timeMatch[3].padEnd(3,'0'));
        if(seconds>=60)return null;
        return {gap_display:`+${formatLap((minutes*60+seconds)*1000+millis)}`,gap_ms:(minutes*60+seconds)*1000+millis,gap_laps:null};
      };
      form.onsubmit=async e=>{
        e.preventDefault();
        const race=state.races.find(x=>x.id===select.value),trs=[...rows.querySelectorAll('tr[data-pilot-id]')];
        if(!race)return status(adminBox,'Selecione uma etapa.',true);
        if(!trs.length)return status(adminBox,'Adicione pelo menos um piloto antes de salvar.',true);
        for(const tr of trs){
          const pilot=pilotById(tr.dataset.pilotId),stat=tr.querySelector('[name="status"]').value,pos=tr.querySelector('[name="finish_position"]').value,lapText=tr.querySelector('[name="best_lap"]').value.trim(),lapMs=lapText?parseLap(lapText):null,gap=parseGap(tr.querySelector('[name="gap_display"]').value);
          if(stat==='finished'&&!Number(pos))return status(adminBox,`Informe a posição de ${pilot.display_name}.`,true);
          if(lapText&&!lapMs)return status(adminBox,`Melhor volta inválida para ${pilot.display_name}; digite apenas números (ex.: 0103607) ou informe mm:ss.mmm.`,true);
          if(!gap)return status(adminBox,`Diferença inválida para ${pilot.display_name}; digite apenas números (ex.: 6981), “1 volta” ou deixe em branco.`,true);
          if(lapMs)tr.querySelector('[name="best_lap"]').value=formatLap(lapMs);
          if(gap.gap_ms!=null)tr.querySelector('[name="gap_display"]').value=gap.gap_display;
        }
        const prepared=trs.map(tr=>{
          const pilot=pilotById(tr.dataset.pilotId),stat=tr.querySelector('[name="status"]').value,lapText=tr.querySelector('[name="best_lap"]').value.trim(),gap=parseGap(tr.querySelector('[name="gap_display"]').value),shirt=tr.querySelector('[name="cka_shirt"]').checked,warning=tr.querySelector('[name="warning"]').checked;
          const row={season_id:race.season_id,race_id:race.id,pilot_id:pilot.id,team_id:tr.querySelector('[name="team_id"]').value||null,status:stat,finish_position:stat==='finished'?(Number(tr.querySelector('[name="finish_position"]').value)||null):null,best_lap_ms:lapText?parseLap(lapText):null,...gap};
          return {pilot,row,shirt,warning};
        });
        const {error:resultError}=await db.from('cka_race_results').upsert(prepared.map(item=>item.row),{onConflict:'race_id,pilot_id'});
        if(resultError)return status(adminBox,`Não foi possível salvar os resultados: ${resultError.message}`,true);
        const pilotIds=prepared.map(item=>item.pilot.id);
        const adjustments=prepared.flatMap(item=>[
          ...(item.shirt?[{season_id:race.season_id,race_id:race.id,pilot_id:item.pilot.id,kind:'bonus',reason_code:'cka_shirt',points:5,note:'Camisa CKA'}]:[]),
          ...(item.warning?[{season_id:race.season_id,race_id:race.id,pilot_id:item.pilot.id,kind:'penalty',reason_code:'warning',points:3,note:'Advertência: −3 pontos'}]:[])
        ]);
        const adjustmentOps=[];
        if(adjustments.length)adjustmentOps.push(db.from('cka_race_adjustments').upsert(adjustments,{onConflict:'race_id,pilot_id,kind,reason_code'}));
        const noShirtIds=prepared.filter(item=>!item.shirt).map(item=>item.pilot.id);
        const noWarningIds=prepared.filter(item=>!item.warning).map(item=>item.pilot.id);
        if(noShirtIds.length)adjustmentOps.push(db.from('cka_race_adjustments').delete().eq('race_id',race.id).eq('kind','bonus').eq('reason_code','cka_shirt').in('pilot_id',noShirtIds));
        if(noWarningIds.length)adjustmentOps.push(db.from('cka_race_adjustments').delete().eq('race_id',race.id).eq('kind','penalty').eq('reason_code','warning').in('pilot_id',noWarningIds));
        const adjustmentResults=await Promise.all(adjustmentOps);
        const adjustmentFailure=adjustmentResults.find(result=>result.error);
        if(adjustmentFailure)return status(adminBox,`Os resultados foram salvos, mas um bônus/advertência falhou: ${adjustmentFailure.error.message}. Confira os ajustes antes de publicar.`,true);
        const saved=prepared.length;
        if(form.elements.publish.checked){const {error}=await db.from('cka_races').update({results_published:true,status:'completed'}).eq('id',race.id);if(error)return status(adminBox,`Resultados salvos, mas não foi possível publicar a etapa: ${error.message}`,true);}
        const published=!!(form.elements.publish.checked||race.results_published);
        if(form.elements.publish.checked)race.results_published=true;
        const synced=await refreshPublicData();
        if(synced)clearDraft(race.id);
        status(adminBox,synced?(published?`${saved} resultado(s) salvos e publicados. Classificações, pontos, vitórias, pódios, equipes, resultados e calendário foram atualizados.`:`${saved} resultado(s) salvos como rascunho. Para atualizar a área pública, marque “Publicar etapa após salvar”. A camisa aplica +5 e a advertência segue a regra dos descartes.`):`Resultados gravados, mas não consegui atualizar a visualização pública: ${publicState.error?.message||'erro de conexão'}.`,!synced);
      };
      select.dispatchEvent(new Event('change'));
      return;
    }
    if(which==='schedule'&&select){select.onchange=()=>{const r=state.races.find(x=>x.id===select.value);if(!r)return;form.elements.race_date.value=r.race_date;form.elements.start_time.value=String(r.start_time).slice(0,5);form.elements.venue.value=r.venue;form.elements.location.value=r.location;};select.dispatchEvent(new Event('change'));}
    if(which==='pilots') {
      const picker=form.elements.existing_pilot_id;
      const loadPilot=()=>{
        const pilot=state.pilots.find(p=>p.id===picker.value);
        state.editingPilotId=pilot?.id||null;
        form.elements.pilot_number.value=pilot?.pilot_number||'';
        form.elements.full_name.value=pilot?.full_name||'';
        form.elements.display_name.value=pilot?.display_name||'';
        form.elements.default_team_id.value=pilot?.default_team_id||'';
        form.elements.photo_path.value=pilot?.photo_path||'';
        form.elements.is_active.checked=pilot?pilot.is_active:true;
        form.querySelector('button').textContent=pilot?'Salvar alterações':'Cadastrar piloto';
      };
      picker.onchange=loadPilot;
      host.querySelectorAll('[data-edit-pilot]').forEach(button=>button.onclick=()=>{picker.value=button.dataset.editPilot;picker.dispatchEvent(new Event('change'));form.scrollIntoView({behavior:'smooth',block:'start'});});
      host.querySelectorAll('[data-delete-pilot]').forEach(button=>button.onclick=async()=>{
        const pilot=state.pilots.find(p=>p.id===button.dataset.deletePilot);if(!pilot)return;
        const references=await Promise.all([
          db.from('cka_race_results').select('id',{count:'exact',head:true}).eq('pilot_id',pilot.id),
          db.from('cka_race_adjustments').select('id',{count:'exact',head:true}).eq('pilot_id',pilot.id),
          db.from('cka_media').select('id',{count:'exact',head:true}).eq('pilot_id',pilot.id)
        ]);
        const failed=references.find(result=>result.error);
        if(failed)return status(adminBox,`Não foi possível conferir o histórico: ${failed.error.message}`,true);
        const [results,adjustments,media]=references.map(result=>result.count||0);
        if(results||adjustments||media)return status(adminBox,`${pilot.display_name} tem histórico vinculado (${results} resultado(s), ${adjustments} ajuste(s), ${media} mídia(s)). Para preservar os dados, desmarque “Piloto ativo” no cadastro em vez de excluir.`,true);
        if(!window.confirm(`Excluir definitivamente o piloto ${pilot.display_name}? Esta ação não pode ser desfeita.`))return;
        const {error}=await db.from('cka_pilots').delete().eq('id',pilot.id);
        if(error)return status(adminBox,error.message,true);
        state.initialized=false;await initAdminData();renderEditor('pilots');status(adminBox,`Piloto ${pilot.display_name} excluído.`);
      });
      form.onsubmit=async e=>{
        e.preventDefault();
        const f=new FormData(form),existing=state.pilots.find(p=>p.id===state.editingPilotId);
        const seasonId=existing?.season_id||state.races[0]?.season_id;
        if(!seasonId)return status(adminBox,'Não encontrei a temporada ativa para este piloto.',true);
        const row={season_id:seasonId,pilot_number:Number(f.get('pilot_number')),full_name:String(f.get('full_name')).trim(),display_name:String(f.get('display_name')).trim(),default_team_id:f.get('default_team_id')||null,photo_path:String(f.get('photo_path')||'').trim()||null,is_active:f.get('is_active')==='on'};
        const file=f.get('photo_file');
        if(file?.size){
          const clean=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
          const path=`2026/pilots/${crypto.randomUUID()}-${clean}`;
          const {error:uploadError}=await db.storage.from('cka-media').upload(path,file,{upsert:false});
          if(uploadError)return status(adminBox,uploadError.message,true);
          row.photo_path=path;
        }
        const result=state.editingPilotId
          ?await db.from('cka_pilots').update(row).eq('id',state.editingPilotId)
          :await db.from('cka_pilots').insert(row);
        if(result.error)return status(adminBox,result.error.message,true);
        const savedId=state.editingPilotId;
        state.initialized=false;
        await initAdminData();
        await refreshPublicData();
        renderEditor('pilots');
        if(savedId){adminBox.querySelector('[name="existing_pilot_id"]').value=savedId;adminBox.querySelector('[name="existing_pilot_id"]').dispatchEvent(new Event('change'));}
        status(adminBox,existing?'Dados do piloto atualizados.':'Piloto cadastrado.');
      };
      picker.dispatchEvent(new Event('change'));
    }
    if(which==='schedule')form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),race=state.races.find(item=>item.id===f.get('race_id')),updates={race_date:f.get('race_date'),start_time:f.get('start_time'),venue:f.get('venue'),location:f.get('location')};const {error}=await db.from('cka_races').update(updates).eq('id',f.get('race_id'));if(!error){Object.assign(race,updates);await refreshPublicData();}status(adminBox,error?.message||'Etapa atualizada.',!!error);};
    if(which==='team')form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),pilot=state.pilots.find(x=>x.id===f.get('pilot_id'));const {error}=await db.from('cka_pilots').update({default_team_id:f.get('team_id')||null}).eq('id',pilot.id);if(!error){pilot.default_team_id=f.get('team_id')||null;await refreshPublicData();}status(adminBox,error?.message||'Equipe padrão do piloto atualizada.',!!error);};
    if(which==='media')form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),type=f.get('media_type'),race=state.races.find(x=>x.id===f.get('race_id'));let storage_path=null,youtube_url=null;if(type==='photo'){const file=f.get('image');if(!file?.size)return status(adminBox,'Escolha uma imagem.',true);const clean=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-'),path=`2026/etapa-${race.round_number}/${crypto.randomUUID()}-${clean}`;const {error}=await db.storage.from('cka-media').upload(path,file,{upsert:false});if(error)return status(adminBox,error.message,true);storage_path=path;}else{youtube_url=f.get('youtube_url');if(!youtubeId(youtube_url))return status(adminBox,'Informe um link válido do YouTube.',true);}const row={season_id:race.season_id,race_id:race.id,pilot_id:f.get('pilot_id')||null,media_type:type,title:f.get('title'),description:f.get('description')||null,storage_path,youtube_url,alt_text:f.get('title'),is_published:f.get('is_published')==='on'};const {error}=await db.from('cka_media').insert(row);status(adminBox,error?.message||'Mídia cadastrada.',!!error);if(!error)form.reset();};
  }
  let liveRenderQueued=false;
  const repairLiveMarkup=()=>{
    if(!publicState.ready||liveRenderQueued)return;
    liveRenderQueued=true;
    requestAnimationFrame(()=>{liveRenderQueued=false;renderLiveStandings();renderLiveTeams();renderLivePilots();renderLiveResults(publicState.selectedRound);syncLiveSeasonFacts();});
  };
  ['#classification','#teams','#pilotcards','#resultbuttons','#results'].forEach(selector=>{
    const node=document.querySelector(selector);
    if(node)new MutationObserver(repairLiveMarkup).observe(node,{childList:true,subtree:true,characterData:true});
  });
  void refreshPublicData();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshPublicData();});
  window.setInterval(()=>{if(!document.hidden)void refreshPublicData();},30000);
  db.auth.onAuthStateChange((event) => { if(event==='SIGNED_IN'||event==='SIGNED_OUT'){ if(event==='SIGNED_OUT'){state.admin=false;state.initialized=false;} if(document.querySelector('#cka-admin.active')) renderAdmin(); } });
})();
