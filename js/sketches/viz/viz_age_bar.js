// viz_age_bar.js
// Stacked bar chart: age distribution of medalists (Gold / Silver / Bronze)
// ai === 4 → Summer Olympics
// ai === 5 → Winter Olympics
// Y-axis = average medals per Olympics edition
(function () {

    var summerData = null;
    var winterData = null;
    var loading    = false;
    var loadError  = false;

    // ── age bin
    var AGE_MIN  = 13;
    var AGE_CAP  = 50;   // final bin is "50+"
    var BIN_SIZE = 3;

    var ageBins = [];
    for (var a = AGE_MIN; a < AGE_CAP; a += BIN_SIZE) {
        ageBins.push(a + '-' + (a + BIN_SIZE - 1));
    }
    ageBins.push('50+');
    var NUM_BINS = ageBins.length;

    var COLORS = {
        gold:   [212, 175, 55],
        silver: [160, 160, 170],
        bronze: [176, 108, 60]
    };

    function ageToBin(age) {
        if (age < AGE_MIN) return -1;
        if (age >= AGE_CAP) return NUM_BINS - 1;
        return Math.floor((age - AGE_MIN) / BIN_SIZE);
    }

    function splitCSVLine(line) {
        var row = [], cur = '', inQ = false;
        for (var c = 0; c < line.length; c++) {
            var ch = line[c];
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { row.push(cur); cur = ''; }
            else { cur += ch; }
        }
        row.push(cur);
        return row;
    }

    function parseCSVRows(lines) {
        var rows = [];
        for (var i = 1; i < lines.length; i++) {
            rows.push(splitCSVLine(lines[i]));
        }
        return rows;
    }

    function buildSeasonData(rows, iYear, iType, iMedal, iAge, season) {
        var editionSet = {};
        var agg = [];
        for (var i = 0; i < NUM_BINS; i++) {
            agg.push({ gold: 0, silver: 0, bronze: 0 });
        }

        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            if ((row[iType] || '').trim() !== season) continue;

            var medal = (row[iMedal] || '').trim();
            if (medal !== 'Gold' && medal !== 'Silver' && medal !== 'Bronze') continue;

            var age = parseFloat(row[iAge]);
            if (isNaN(age)) continue;
            age = Math.round(age);

            var year = parseInt(row[iYear], 10);
            if (isNaN(year)) continue;
            editionSet[year] = true;

            var bin = ageToBin(age);
            if (bin < 0) continue;

            if      (medal === 'Gold')   agg[bin].gold++;
            else if (medal === 'Silver') agg[bin].silver++;
            else if (medal === 'Bronze') agg[bin].bronze++;
        }

        var editions = Object.keys(editionSet).length || 1;
        var goldAvg = [], silverAvg = [], bronzeAvg = [], maxAvg = 0;

        for (var b = 0; b < NUM_BINS; b++) {
            var g  = agg[b].gold   / editions;
            var s  = agg[b].silver / editions;
            var bz = agg[b].bronze / editions;
            goldAvg.push(g);
            silverAvg.push(s);
            bronzeAvg.push(bz);
            var tot = g + s + bz;
            if (tot > maxAvg) maxAvg = tot;
        }

        return {
            bins: ageBins,
            gold: goldAvg, silver: silverAvg, bronze: bronzeAvg,
            maxAvg: maxAvg, editions: editions
        };
    }

    // ── data load
    function loadData() {
        if (loading || (summerData && winterData)) return;
        loading = true;

        fetch('data/results.csv')
            .then(function (r) { return r.text(); })
            .then(function (text) {
                var lines  = text.trim().split(/\r?\n/);
                var header = lines[0].split(',');
                var iYear  = header.indexOf('year');
                var iType  = header.indexOf('type');
                var iMedal = header.indexOf('medal');
                var iAge   = header.indexOf('age');

                if (iAge >= 0) {
                    var rows = parseCSVRows(lines);
                    summerData = buildSeasonData(rows, iYear, iType, iMedal, iAge, 'Summer');
                    winterData = buildSeasonData(rows, iYear, iType, iMedal, iAge, 'Winter');
                    loading = false;
                } else {
                    joinWithBios(lines, header, iYear, iType, iMedal);
                }
            })
            .catch(function (err) {
                console.error('results.csv load error:', err);
                loadError = true; loading = false;
            });
    }

    function joinWithBios(resultLines, resultHeader, iYear, iType, iMedal) {
        var iAthleteId = resultHeader.indexOf('athlete_id');

        fetch('data/bios.csv')
            .then(function (r) { return r.text(); })
            .then(function (bioText) {
                var bioLines  = bioText.trim().split(/\r?\n/);
                var bioHeader = bioLines[0].split(',');
                var bId   = bioHeader.indexOf('athlete_id');
                var bBorn = bioHeader.indexOf('born_date');

                var birthYear = {};
                for (var i = 1; i < bioLines.length; i++) {
                    var row = splitCSVLine(bioLines[i]);
                    var id  = (row[bId]   || '').trim();
                    var bd  = (row[bBorn] || '').trim();
                    if (!id || !bd) continue;
                    var yr = parseInt(bd.substring(0, 4), 10);
                    if (!isNaN(yr)) birthYear[id] = yr;
                }

                var rows       = parseCSVRows(resultLines);
                var iAgeCalc   = resultHeader.length; 

                for (var r = 0; r < rows.length; r++) {
                    var row2     = rows[r];
                    var compYear = parseInt(row2[iYear], 10);
                    var aid      = (row2[iAthleteId] || '').trim();
                    var by       = birthYear[aid];
                    row2[iAgeCalc] = (!isNaN(compYear) && by) ? (compYear - by) : NaN;
                }

                summerData = buildSeasonData(rows, iYear, iType, iMedal, iAgeCalc, 'Summer');
                winterData = buildSeasonData(rows, iYear, iType, iMedal, iAgeCalc, 'Winter');
                loading = false;
            })
            .catch(function (err) {
                console.error('bios.csv load error:', err);
                loadError = true; loading = false;
            });
    }

    loadData();

    // ── chart renderer
    function drawBarChart(p, manager, data, season) {
        var W = manager.width  || 700;
        var H = manager.height || 540;

        var marginLeft  = (manager.offsetX || 20) + 58;
        var marginTop   = (manager.offsetY || 0)  + 72;
        var marginRight = 24;
        var marginBot   = 62;

        var chartW = W - marginLeft - marginRight;
        var chartH = H - marginTop  - marginBot;

        var nBins  = NUM_BINS;
        var barPad = 4;
        var barW   = (chartW / nBins) - barPad;
        var maxVal = data.maxAvg * 1.08;
        var accentCol = season === 'Summer' ? [210, 160, 40] : [90, 150, 210];

        // ── Title
        p.noStroke();
        p.fill(30);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(15);
        p.textStyle(p.BOLD);
        var titleX = marginLeft + chartW / 2;
        var titleY = (manager.offsetY || 0) + 12;
        p.text('Age Distribution of Medalists - ' + season + ' Olympics', titleX, titleY);
        p.textStyle(p.NORMAL);

        p.stroke(accentCol[0], accentCol[1], accentCol[2]);
        p.strokeWeight(2);
        p.line(titleX - 165, titleY + 20, titleX + 165, titleY + 20);
        p.noStroke();
        p.fill(110);
        p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        p.text('Average medals awarded per Olympic Games  |  Hover a bar for details',
               titleX, titleY + 26);

        var nTicks = 5;
        p.textSize(9);
        p.textAlign(p.RIGHT, p.CENTER);
        for (var t = 0; t <= nTicks; t++) {
            var val = (maxVal / nTicks) * t;
            var ty  = marginTop + chartH - (val / maxVal) * chartH;
            p.stroke(225);
            p.strokeWeight(0.5);
            p.line(marginLeft, ty, marginLeft + chartW, ty);
            p.noStroke();
            p.fill(120);
            p.text(val.toFixed(1), marginLeft - 5, ty);
        }

        // ── Axes ──────────────────────────────────────────────────────────────
        p.stroke(170);
        p.strokeWeight(1.2);
        p.line(marginLeft, marginTop, marginLeft, marginTop + chartH);
        p.line(marginLeft, marginTop + chartH, marginLeft + chartW, marginTop + chartH);

        p.noStroke();
        p.fill(80);
        p.textSize(11);
        p.textAlign(p.CENTER, p.TOP);
        p.text('Athlete Age', marginLeft + chartW / 2, marginTop + chartH + 40);

        p.push();
        p.translate(marginLeft - 46, marginTop + chartH / 2);
        p.rotate(-p.HALF_PI);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(11);
        p.text('Avg Medals per Olympics', 0, 0);
        p.pop();

        // ── Bars
        var mx = p.mouseX, my = p.mouseY;
        var hoveredStack = null;
        var hoveredBin   = -1;

        for (var i = 0; i < nBins; i++) {
            var bx = marginLeft + i * (barW + barPad) + barPad / 2;

            var gVal  = data.gold[i];
            var sVal  = data.silver[i];
            var bzVal = data.bronze[i];
            var total = gVal + sVal + bzVal;

            var isHover = (mx >= bx && mx <= bx + barW &&
                           my >= marginTop && my <= marginTop + chartH);

            if (isHover) {
                hoveredBin   = i;
                hoveredStack = { bin: ageBins[i], gold: gVal, silver: sVal, bronze: bzVal, total: total };
            }

            // Stack: Bronze (bottom) → Silver → Gold (top)
            var segments = [
                { val: bzVal, col: COLORS.bronze },
                { val: sVal,  col: COLORS.silver },
                { val: gVal,  col: COLORS.gold   }
            ];

            var runY = marginTop + chartH;
            for (var s = 0; s < segments.length; s++) {
                var seg  = segments[s];
                if (seg.val <= 0) continue;
                var segH = (seg.val / maxVal) * chartH;
                var segY = runY - segH;

                var isTop = true;
                for (var ss = s + 1; ss < segments.length; ss++) {
                    if (segments[ss].val > 0) { isTop = false; break; }
                }

                p.noStroke();
                p.fill(seg.col[0], seg.col[1], seg.col[2], isHover ? 255 : 205);
                if (isTop) {
                    p.rect(bx, segY, barW, segH, 3, 3, 0, 0);
                } else {
                    p.rect(bx, segY, barW, segH);
                }
                runY -= segH;
            }

                p.noStroke();
                p.fill(70);
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(8);
                p.text(ageBins[i], bx + barW / 2, marginTop + chartH + 6);
        }

        if (hoveredBin >= 0 && hoveredStack) {
            var hx   = marginLeft + hoveredBin * (barW + barPad) + barPad / 2;
            var totH = (hoveredStack.total / maxVal) * chartH;
            p.noFill();
            p.stroke(60);
            p.strokeWeight(1.5);
            p.rect(hx, marginTop + chartH - totH, barW, totH, 3, 3, 0, 0);
        }

        if (hoveredStack) {
            var tw = 152, th = 84;
            var tx = mx + 14;
            var ttY = my - th / 2;
            if (tx + tw > W - 10)  tx  = mx - tw - 14;
            if (ttY < 5)           ttY = 5;
            if (ttY + th > H - 5)  ttY = H - th - 5;

            p.noStroke();
            p.fill(255, 255, 255, 245);
            p.rect(tx, ttY, tw, th, 5);
            p.stroke(180);
            p.strokeWeight(0.5);
            p.noFill();
            p.rect(tx, ttY, tw, th, 5);

            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(10);
            p.textStyle(p.BOLD);
            p.fill(30);
            p.text('Age ' + hoveredStack.bin, tx + 10, ttY + 8);
            p.textStyle(p.NORMAL);
            p.textSize(9);

            var tipRows = [
                { label: 'Gold',   val: hoveredStack.gold,   col: COLORS.gold   },
                { label: 'Silver', val: hoveredStack.silver, col: COLORS.silver },
                { label: 'Bronze', val: hoveredStack.bronze, col: COLORS.bronze }
            ];
            for (var rr = 0; rr < tipRows.length; rr++) {
                var ry = ttY + 26 + rr * 15;
                p.fill(tipRows[rr].col[0], tipRows[rr].col[1], tipRows[rr].col[2]);
                p.rect(tx + 10, ry + 1, 9, 9, 2);
                p.fill(50);
                p.text(tipRows[rr].label + ':  ' + tipRows[rr].val.toFixed(2), tx + 23, ry);
            }

            p.fill(30);
            p.textStyle(p.BOLD);
            p.textSize(9);
            p.text('Total Avg: ' + hoveredStack.total.toFixed(2) + ' Medals / Games', tx + 10, ttY + th - 16);
            p.textStyle(p.NORMAL);
        }

        // ── Legend
        var legItems = [
            { label: 'Gold',   col: COLORS.gold   },
            { label: 'Silver', col: COLORS.silver },
            { label: 'Bronze', col: COLORS.bronze }
        ];
        var legX = marginLeft + chartW - 168;
        var legY = marginTop + 8;
        for (var l = 0; l < legItems.length; l++) {
            var lx = legX + l * 56;
            p.noStroke();
            p.fill(legItems[l].col[0], legItems[l].col[1], legItems[l].col[2], 220);
            p.rect(lx, legY, 12, 12, 2);
            p.fill(50);
            p.textSize(10);
            p.textAlign(p.LEFT, p.TOP);
            p.text(legItems[l].label, lx + 15, legY + 1);
        }

        var iconCol = season === 'Summer' ? [210, 140, 20] : [70, 140, 210];
        var emoji   = season === 'Summer' ? '\u2600' : '\u2744';
        var iconX   = legX + 56;
        var iconY   = legY + 18;
        p.noStroke();
        p.fill(iconCol[0], iconCol[1], iconCol[2], 35);
        p.rect(iconX - 6, iconY - 2, 100, 20, 9);
        p.fill(iconCol[0], iconCol[1], iconCol[2]);
        p.textSize(16);
        p.textAlign(p.LEFT, p.TOP);
        p.text(emoji, iconX, iconY - 2);
        p.textSize(10);
        p.textStyle(p.BOLD);
        p.text(season + ' Games', iconX + 22, iconY + 3);
        p.textStyle(p.NORMAL);

        p.noStroke();
        p.fill(140);
        p.textSize(9);
        p.textAlign(p.CENTER, p.TOP);
        p.text('Based on ' + data.editions + ' ' + season + ' Games',
               marginLeft + chartW / 2, marginTop + chartH + 52);
    }

    window.VizAgeBar = {
        draw: function (p, manager, ai, progress) {
            p.push();

            if (loadError) {
                p.fill(180, 60, 60);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(13);
                p.text('Error loading data. Check console.', p.width / 2, p.height / 2);
                p.pop();
                return;
            }

            if (!summerData || !winterData) {
                p.fill(100);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(14);
                p.text('Loading age data…', p.width / 2, p.height / 2);
                p.pop();
                return;
            }

            // ai === 4 → Summer,  ai === 5 → Winter
            if (ai === 5) {
                drawBarChart(p, manager, winterData, 'Winter');
            } else {
                drawBarChart(p, manager, summerData, 'Summer');
            }

            p.pop();
        }
    };

})();