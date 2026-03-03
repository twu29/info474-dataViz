// viz_waffle.js
// Time-based waffle chart by year, split by season using ai:
//   ai === 6 -> Summer
//   ai === 7 -> Winter
// Each year: fixed waffle grid. K (athletes per square) auto-scales per year.
// Countries with count < K are grouped into OTHER.
(function () {
  var ready = false, loading = false, error = false;
  
  var seasonData = { Summer: {}, Winter: {} };
  var seasonYears = { Summer: [], Winter: [] };

  var regionByNoc = {};
  var yearIdxBySeason = { Summer: 0, Winter: 0 };

  var COLS = 30;
  var ROWS = 18;
  var MAX_SQUARES = COLS * ROWS;

  var draggingSlider = false;

  function splitCSVLine(line) {
    var row = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        row.push(cur); cur = '';
      } else cur += ch;
    }
    row.push(cur);
    return row;
  }

  function parseCSV(text) {
    var lines = (text || '').trim().split(/\r?\n/);
    if (!lines.length) return { header: [], rows: [] };
    var header = splitCSVLine(lines[0]).map(function (s) { return (s || '').trim(); });
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i] || !lines[i].trim()) continue;
      rows.push(splitCSVLine(lines[i]));
    }
    return { header: header, rows: rows };
  }

  function hashHue(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function buildRegionMap(nocRegions) {
    var h = nocRegions.header, r = nocRegions.rows;
    var iN = h.indexOf('NOC');
    var iR = h.indexOf('region');
    for (var i = 0; i < r.length; i++) {
      var noc = (r[i][iN] || '').trim();
      var reg = (r[i][iR] || '').trim();
      if (noc) regionByNoc[noc] = reg || noc;
    }
  }

  function buildSeasonCounts(results) {
    var h = results.header, r = results.rows;
    var iYear = h.indexOf('year');
    var iType = h.indexOf('type');
    var iNoc  = h.indexOf('noc');
    var iAid  = h.indexOf('athlete_id');

    if (iYear < 0 || iType < 0 || iNoc < 0 || iAid < 0) {
      throw new Error('results.csv needs columns: year, type, noc, athlete_id');
    }

    var seen = {};

    for (var i = 0; i < r.length; i++) {
      var row = r[i];

      var season = (row[iType] || '').trim();
      if (season !== 'Summer' && season !== 'Winter') continue;

      var yearRaw = (row[iYear] || '').trim();
      var noc = (row[iNoc] || '').trim();
      var aid = (row[iAid] || '').trim();
      if (!yearRaw || !noc || !aid) continue;

      var year = parseInt(parseFloat(yearRaw), 10);
      if (isNaN(year)) continue;

      var key = season + '|' + year + '|' + noc + '|' + aid;
      if (seen[key]) continue;
      seen[key] = true;

      if (!seasonData[season][year]) seasonData[season][year] = {};
      seasonData[season][year][noc] = (seasonData[season][year][noc] || 0) + 1;
    }

    seasonYears.Summer = Object.keys(seasonData.Summer).map(function (d) { return parseInt(d, 10); }).sort(function (a, b) { return a - b; });
    seasonYears.Winter = Object.keys(seasonData.Winter).map(function (d) { return parseInt(d, 10); }).sort(function (a, b) { return a - b; });

    yearIdxBySeason.Summer = seasonYears.Summer.length ? (seasonYears.Summer.length - 1) : 0;
    yearIdxBySeason.Winter = seasonYears.Winter.length ? (seasonYears.Winter.length - 1) : 0;
  }

  function loadAll() {
    if (loading || ready) return;
    loading = true;

    Promise.all([
      fetch('data/results.csv').then(function (r) { return r.text(); }),
      fetch('data/noc_regions.csv').then(function (r) { return r.text(); })
    ]).then(function (arr) {
      buildRegionMap(parseCSV(arr[1]));
      buildSeasonCounts(parseCSV(arr[0]));
      ready = true;
      loading = false;
    }).catch(function (e) {
      console.error(e);
      error = true;
      loading = false;
    });
  }

  loadAll();

  function getSeason(ai) {
    return (ai === 7) ? 'Winter' : 'Summer';
  }

  function computeWaffleFor(season, year) {
    var counts = seasonData[season][year] || {};
    var nocs = Object.keys(counts);

    var total = 0;
    for (var i = 0; i < nocs.length; i++) total += (counts[nocs[i]] || 0);

    var K = Math.max(1, Math.ceil(total / MAX_SQUARES));

    var otherSum = 0;
    var big = [];
    for (var j = 0; j < nocs.length; j++) {
      var noc = nocs[j];
      var c = counts[noc] || 0;
      if (c < K) otherSum += c;
      else big.push({ noc: noc, count: c });
    }

    big.sort(function (a, b) { return b.count - a.count; });

    var groups = [];
    for (var b = 0; b < big.length; b++) {
      var nocb = big[b].noc;
      groups.push({
        noc: nocb,
        name: regionByNoc[nocb] || nocb,
        count: big[b].count,
        squares: Math.floor(big[b].count / K),
        hue: hashHue(nocb),
        isOther: false
      });
    }
    
    if (otherSum > 0) {
      groups.push({
        noc: 'OTHER',
        name: 'Other',
        count: otherSum,
        squares: Math.floor(otherSum / K),
        hue: 0,
        isOther: true
      });
    }

    var usedSquares = Math.min(MAX_SQUARES, Math.ceil(total / K));

    var sumSq = 0;
    for (var g = 0; g < groups.length; g++) sumSq += groups[g].squares;

    var remaining = usedSquares - sumSq;
    if (remaining > 0) {
      var rema = [];
      for (var gg = 0; gg < groups.length; gg++) {
        var frac = (groups[gg].count / K) - groups[gg].squares;
        rema.push({ idx: gg, rem: frac });
      }
      rema.sort(function (a, b) { return b.rem - a.rem; });

      var rr = 0;
      while (remaining > 0 && rema.length) {
        groups[rema[rr % rema.length].idx].squares += 1;
        remaining--;
        rr++;
      }
    }

    sumSq = 0;
    for (var g2 = 0; g2 < groups.length; g2++) sumSq += groups[g2].squares;
    while (sumSq > usedSquares) {
      for (var t = groups.length - 1; t >= 0; t--) {
        if (groups[t].squares > 0) { groups[t].squares -= 1; sumSq -= 1; break; }
      }
      if (sumSq <= usedSquares) break;
    }

    var squareOwner = [];
    for (var g3 = 0; g3 < groups.length; g3++) {
      for (var s = 0; s < groups[g3].squares; s++) {
        squareOwner.push({ noc: groups[g3].noc, name: groups[g3].name, K: K, hue: groups[g3].hue, isOther: groups[g3].isOther });
      }
    }
    squareOwner = squareOwner.slice(0, usedSquares);

    return { K: K, total: total, usedSquares: usedSquares, groups: groups, squareOwner: squareOwner };
  }

  function drawTimeline(p, x, y, w, h, yearsArr, season) {
    var idx = yearIdxBySeason[season] || 0;
    var t = (yearsArr.length <= 1) ? 0 : (idx / (yearsArr.length - 1));

    p.noStroke();
    p.fill(240);
    p.rect(x, y, w, h, 10);

    p.fill(210);
    p.rect(x, y, w * t, h, 10);

    var kx = x + w * t;
    p.stroke(160);
    p.strokeWeight(1);
    p.fill(255);
    p.ellipse(kx, y + h / 2, h + 6, h + 6);

    p.noStroke();
    p.fill(60);
    p.textSize(11);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(yearsArr[idx] || '', x + w / 2, y - 6);

    var mx = p.mouseX, my = p.mouseY;
    var over = (mx >= x && mx <= x + w && my >= y - 8 && my <= y + h + 8);

    if (p.mouseIsPressed && over) draggingSlider = true;
    if (!p.mouseIsPressed) draggingSlider = false;

    if (draggingSlider) {
      var tt = clamp((mx - x) / w, 0, 1);
      var newIdx = Math.round(tt * (yearsArr.length - 1));
      yearIdxBySeason[season] = clamp(newIdx, 0, yearsArr.length - 1);
    }
  }

  function drawWaffle(p, manager, ai) {
    var season = getSeason(ai);
    var yearsArr = seasonYears[season] || [];
    if (!yearsArr.length) return;

    if (p.keyIsDown(p.LEFT_ARROW))  yearIdxBySeason[season] = clamp(yearIdxBySeason[season] - 1, 0, yearsArr.length - 1);
    if (p.keyIsDown(p.RIGHT_ARROW)) yearIdxBySeason[season] = clamp(yearIdxBySeason[season] + 1, 0, yearsArr.length - 1);

    var idx = yearIdxBySeason[season] || 0;
    var year = yearsArr[idx];

    var W = manager.width || p.width;
    var H = manager.height || p.height;

    var marginLeft = (manager.offsetX || 20) + 24;
    var marginTop  = (manager.offsetY || 0) + 70;
    var marginRight = 24;
    var marginBot  = 70;

    var chartW = W - marginLeft - marginRight;
    var chartH = H - marginTop - marginBot;

    p.noStroke();
    p.fill(30);
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(15);
    p.textStyle(p.BOLD);
    p.text('Participation Waffle - ' + season + ' Olympics', marginLeft + chartW / 2, (manager.offsetY || 0) + 12);
    p.textStyle(p.NORMAL);

    p.fill(110);
    p.textSize(10);
    p.text('Each year scales to the same grid. Countries with < 1 square are grouped as Other. Hover a square.',
      marginLeft + chartW / 2, (manager.offsetY || 0) + 32);

    var wf = computeWaffleFor(season, year);

    var cell = Math.floor(Math.min(chartW / COLS, (chartH - 46) / ROWS));
    cell = Math.max(6, cell);

    var gridW = cell * COLS;
    var gridH = cell * ROWS;

    var gx = marginLeft + (chartW - gridW) / 2;
    var gy = marginTop + 10;

    p.colorMode(p.HSB, 360, 100, 100, 255);

    var mx = p.mouseX, my = p.mouseY;
    var hoverIdx = -1;

    for (var s = 0; s < MAX_SQUARES; s++) {
      var c = s % COLS;
      var r = Math.floor(s / COLS);
      var x = gx + c * cell;
      var y = gy + r * cell;

      var has = (s < wf.squareOwner.length);
      var over = (mx >= x && mx <= x + cell && my >= y && my <= y + cell);

      if (over && has) hoverIdx = s;

      if (!has) {
        p.noStroke();
        p.fill(0, 0, 92, 70);
        p.rect(x, y, cell - 1, cell - 1, 2);
        continue;
      }

      var owner = wf.squareOwner[s];
      if (owner.isOther) {
        p.noStroke();
        p.fill(0, 0, 65, over ? 255 : 180);
      } else {

        var ratio = owner.K ? (wf.total > 0 ? (owner.K * owner.K) : 0) : 0;

        var group = null;
        for (var gi = 0; gi < wf.groups.length; gi++) {
          if (wf.groups[gi].noc === owner.noc) {
            group = wf.groups[gi];
            break;
          }
        }

        var sizeRatio = group ? (group.count / wf.total) : 0;

        var sat = 50 + sizeRatio * 50;
        var bri = 25 + sizeRatio * 60;

        p.noStroke();
        p.fill(owner.hue, 95, 95, over ? 255 : 230);
      }
      p.rect(x, y, cell - 1, cell - 1, 2);
    }

    p.colorMode(p.RGB, 255);

    var sliderX = marginLeft + 40;
    var sliderW = chartW - 80;
    var sliderY = marginTop + chartH - 26;
    drawTimeline(p, sliderX, sliderY, sliderW, 14, yearsArr, season);

    p.noStroke();
    p.fill(90);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(10);
    p.text('Year: ' + year + ' | Total unique athletes: ' + wf.total + 
    ' | K = ' + wf.K + ' athletes/square | Squares used: ' + wf.usedSquares + '/' + MAX_SQUARES,
    marginLeft, marginTop + chartH - 70);

    if (hoverIdx >= 0) {
      var info = wf.squareOwner[hoverIdx];
      var title = info.isOther ? 'Other' : info.name;
      var tipLines = [
        title + ' (' + info.noc + ')',
        season + ' ' + year,
        'This square ≈ ' + info.K + ' athletes'
      ];

      p.textSize(11);
      var tw = 0;
      for (var i = 0; i < tipLines.length; i++) tw = Math.max(tw, p.textWidth(tipLines[i]));
      var th = 14 * tipLines.length + 12;

      var tx = mx + 14;
      var ty = my - th / 2;
      if (tx + tw + 18 > p.width - 10) tx = mx - (tw + 18) - 14;
      if (ty < 8) ty = 8;
      if (ty + th > p.height - 8) ty = p.height - th - 8;

      p.noStroke();
      p.fill(255, 255, 255, 245);
      p.rect(tx, ty, tw + 18, th, 6);
      p.stroke(180);
      p.strokeWeight(0.6);
      p.noFill();
      p.rect(tx, ty, tw + 18, th, 6);

      p.noStroke();
      p.fill(25);
      p.textAlign(p.LEFT, p.TOP);
      for (var j = 0; j < tipLines.length; j++) {
        p.text(tipLines[j], tx + 9, ty + 7 + j * 14);
      }
    }
  }

  window.VizWaffle = {
    draw: function (p, manager, ai, progress) {
      p.push();

      if (error) {
        p.fill(180, 60, 60);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(13);
        p.text('Error loading data. Check console.', p.width / 2, p.height / 2);
        p.pop();
        return;
      }

      if (!ready) {
        p.fill(100);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('Loading waffle data…', p.width / 2, p.height / 2);
        p.pop();
        return;
      }

      // Only respond to ai 6/7
      if (ai !== 6 && ai !== 7) {
        p.fill(120);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(12);
        p.text('Waffle view expects ai === 6 (Summer) or ai === 7 (Winter).', p.width / 2, p.height / 2);
        p.pop();
        return;
      }

      drawWaffle(p, manager, ai);

      p.pop();
    }
  };

})();