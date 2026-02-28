// viz_heatmap.js
// Bubble matrix: countries (Y) × Olympic years (X), circle size = medal count
// ai===2 → Summer, ai===3 → Winter
(function () {
    var summerData = null;
    var winterData = null;
    var loading = false;
    var tooltip = null;

    // Merge map: combine historical NOC codes into modern equivalents
    var mergeNOC = {
        URS: 'RUS', EUN: 'RUS',
        GDR: 'GER', FRG: 'GER',
        TCH: 'CZE', BOH: 'CZE',
        YUG: 'SRB', SCG: 'SRB',
        ANZ: 'AUS',
        WIF: 'TTO',
    };

    var nameOverride = {
        USA: 'United States', GBR: 'Great Britain', RUS: 'Russia', GER: 'Germany',
        FRA: 'France', CHN: 'China', AUS: 'Australia', JPN: 'Japan', ITA: 'Italy',
        HUN: 'Hungary', SWE: 'Sweden', NED: 'Netherlands', CAN: 'Canada',
        KOR: 'South Korea', NOR: 'Norway', CUB: 'Cuba', BRA: 'Brazil',
        ESP: 'Spain', POL: 'Poland', ROU: 'Romania', DEN: 'Denmark',
        NZL: 'New Zealand', FIN: 'Finland', BEL: 'Belgium', SUI: 'Switzerland',
        CZE: 'Czech Republic', SRB: 'Serbia', KEN: 'Kenya', JAM: 'Jamaica',
        ETH: 'Ethiopia', UKR: 'Ukraine', ARG: 'Argentina', TUR: 'Turkey',
        AUT: 'Austria',
    };

    var SUMMER_TOP_N = 22;
    var WINTER_TOP_N = 18;

    var summerYears = [1896,1900,1904,1908,1912,1920,1924,1928,1932,1936,
                       1948,1952,1956,1960,1964,1968,1972,1976,1980,1984,
                       1988,1992,1996,2000,2004,2008,2012,2016,2020,2024];

    var winterYears = [1924,1928,1932,1936,1948,1952,1956,1960,1964,1968,
                       1972,1976,1980,1984,1988,1992,1994,1998,2002,2006,
                       2010,2014,2018,2022];

    function buildDataset(rows, iYear, iType, iNoc, iMedal, seasonFilter, validYears, topN) {
        var agg = {};
        var yearSet = {};

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row[iType] !== seasonFilter) continue;

            var medal = (row[iMedal] || '').trim();
            if (!medal) continue;

            var year = Math.round(parseFloat(row[iYear]));
            var noc = (row[iNoc] || '').trim();
            if (!noc || isNaN(year)) continue;

            noc = mergeNOC[noc] || noc;
            yearSet[year] = true;

            if (!agg[noc]) agg[noc] = {};
            if (!agg[noc][year]) agg[noc][year] = { gold: 0, silver: 0, bronze: 0 };

            if (medal === 'Gold') agg[noc][year].gold++;
            else if (medal === 'Silver') agg[noc][year].silver++;
            else if (medal === 'Bronze') agg[noc][year].bronze++;
        }

        var countries = [];
        var nocKeys = Object.keys(agg);
        for (var n = 0; n < nocKeys.length; n++) {
            var noc = nocKeys[n];
            var total = 0;
            var byYear = {};
            var yKeys = Object.keys(agg[noc]);
            for (var y = 0; y < yKeys.length; y++) {
                var d = agg[noc][yKeys[y]];
                var t = d.gold + d.silver + d.bronze;
                total += t;
                byYear[yKeys[y]] = { gold: d.gold, silver: d.silver, bronze: d.bronze, total: t };
            }
            countries.push({ noc: noc, name: nameOverride[noc] || noc, total: total, byYear: byYear });
        }

        countries.sort(function (a, b) { return b.total - a.total; });
        countries = countries.slice(0, topN);

        var years = Object.keys(yearSet).map(Number).sort(function (a, b) { return a - b; });
        years = years.filter(function (y) { return validYears.indexOf(y) >= 0; });

        var maxCount = 0;
        for (var c = 0; c < countries.length; c++) {
            for (var y = 0; y < years.length; y++) {
                var d = countries[c].byYear[years[y]];
                if (d && d.total > maxCount) maxCount = d.total;
            }
        }

        return { countries: countries, years: years, maxCount: maxCount };
    }

    function loadData() {
        if (loading || (summerData && winterData)) return;
        loading = true;

        fetch('data/results.csv')
            .then(function (r) { return r.text(); })
            .then(function (text) {
                var lines = text.trim().split(/\r?\n/);
                var header = lines[0].split(',');
                var iYear = header.indexOf('year');
                var iType = header.indexOf('type');
                var iNoc = header.indexOf('noc');
                var iMedal = header.indexOf('medal');

                // Parse all rows once
                var rows = [];
                for (var i = 1; i < lines.length; i++) {
                    var row = [];
                    var cur = '';
                    var inQuote = false;
                    for (var c = 0; c < lines[i].length; c++) {
                        var ch = lines[i][c];
                        if (ch === '"') { inQuote = !inQuote; }
                        else if (ch === ',' && !inQuote) { row.push(cur); cur = ''; }
                        else { cur += ch; }
                    }
                    row.push(cur);
                    rows.push(row);
                }

                summerData = buildDataset(rows, iYear, iType, iNoc, iMedal, 'Summer', summerYears, SUMMER_TOP_N);
                winterData = buildDataset(rows, iYear, iType, iNoc, iMedal, 'Winter', winterYears, WINTER_TOP_N);
                loading = false;
            })
            .catch(function (err) {
                console.error('Failed to load heatmap data:', err);
                loading = false;
            });
    }

    loadData();

    function drawBubbleMatrix(p, manager, data, title, bubbleColor) {
        var countries = data.countries;
        var years = data.years;
        var maxCount = data.maxCount;

        p.push();

        var labelW = 110;
        var left = (manager.offsetX || 80) + labelW;
        var topY = (manager.offsetY || 0) + 70;
        var chartW = (manager.width || 600) - labelW - 20;
        var chartH = (manager.height || 520) - 120;

        var rowH = chartH / countries.length;
        var colW = chartW / years.length;
        var maxR = Math.min(rowH, colW) * 0.45;

        // Title
        p.noStroke();
        p.fill(30);
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(15);
        p.textStyle(p.BOLD);
        p.text(title, left + chartW / 2, topY - 60);
        p.textStyle(p.NORMAL);
        p.textSize(10);
        p.fill(100);
        p.text('Hover over a dot to see the medal distribution.', left + chartW / 2, topY - 42);

        // Year labels
        p.fill(80);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.textSize(9);
        for (var y = 0; y < years.length; y++) {
            var cx = left + y * colW + colW / 2;
            if (years[y] % 10 === 0 || years[y] === years[0] || years[y] === years[years.length - 1]) {
                p.text(years[y], cx, topY - 4);
            }
        }

        // Mouse position for hover
        var mx = p.mouseX;
        var my = p.mouseY;
        tooltip = null;

        // Rows
        for (var c = 0; c < countries.length; c++) {
            var cy = topY + c * rowH + rowH / 2;

            // Dashed grid line
            p.stroke(210);
            p.strokeWeight(0.5);
            var lineY = cy + rowH / 2;
            for (var dx = left; dx < left + chartW; dx += 7) {
                var endX = Math.min(dx + 4, left + chartW);
                p.line(dx, lineY, endX, lineY);
            }

            // Country label
            p.noStroke();
            p.fill(50);
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(10);
            p.text(countries[c].name, left - 8, cy);

            // Dots
            for (var y = 0; y < years.length; y++) {
                var d = countries[c].byYear[years[y]];
                if (!d || d.total === 0) continue;

                var cx2 = left + y * colW + colW / 2;
                var r = 2 + Math.sqrt(d.total / maxCount) * maxR;

                p.noStroke();
                p.fill(bubbleColor[0], bubbleColor[1], bubbleColor[2], 180);
                p.ellipse(cx2, cy, r * 2, r * 2);

                var dist = Math.sqrt((mx - cx2) * (mx - cx2) + (my - cy) * (my - cy));
                if (dist < r + 2) {
                    tooltip = {
                        x: cx2, y: cy,
                        country: countries[c].name,
                        year: years[y],
                        gold: d.gold, silver: d.silver, bronze: d.bronze,
                        total: d.total,
                        maxCount: maxCount, maxR: maxR
                    };
                }
            }
        }

        // Tooltip
        if (tooltip) {
            p.noFill();
            p.stroke(120, 90, 30);
            p.strokeWeight(2);
            var hr = 2 + Math.sqrt(tooltip.total / tooltip.maxCount) * tooltip.maxR;
            p.ellipse(tooltip.x, tooltip.y, hr * 2 + 3, hr * 2 + 3);

            var tw = 140;
            var th = 68;
            var tx = tooltip.x + 12;
            var ty = tooltip.y - th - 5;
            if (tx + tw > p.width - 10) tx = tooltip.x - tw - 12;
            if (ty < 5) ty = tooltip.y + 12;

            p.noStroke();
            p.fill(255, 255, 255, 240);
            p.rect(tx, ty, tw, th, 4);
            p.stroke(180);
            p.strokeWeight(0.5);
            p.noFill();
            p.rect(tx, ty, tw, th, 4);

            p.noStroke();
            p.fill(30);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(10);
            p.textStyle(p.BOLD);
            p.text(tooltip.country + ' (' + tooltip.year + ')', tx + 8, ty + 6);
            p.textStyle(p.NORMAL);
            p.textSize(9);
            p.fill(60);
            p.text('Gold: ' + tooltip.gold, tx + 8, ty + 22);
            p.text('Silver: ' + tooltip.silver, tx + 8, ty + 35);
            p.text('Bronze: ' + tooltip.bronze, tx + 8, ty + 48);
            p.fill(30);
            p.textStyle(p.BOLD);
            p.text('Total: ' + tooltip.total, tx + 80, ty + 35);
            p.textStyle(p.NORMAL);
        }

        p.pop();
    }

    window.VizHeatmap = {
        draw: function (p, manager, ai, progress) {
            if (!summerData || !winterData) {
                p.push();
                p.fill(100);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(14);
                p.text('Loading medal data...', p.width / 2, p.height / 2);
                p.pop();
                return;
            }

            if (ai === 3) {
                drawBubbleMatrix(p, manager, winterData,
                    'Olympic Winter Games Medal Table', [100, 160, 210]);
            } else {
                drawBubbleMatrix(p, manager, summerData,
                    'Olympic Summer Games Medal Table', [210, 180, 100]);
            }
        }
    };
})();
