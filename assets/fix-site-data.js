(function () {
  'use strict';

  // With Supabase configured, the public tables and statistics are rendered
  // from the live standings views by cka-site.js; legacy DOM-derived values
  // must not overwrite those results.
  if (window.CKA_SUPABASE_CONFIG?.url) return;

  var stageScoresByTeam = {};
  var scoreByTeam = {};
  function teamKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/and/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
    var team = row.querySelector('.team');
    var stages = row.querySelectorAll('.stage');
    if (!team) return;
    var key = teamKey(team.textContent);
    if (!stageScoresByTeam[key]) stageScoresByTeam[key] = [];
    Array.prototype.forEach.call(stages, function (cell, stageIndex) {
      var position = parseInt(cell.textContent, 10);
      var points = position > 0 && position <= 20 ? 21 - position : 0;
      if (!stageScoresByTeam[key][stageIndex]) stageScoresByTeam[key][stageIndex] = [];
      stageScoresByTeam[key][stageIndex].push(points);
    });
  });

  Object.keys(stageScoresByTeam).forEach(function (key) {
    scoreByTeam[key] = stageScoresByTeam[key].reduce(function (seasonTotal, stageScores) {
      return seasonTotal + (stageScores || []).sort(function (a, b) { return b - a; })
        .slice(0, 2).reduce(function (stageTotal, points) { return stageTotal + points; }, 0);
    }, 0);
  });

  var teamBox = document.querySelector('#teams');
  if (teamBox) {
    var header = teamBox.querySelector('.teamrow.headrow');
    if (header && header.children.length < 3) {
      var label = document.createElement('span');
      label.textContent = 'Pontos';
      header.appendChild(label);
    }

    var teamRows = Array.prototype.slice.call(teamBox.querySelectorAll('.teamrow:not(.headrow)'));
    teamRows.sort(function (a, b) {
      function rowScore(row) {
        var details = row.querySelector('.team-details, details');
        var name = details && details.querySelector('summary')
          ? details.querySelector('summary').textContent
          : row.children[1] && row.children[1].textContent;
        return scoreByTeam[teamKey(name)] || 0;
      }
      return rowScore(b) - rowScore(a);
    });
    teamRows.forEach(function (row, index) {
      var details = row.querySelector('.team-details, details');
      var name = details && details.querySelector('summary')
        ? details.querySelector('summary').textContent
        : row.children[1] && row.children[1].textContent;
      var score = scoreByTeam[teamKey(name)];
      if (score === undefined) return;

      var position = row.querySelector('.team-position') || row.querySelector('b');
      if (position) position.textContent = (index + 1) + 'º';

      var points = row.querySelector('.points');
      if (!points) {
        points = document.createElement('strong');
        points.className = 'points';
        if (details) details.insertAdjacentElement('afterend', points);
        else row.appendChild(points);
      }
      points.textContent = String(score);
      points.setAttribute('aria-label', score + ' pontos');
      points.style.cssText = 'display:block!important;visibility:visible!important;opacity:1!important;grid-column:3;grid-row:1;text-align:right;color:var(--gold);font-size:18px';
      teamBox.appendChild(row);
    });
  }

  var officialTimes = {
    3: [
      ['Luiz Felipe', '00:46.511', '—'], ['Marcelo Albuquerque', '00:46.640', '00:07.209'],
      ['Miro', '00:46.833', '00:09.865'], ['Leonardo Rocha', '00:46.770', '00:12.142'],
      ['Ricardo Finim', '00:46.739', '00:12.532'], ['Alessandro Soares', '00:47.464', '00:30.087'],
      ['João Victor Barbosa', '00:46.885', '00:30.172'], ['André Afonso', '00:47.683', '00:34.845'],
      ['Pedro Pitanga', '00:47.575', '00:35.162'], ['Adilson Mangiavaki', '00:47.856', '00:42.788'],
      ['Bernardo Gaertner', '00:47.899', '1 volta'], ['André Mitta', '00:47.749', '1 volta'],
      ['José Geraldo', '00:47.278', '1 volta'], ['Henrique Arroz', '00:48.754', '1 volta'],
      ['Hiltinho', '00:49.228', '1 volta']
    ],
    4: [
      ['Marcelo Albuquerque', '00:46.518', '—'], ['João Victor Barbosa', '00:47.165', '00:11.071'],
      ['Miro', '00:47.080', '00:16.511'], ['Leonardo Rocha', '00:47.249', '00:16.842'],
      ['Ricardo Finim', '00:47.000', '00:17.877'], ['Pedro Pitanga', '00:47.485', '00:26.670'],
      ['André Afonso', '00:46.879', '00:31.515'], ['Bernardo Gaertner', '00:47.510', '00:32.605'],
      ['Luiz Felipe', '00:47.235', '00:34.868'], ['André Mitta', '00:47.406', '00:38.048'],
      ['Henrique Arroz', '00:47.780', '00:38.551'], ['Sardinha', '00:48.037', '00:41.212'],
      ['Alessandro Soares', '00:47.621', '00:43.901'], ['Anderson Poubel', '00:47.958', '1 volta']
    ],
    6: [
      ['Marcelo Albuquerque', '00:47.532', '—'], ['Miro', '00:47.433', '+00:03.182'],
      ['Leonardo Rocha', '00:47.697', '+00:06.981'], ['André Afonso', '00:47.561', '+00:08.205'],
      ['Luiz Costa', '00:47.343', '+00:10.367'], ['João Araujo', '00:47.811', '+00:11.284'],
      ['Alexandre Reis', '00:47.791', '+00:11.422'], ['Alessandro Soares', '00:47.644', '+00:16.245'],
      ['Ricardo Menezes', '00:47.924', '+00:22.316'], ['Henrique Oliveira', '00:48.216', '+00:24.184'],
      ['Sardinha', '00:48.272', '+00:31.822'], ['Anderson Poubel', '00:48.556', '+00:32.727'],
      ['Bernardo Gaertner', '00:48.174', '+00:39.397'], ['Pedro Pitanga', '00:48.740', '+00:43.777'],
      ['José Silva', '00:48.373', '1 volta'], ['André Rodrigues', '00:48.608', '+00:12.072'],
      ['Adilson Filho', '00:48.931', '+00:12.309'], ['Antonio Junior', '00:47.154', '+00:43.919'],
      ['Anderson Pires', '00:49.432', '+00:48.838']
    ]
  };

  var resultBox = document.querySelector('#results');
  var buttonBox = document.querySelector('#resultbuttons');
  if (!resultBox || !buttonBox) return;
  var timeNote = document.createElement('p');
  timeNote.className = 'note';
  timeNote.textContent = 'Os tempos de volta desta etapa ainda não foram cadastrados.';
  resultBox.parentNode.insertBefore(timeNote, resultBox);

  function currentStandings(stageIndex) {
    return Array.from(document.querySelectorAll('#classification .row:not(.headrow)'))
      .map(function (row) {
        var places = row.querySelectorAll('.stage');
        var position = places[stageIndex] && parseInt(places[stageIndex].textContent, 10);
        var pilot = row.querySelector('.pilot strong');
        return position && pilot ? { position: position, name: pilot.textContent.trim() } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) { return a.position - b.position; });
  }

  function renderResults(stageIndex) {
    timeNote.hidden = !officialTimes[stageIndex];
    var list = officialTimes[stageIndex]
      ? officialTimes[stageIndex].map(function (item, index) {
          return { position: index + 1, name: item[0], best: item[1], difference: item[2] };
        })
      : currentStandings(stageIndex).map(function (item) {
          return { position: item.position, name: item.name, best: '—', difference: '—' };
        });

    var html = '<div class="resultrow"><span>Posição</span><span>Piloto</span><span>Melhor volta</span><span>Diferença</span></div>';
    html += list.map(function (item) {
      return '<div class="resultrow"><b>' + item.position + 'º</b>' +
        '<span class="result-pilot"><span class="placeholder"></span><strong>' + item.name + '</strong></span>' +
        '<span>' + item.best + '</span><span>' + item.difference + '</span></div>';
    }).join('');
    resultBox.innerHTML = html;
  }

  function selectStage(button) {
    var match = button.textContent.match(/Etapa\s+(\d+)/i);
    if (!match) return;
    var stageIndex = parseInt(match[1], 10) - 1;
    if (stageIndex > 6) return;
    buttonBox.querySelectorAll('.result-btn').forEach(function (item) {
      item.classList.toggle('active', item === button);
    });
    renderResults(stageIndex);
  }

  buttonBox.addEventListener('click', function (event) {
    var button = event.target && event.target.closest && event.target.closest('.result-btn');
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectStage(button);
  }, true);

  var activeButton = buttonBox.querySelector('.result-btn.active');
  selectStage(activeButton || buttonBox.querySelector('.result-btn'));

  function installTeamStageBreakdown() {
    if (!document.querySelector('#classification') || !document.querySelector('#teams')) return;
    if (!document.getElementById('team-stage-breakdown-style')) {
      var style = document.createElement('style');
      style.id = 'team-stage-breakdown-style';
      style.textContent = '.team-stage-breakdown{margin:12px 0 4px;padding:12px;border:1px solid rgba(78,143,205,.28);border-radius:10px;background:rgba(7,18,32,.55)}.team-stage-breakdown h4{margin:0 0 9px;color:#9fb4ce;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.team-stage-line{display:grid;grid-template-columns:90px minmax(0,1fr) 58px;gap:8px;align-items:center;padding:7px 2px;border-top:1px solid rgba(78,143,205,.14);font-size:12px}.team-stage-line:first-of-type{border-top:0}.team-stage-line span:first-child{color:#aebbd0}.team-stage-line span:nth-child(2){color:#e5ebf4}.team-stage-line b{text-align:right;color:#ffd166;white-space:nowrap}@media(max-width:560px){.team-stage-line{grid-template-columns:67px minmax(0,1fr) 48px;gap:5px;font-size:11px}}';
      document.head.appendChild(style);
    }
    function key(value) {
      return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/and/g, '').replace(/[^a-z0-9]/g, '');
    }
    function refresh() {
      var byTeam = {};
      document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
        var nameNode = row.querySelector('.pilot strong');
        var teamNode = row.querySelector('.team');
        if (!nameNode || !teamNode) return;
        var team = teamNode.textContent.trim();
        if (!team || /^a definir$/i.test(team)) return;
        var id = key(team);
        if (!byTeam[id]) byTeam[id] = { name: team, stages: Array.from({ length: 11 }, function () { return []; }) };
        Array.from(row.querySelectorAll('.stage')).slice(0, 11).forEach(function (cell, index) {
          var match = cell.textContent.trim().match(/^(\d{1,2})/);
          var place = match ? parseInt(match[1], 10) : 0;
          if (place >= 1 && place <= 20) byTeam[id].stages[index].push({ name: nameNode.textContent.trim(), place: place, points: 21 - place });
        });
      });
      document.querySelectorAll('#teams .teamrow:not(.headrow)').forEach(function (row) {
        var details = row.querySelector('.team-details');
        if (!details) return;
        var summary = details.querySelector('summary');
        var teamId = key(summary ? summary.textContent : '');
        var team = byTeam[teamId];
        if (!team) return;
        var signature = team.stages.map(function (list) { return list.map(function (item) { return item.name + ':' + item.place; }).join(','); }).join('|');
        var panel = details.querySelector('.team-stage-breakdown');
        if (panel && panel.dataset.signature === signature) return;
        if (!panel) {
          panel = document.createElement('div');
          panel.className = 'team-stage-breakdown';
          details.appendChild(panel);
        }
        panel.dataset.signature = signature;
        panel.replaceChildren();
        var heading = document.createElement('h4');
        heading.textContent = 'Pontos da equipe por etapa';
        panel.appendChild(heading);
        team.stages.forEach(function (results, index) {
          var best = results.slice().sort(function (a, b) { return b.points - a.points || a.place - b.place; }).slice(0, 2);
          var total = best.reduce(function (sum, item) { return sum + item.points; }, 0);
          var line = document.createElement('div');
          line.className = 'team-stage-line';
          var stageLabel = document.createElement('span');
          stageLabel.textContent = 'Etapa ' + (index + 1);
          var contributors = document.createElement('span');
          contributors.textContent = best.length ? best.map(function (item) { return item.name + ' (' + item.points + ')'; }).join(' + ') : 'Sem resultado pontuado';
          var points = document.createElement('b');
          points.textContent = total + ' pts';
          line.append(stageLabel, contributors, points);
          panel.appendChild(line);
        });
      });
    }
    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; refresh(); });
    }
    refresh();
    var observer = new MutationObserver(schedule);
    ['#classification', '#teams'].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (node) observer.observe(node, { childList: true, subtree: true, characterData: true });
    });
  }
  installTeamStageBreakdown();
})();
