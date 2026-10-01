(function () {
  'use strict';

  var stageScoresByTeam = {};
  var scoreByTeam = {};
  function teamKey(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/and/g, '').replace(/[^a-z0-9]/g, '');
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
      var discards = row.querySelectorAll('.discard');
      var penalty = parseInt(warning && warning.textContent, 10) || 0;
      var d1 = parseInt(discards[0] && discards[0].textContent, 10) || 0;
      var d2 = parseInt(discards[1] && discards[1].textContent, 10) || 0;
      if (bonus) bonus.textContent = officialBonus['Adilson Mangiavaki'];
      if (points[1]) points[1].textContent = officialBonus['Adilson Mangiavaki'] - penalty;
      if (points[0]) points[0].textContent = (parseInt(points[0].textContent, 10) || 0) + 5;
    }
    if (name.textContent.trim() === 'Derson') {
      var dBonus = row.querySelector('.bonus');
      var dWarning = row.querySelector('.warning');
      var dPoints = row.querySelectorAll('.points');
      var dDiscards = row.querySelectorAll('.discard');
      var dPenalty = parseInt(dWarning && dWarning.textContent, 10) || 0;
      var dd1 = parseInt(dDiscards[0] && dDiscards[0].textContent, 10) || 0;
      var dd2 = parseInt(dDiscards[1] && dDiscards[1].textContent, 10) || 0;
      if (dBonus) dBonus.textContent = officialBonus.Derson;
      if (dPoints[1]) dPoints[1].textContent = officialBonus.Derson - dPenalty;
      if (dPoints[0]) dPoints[0].textContent = (parseInt(dPoints[0].textContent, 10) || 0) + 5;
    }
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
  refreshTeamScores();

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
})();
