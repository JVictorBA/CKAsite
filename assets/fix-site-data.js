(function () {
  'use strict';

  var pilotPhotos = {
    'andre mitta': 'assets/andre-mitta-cka.png',
    'leonardo rocha': 'assets/leonardo-rocha-cka.png',
    'alexandre monnerat': 'assets/alexandre-monnerat-cka.png',
    'sardinha': 'assets/sardinha-cka.png'
  };
  function syncPilotPhotos() {
    document.querySelectorAll('.pilot-card,.pilot-detail-head,.pilot,.pilotinfo,.result-pilot,.team-details li').forEach(function (wrapper) {
      var label = wrapper.querySelector('h3,strong');
      var name = (label ? label.textContent : wrapper.textContent).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      var photoName = Object.keys(pilotPhotos).find(function (key) { return name.indexOf(key) >= 0; });
      if (!photoName) return;
      var image = wrapper.querySelector('img');
      if (!image) {
        image = document.createElement('img');
        image.className = 'avatar';
        wrapper.insertBefore(image, wrapper.firstChild);
      }
      image.src = pilotPhotos[photoName];
      image.alt = photoName.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
      var placeholder = wrapper.querySelector('.placeholder');
      if (placeholder) placeholder.remove();
    });
  }
  function removeChampionshipLeaderLabel() {
    document.querySelectorAll('#classification .pilot small').forEach(function (label) {
      if (/líder do campeonato/i.test(label.textContent)) label.remove();
    });
  }
  function syncPilotProfilePoints() {
    function normalizeName(value) {
      return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }
    function statsFor(name) {
      var wanted = normalizeName(name);
      var row = Array.prototype.find.call(document.querySelectorAll('#classification .row:not(.headrow)'), function (item) {
        var label = item.querySelector('.pilot strong');
        return label && normalizeName(label.textContent) === wanted;
      });
      var points = row && row.querySelector('.points');
      if (!row) return null;
      var stages = Array.prototype.map.call(row.querySelectorAll('.stage'), function (cell) {
        var value = parseInt(cell.textContent, 10);
        return value > 0 ? value : null;
      }).filter(function (value) { return value !== null; });
      return {
        points: points ? points.textContent.trim() : '0',
        stages: stages.length,
        wins: stages.filter(function (position) { return position === 1; }).length,
        podiums: stages.filter(function (position) { return position >= 1 && position <= 5; }).length
      };
    }
    document.querySelectorAll('#pilotcards .pilot-card').forEach(function (card) {
      var name = card.querySelector('h3');
      var data = name && statsFor(name.textContent);
      var value = card.querySelector('.points');
      if (data && value && value.textContent.trim() !== data.points) value.textContent = data.points;
    });
    var detail = document.querySelector('#pilot-detail.active');
    var heading = detail && detail.querySelector('.pilot-detail-head h3');
    var data = heading && statsFor(heading.textContent);
    var stats = detail && detail.querySelectorAll('.pilot-detail-stats > div');
    if (data && stats && stats.length) {
      [data.points, data.stages, data.wins, data.podiums,
        String(data.stages ? Math.round(Number(data.points) / data.stages) : 0)].forEach(function (value, index) {
        var cell = stats[index] && stats[index].querySelector('b');
        if (cell && cell.textContent.trim() !== String(value)) cell.textContent = String(value);
      });
    }
  }
  syncPilotPhotos();
  removeChampionshipLeaderLabel();
  syncPilotProfilePoints();
  var photoObserver = new MutationObserver(function () { syncPilotPhotos(); removeChampionshipLeaderLabel(); });
  ['#classification', '#pilotcards', '#results', '#teams'].forEach(function (selector) {
    var node = document.querySelector(selector);
    if (node) photoObserver.observe(node, { childList: true, subtree: true, characterData: selector === '#classification' });
  });
  var profileBox = document.querySelector('#pilotcards');
  if (profileBox) {
    var profileObserver = new MutationObserver(function () { syncPilotProfilePoints(); syncPilotPhotos(); });
    profileObserver.observe(profileBox, { childList: true, subtree: true, characterData: true });
    profileBox.addEventListener('click', function () { setTimeout(function () { syncPilotProfilePoints(); syncPilotPhotos(); }, 0); });
    profileBox.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') setTimeout(function () { syncPilotProfilePoints(); syncPilotPhotos(); }, 0);
    });
  }

  var stageScoresByTeam = {};
  var scoreByTeam = {};
  function teamKey(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/and/g, '').replace(/[^a-z0-9]/g, '');
  }
  var stage8 = [
    ['Marcelo Albuquerque', 1], ['Leonardo Rocha', 2], ['Luiz Felipe', 3], ['Toninho Macedo', 4],
    ['João Victor Barbosa', 5], ['Miro', 6], ['André Afonso', 7], ['Alexandre Monnerat', 8],
    ['Alessandro Soares', 9], ['André Mitta', 10], ['Anderson Poubel', 11], ['Ricardo Finim', 12],
    ['Henrique Arroz', 13], ['Bernardo Gaertner', 14], ['Sardinha', 15]
  ];
  var stage8Points = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6];
  var stage8ByName = {};
  stage8.forEach(function (entry) { stage8ByName[entry[0]] = entry[1]; });
  stage8ByName['Marcelo Alburquerque'] = 1;
  stage8ByName['João Victor'] = 5;
  stage8ByName['Toninho'] = 4;
  stage8ByName['Ricardo'] = 12;
  var stage8Totals = {};
  var stage8Applied = false;
  var existingExact = Array.prototype.find.call(document.scripts, function (script) { return script.textContent.indexOf('var exact=') >= 0; });
  var exactRows = [];
  if (existingExact) {
    var matchExact = existingExact.textContent.match(/var exact=(\[[\s\S]*?\]);document\.querySelectorAll/);
    if (matchExact) { try { exactRows = Function('return ' + matchExact[1])(); } catch (error) { exactRows = []; } }
  }
  var resultNameToRowName = { 'Marcelo Albuquerque':'Marcelo Alburquerque', 'João Victor Barbosa':'João Victor Barbosa', 'Toninho Macedo':'Toninho', 'Miro':'Miro', 'Leonardo Rocha':'Leonardo Rocha', 'Luiz Felipe':'Luiz Felipe', 'André Afonso':'André Afonso', 'Alexandre Monnerat':'Alexandre Monnerat', 'Alessandro Soares':'Alessandro Soares', 'André Mitta':'André Mitta', 'Anderson Poubel':'Anderson Poubel', 'Ricardo Finim':'Ricardo Finim', 'Henrique Arroz':'Henrique Arroz', 'Bernardo Gaertner':'Bernardo Gaertner', 'Sardinha':'Sardinha' };
  var stage8OfficialTimes = [
    ['Marcelo Albuquerque', '01:04.625', '—'], ['Leonardo Rocha', '01:05.172', '00:26.972'],
    ['Luiz Felipe', '01:06.792', '00:27.542'], ['Toninho Macedo', '01:04.852', '00:29.019'],
    ['João Victor Barbosa', '01:04.972', '00:32.076'], ['Miro', '01:05.279', '00:36.964'],
    ['André Afonso', '01:03.607', '00:51.764'], ['Alexandre Monnerat', '01:04.113', '00:54.283'],
    ['Alessandro Soares', '01:08.341', '1 volta'], ['André Mitta', '01:06.640', '1 volta'],
    ['Anderson Poubel', '01:07.742', '1 volta'], ['Ricardo Finim', '01:09.053', '1 volta'],
    ['Henrique Arroz', '01:06.507', '2 voltas'], ['Bernardo Gaertner', '01:08.664', '2 voltas'],
    ['Sardinha', '01:10.736', '2 voltas']
  ];
  var classification = document.querySelector('#classification');
  if (classification) {
    var header = classification.querySelector('.headrow');
    if (header && header.children[11]) header.children[11].textContent = 'Etapa 8 · Kartódromo do Guará';
    document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
      var nameNode = row.querySelector('.pilot strong');
      var name = nameNode && nameNode.textContent.trim();
      var position = stage8ByName[name];
      var existingStages = row.querySelectorAll('.stage');
      var priorScores = Array.prototype.slice.call(existingStages, 0, 7).map(function (cell) {
        var priorPosition = parseInt(cell.textContent, 10);
        return priorPosition > 0 && priorPosition <= 20 ? 21 - priorPosition : 0;
      });
      var bonus = row.querySelector('.bonus');
      var warning = row.querySelector('.warning');
      var saldo = bonus ? (parseInt(bonus.textContent, 10) || 0) - (parseInt(warning && warning.textContent, 10) || 0) : 0;
      var stageCell = document.createElement('span');
      stageCell.className = 'stage ' + (position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : position ? '' : 'future');
      stageCell.innerHTML = position ? '<span>' + position + 'º</span><small>' + stage8Points[position - 1] + ' pts</small>' : '<span>—</span>';
      if (existingStages.length >= 11) existingStages[7].replaceWith(stageCell);
      else if (existingStages[6]) existingStages[6].insertAdjacentElement('afterend', stageCell);
      else row.appendChild(stageCell);
      var allScores = priorScores.concat(position ? stage8Points[position - 1] : 0);
      var discarded = allScores.slice().sort(function (a, b) { return a - b; }).slice(0, 2);
      var total = allScores.reduce(function (sum, score) { return sum + score; }, 0) + saldo - discarded[0] - discarded[1];
      stage8Totals[name] = { position: position || null, total: total, saldo: saldo };
    });
    var orderedRows = Array.prototype.slice.call(document.querySelectorAll('#classification .row:not(.headrow)'));
    orderedRows.sort(function (a, b) {
      var an = a.querySelector('.pilot strong').textContent.trim();
      var bn = b.querySelector('.pilot strong').textContent.trim();
      var ap = stage8Totals[an], bp = stage8Totals[bn];
      return (bp.total - ap.total) || (ap.position || 99) - (bp.position || 99);
    });
    orderedRows.forEach(function (row, index) {
      var name = row.querySelector('.pilot strong').textContent.trim();
      var data = stage8Totals[name];
      var points = row.querySelectorAll('.points');
      row.querySelector('.pos').textContent = (index + 1) + 'º';
      if (points[0]) points[0].textContent = String(data.total);
    });
    orderedRows.forEach(function (row) { classification.appendChild(row); });
    if (exactRows.length) {
      var refreshedExact = Array.prototype.find.call(document.scripts, function (script) { return script.textContent.indexOf('var exact=') >= 0; });
      if (refreshedExact) refreshedExact.textContent = refreshedExact.textContent.replace(/var exact=\[[\s\S]*?\];document\.querySelectorAll/, 'var exact=' + JSON.stringify(exactRows) + ';document.querySelectorAll');
    }
    document.querySelectorAll('#pilotcards .pilotcard:not(:first-child)').forEach(function (card) {
      var node = card.querySelector('.pilotinfo strong');
      if (!node) return;
      var data = stage8Totals[node.textContent.trim()];
      var points = card.querySelector('.points');
      if (data && points) points.textContent = String(data.total);
      if (data && data.position) {
        var countCell = card.children[1];
        if (countCell) countCell.textContent = String((parseInt(countCell.textContent, 10) || 0) + 1);
      }
    });
    document.querySelectorAll('#teams .teamrow:not(.headrow) details').forEach(function (details) {
      var summary = details.querySelector('summary');
      var list = details.querySelector('ul');
      if (summary && teamKey(summary.textContent) === teamKey('EFK') && list &&
          !Array.prototype.some.call(list.children, function (li) { return li.textContent.indexOf('Adilson Mangiavaki') >= 0; })) {
        var member = document.createElement('li');
        member.innerHTML = '<span class="placeholder"></span>Adilson Mangiavaki';
        list.appendChild(member);
      }
    });
    var stageLabel = document.querySelector('#classificacao .head p');
    if (stageLabel) stageLabel.textContent = '21 pilotos · 8 etapas realizadas';
    stage8Applied = true;
    var resultsBox = document.querySelector('#results');
    var resultsButtons = document.querySelector('#resultbuttons');
    if (resultsBox && resultsButtons) {
      var stage8Button = Array.prototype.find.call(resultsButtons.querySelectorAll('.result-btn'), function (button) { return /Etapa\s*8/i.test(button.textContent); });
      if (!stage8Button) {
        stage8Button = document.createElement('button');
        stage8Button.className = 'result-btn';
        stage8Button.textContent = 'Etapa 8 · Kartódromo do Guará';
        resultsButtons.appendChild(stage8Button);
      }
      stage8Button.disabled = false;
      stage8Button.textContent = 'Etapa 8 · Kartódromo do Guará';
      stage8Button.addEventListener('click', function () {
        resultsButtons.querySelectorAll('.result-btn').forEach(function (button) { button.classList.toggle('active', button === stage8Button); });
        resultsBox.innerHTML = '<div class="resultrow"><span>Posição</span><span>Piloto</span><span>Melhor volta</span><span>Diferença</span></div>' + stage8OfficialTimes.map(function (item, index) {
          return '<div class="resultrow"><b>' + (index + 1) + 'º</b><span class="result-pilot"><span class="placeholder"></span><strong>' + item[0] + '</strong></span><span>' + item[1] + '</span><span>' + item[2] + '</span></div>';
        }).join('');
      });
    }
  }
  var officialBonus = { 'Adilson Mangiavaki': 25, 'Derson': 25 };
  document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
    var name = row.querySelector('.pilot strong');
    var team = row.querySelector('.team');
    if (!name) return;
    if (name.textContent.trim() === 'Adilson Mangiavaki') {
      if (team) team.textContent = 'EFK';
      var bonus = row.querySelector('.bonus');
      var warning = row.querySelector('.warning');
    var points = row.querySelectorAll('.points');
      var penalty = parseInt(warning && warning.textContent, 10) || 0;
      if (bonus) bonus.textContent = officialBonus['Adilson Mangiavaki'];
      if (points[1]) points[1].textContent = officialBonus['Adilson Mangiavaki'] - penalty;
      if (points[0] && !stage8Applied) points[0].textContent = (parseInt(points[0].textContent, 10) || 0) + 5;
    }
    if (name.textContent.trim() === 'Derson') {
      var dBonus = row.querySelector('.bonus');
      var dWarning = row.querySelector('.warning');
      var dPoints = row.querySelectorAll('.points');
      var dPenalty = parseInt(dWarning && dWarning.textContent, 10) || 0;
      if (dBonus) dBonus.textContent = officialBonus.Derson;
      if (dPoints[1]) dPoints[1].textContent = officialBonus.Derson - dPenalty;
      if (dPoints[0] && !stage8Applied) dPoints[0].textContent = (parseInt(dPoints[0].textContent, 10) || 0) + 5;
    }
  });

  var stage8BonusEligible = {
    'marceloalbuquerque': true, 'marceloalburquerque': true, 'leonardorocha': true, 'luizfelipe': true,
    'toninhomacedo': true, 'toninho': true, 'joaovictorbarbosa': true, 'joaovictor': true,
    'miro': true, 'miroaraujo': true, 'andreafonso': true, 'alexandremonnerat': true,
    'alessandrosoares': true, 'alessandrocka': true, 'andremitta': true,
    'andersonpoubel': true, 'ricardofinim': true, 'ricardo': true,
    'henriquearroz': true, 'sardinha': true
  };
  function pilotKey(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }
  document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
    var nameNode = row.querySelector('.pilot strong');
    var name = nameNode && nameNode.textContent.trim();
    var key = pilotKey(name);
    if (!stage8BonusEligible[key] || key === 'bernardogaertner' || row.dataset.stage8BonusAdded === 'yes') return;
    var bonus = row.querySelector('.bonus');
    var points = row.querySelectorAll('.points');
    if (bonus) bonus.textContent = String((parseInt(bonus.textContent, 10) || 0) + 5);
    if (points[1]) points[1].textContent = String((parseInt(points[1].textContent, 10) || 0) + 5);
    if (points[0]) points[0].textContent = String((parseInt(points[0].textContent, 10) || 0) + 5);
    if (stage8Totals[name]) stage8Totals[name].total += 5;
    row.dataset.stage8BonusAdded = 'yes';
  });
  var bonusUpdatedRows = Array.prototype.slice.call(document.querySelectorAll('#classification .row:not(.headrow)'));
  bonusUpdatedRows.sort(function (a, b) {
    return (parseInt(b.querySelectorAll('.points')[0].textContent, 10) || 0) - (parseInt(a.querySelectorAll('.points')[0].textContent, 10) || 0);
  });
  bonusUpdatedRows.forEach(function (row, index) {
    row.querySelector('.pos').textContent = (index + 1) + 'º';
    classification.appendChild(row);
  });
  document.querySelectorAll('#pilotcards .pilotcard:not(:first-child)').forEach(function (card) {
    var name = card.querySelector('.pilotinfo strong');
    var points = card.querySelector('.points');
    var data = name && stage8Totals[name.textContent.trim()];
    if (points && data) points.textContent = String(data.total);
  });

  function refreshTeamScores() {
    var teamStages = {};
    document.querySelectorAll('#classification .row:not(.headrow)').forEach(function (row) {
      var team = row.querySelector('.team');
      if (!team) return;
      var key = teamKey(team.textContent);
      var cells = row.querySelectorAll('.stage');
      Array.prototype.forEach.call(cells, function (cell, index) {
        var pos = parseInt(cell.textContent, 10);
        var points = pos > 0 && pos <= 20 ? 21 - pos : 0;
        if (!teamStages[key]) teamStages[key] = [];
        if (!teamStages[key][index]) teamStages[key][index] = [];
        teamStages[key][index].push(points);
      });
    });
    var teamBox = document.querySelector('#teams');
    if (!teamBox) return;
    teamBox.querySelectorAll('.teamrow:not(.headrow)').forEach(function (row) {
      var details = row.querySelector('.team-details, details');
      var name = details && details.querySelector('summary') ? details.querySelector('summary').textContent : row.children[1] && row.children[1].textContent;
      var values = teamStages[teamKey(name)] || [];
      var total = values.reduce(function (sum, stage) {
        return sum + (stage || []).sort(function (a, b) { return b - a; }).slice(0, 2).reduce(function (a, b) { return a + b; }, 0);
      }, 0);
      var points = row.querySelector('.points');
      if (points) points.textContent = String(total);
    });
  }

  var efkRow = Array.prototype.slice.call(document.querySelectorAll('#teams .teamrow:not(.headrow)')).find(function (row) {
    var details = row.querySelector('.team-details, details');
    var name = details && details.querySelector('summary') ? details.querySelector('summary').textContent : row.children[1] && row.children[1].textContent;
    return teamKey(name) === teamKey('EFK');
  });
  if (efkRow) {
    var list = efkRow.querySelector('ul');
    if (list && !Array.prototype.some.call(list.children, function (li) { return li.textContent.indexOf('Adilson Mangiavaki') >= 0; })) {
      var item = document.createElement('li');
      item.innerHTML = '<span class="placeholder"></span>Adilson Mangiavaki';
      list.appendChild(item);
    }
  }
  refreshTeamScores();
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
    7: [
      ['Marcelo Albuquerque', '01:04.625', '—'], ['Leonardo Rocha', '01:05.172', '00:26.972'],
      ['Luiz Felipe', '01:06.792', '00:27.542'], ['Toninho Macedo', '01:04.852', '00:29.019'],
      ['João Victor Barbosa', '01:04.972', '00:32.076'], ['Miro', '01:05.279', '00:36.964'],
      ['André Afonso', '01:03.607', '00:51.764'], ['Alexandre Monnerat', '01:04.113', '00:54.283'],
      ['Alessandro Soares', '01:08.341', '1 volta'], ['André Mitta', '01:06.640', '1 volta'],
      ['Anderson Poubel', '01:07.742', '1 volta'], ['Ricardo Finim', '01:09.053', '1 volta'],
      ['Henrique Arroz', '01:06.507', '2 voltas'], ['Bernardo Gaertner', '01:08.664', '2 voltas'],
      ['Sardinha', '01:10.736', '2 voltas']
    ],
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
    ],
    7: stage8OfficialTimes.map(function (item) { return item; })
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
    if (stageIndex > 7) return;
    buttonBox.querySelectorAll('.result-btn').forEach(function (item) {
      item.classList.toggle('active', item === button);
    });
    if (stageIndex === 7) {
      timeNote.hidden = false;
      timeNote.textContent = 'Resultado oficial · 2º Festival de Kart · Kartódromo do Guará';
      resultBox.innerHTML = '<div class="resultrow"><span>Posição</span><span>Piloto</span><span>Melhor volta</span><span>Diferença</span></div>' + stage8OfficialTimes.map(function (item, index) {
        return '<div class="resultrow"><b>' + (index + 1) + 'º</b>' +
          '<span class="result-pilot"><span class="placeholder"></span><strong>' + item[0] + '</strong></span>' +
          '<span>' + item[1] + '</span><span>' + item[2] + '</span></div>';
      }).join('');
      return;
    }
    timeNote.textContent = 'Os tempos de volta desta etapa ainda não foram cadastrados.';
    renderResults(stageIndex);
  }

  buttonBox.addEventListener('click', function (event) {
    var button = event.target && event.target.closest && event.target.closest('.result-btn');
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectStage(button);
  }, true);

  var stage8Button = Array.prototype.find.call(buttonBox.querySelectorAll('.result-btn'), function (button) { return /Etapa\s*8/i.test(button.textContent); });
  if (stage8Button) {
    stage8Button.disabled = false;
    stage8Button.textContent = 'Etapa 8 · Kartódromo do Guará';
    stage8Button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectStage(stage8Button);
    }, true);
  }
  var activeButton = buttonBox.querySelector('.result-btn.active');
  selectStage(activeButton || buttonBox.querySelector('.result-btn'));
})();
