// viz_line.js
// Multi-line chart showing athlete participation over time by gender (placeholder data)
(function () {
    // Placeholder years and participation counts
    var years = [1900, 1912, 1924, 1936, 1948, 1960, 1972, 1984, 1992, 2000, 2008, 2016];
    var maleCounts =   [975, 2359, 2954, 3632, 4104, 4727, 6065, 5263, 6652, 6582, 6305, 5765];
    var femaleCounts = [22,   48,  135,  331,  390,  611, 1059, 1566, 2704, 4069, 4637, 5059];
    var totalCounts =  [];
    for (var i = 0; i < years.length; i++) {
        totalCounts.push(maleCounts[i] + femaleCounts[i]);
    }
    var maxVal = 12000;

    function drawLine(p, xs, ys, data, color, left, top, chartW, chartH) {
        p.stroke(color[0], color[1], color[2]);
        p.strokeWeight(2.5);
        p.noFill();
        p.beginShape();
        for (var i = 0; i < data.length; i++) {
            var px = left + (i / (data.length - 1)) * chartW;
            var py = top + chartH - (data[i] / maxVal) * chartH;
            p.vertex(px, py);
        }
        p.endShape();

        // Draw dots
        p.noStroke();
        p.fill(color[0], color[1], color[2]);
        for (var i = 0; i < data.length; i++) {
            var px = left + (i / (data.length - 1)) * chartW;
            var py = top + chartH - (data[i] / maxVal) * chartH;
            p.ellipse(px, py, 6, 6);
        }
    }

    window.VizLine = {
        draw: function (p, manager, ai, progress) {
            p.push();
            var left = (manager.offsetX || 80) + 40;
            var top = (manager.offsetY || 0) + 60;
            var chartW = (manager.width || 600) - 80;
            var chartH = (manager.height || 520) - 140;

            // Title
            p.noStroke();
            p.fill(40);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(16);
            p.textStyle(p.BOLD);
            p.text('Athlete Participation Over Time', left - 20, top - 50);
            p.textStyle(p.NORMAL);

            // Y-axis label
            p.push();
            p.fill(80);
            p.textSize(11);
            p.textAlign(p.CENTER, p.CENTER);
            p.translate(left - 35, top + chartH / 2);
            p.rotate(-p.HALF_PI);
            p.text('Number of Athletes', 0, 0);
            p.pop();

            // X-axis label
            p.fill(80);
            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text('Olympic Year', left + chartW / 2, top + chartH + 40);

            // Axes
            p.stroke(180);
            p.strokeWeight(1);
            p.line(left, top, left, top + chartH);
            p.line(left, top + chartH, left + chartW, top + chartH);

            // Y-axis ticks
            p.noStroke();
            p.fill(120);
            p.textSize(9);
            p.textAlign(p.RIGHT, p.CENTER);
            var yTicks = [0, 3000, 6000, 9000, 12000];
            for (var t = 0; t < yTicks.length; t++) {
                var ty = top + chartH - (yTicks[t] / maxVal) * chartH;
                p.text(yTicks[t].toLocaleString(), left - 5, ty);
                p.stroke(235);
                p.strokeWeight(0.5);
                p.line(left, ty, left + chartW, ty);
                p.noStroke();
            }

            // X-axis ticks
            p.fill(80);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(9);
            for (var i = 0; i < years.length; i++) {
                var px = left + (i / (years.length - 1)) * chartW;
                p.text(years[i], px, top + chartH + 5);
            }

            // Draw lines
            drawLine(p, years, maleCounts, totalCounts, [100, 100, 100], left, top, chartW, chartH);   // total (grey)
            drawLine(p, years, maleCounts, maleCounts, [41, 128, 185], left, top, chartW, chartH);      // male (blue)
            drawLine(p, years, femaleCounts, femaleCounts, [219, 68, 85], left, top, chartW, chartH);   // female (red)

            // Legend
            var legendX = left + chartW - 160;
            var legendY = top + 10;
            var legendItems = [
                { label: 'Total', color: [100, 100, 100] },
                { label: 'Male', color: [41, 128, 185] },
                { label: 'Female', color: [219, 68, 85] }
            ];
            p.noStroke();
            for (var l = 0; l < legendItems.length; l++) {
                var ly = legendY + l * 20;
                var c = legendItems[l].color;
                p.fill(c[0], c[1], c[2]);
                p.rect(legendX, ly - 4, 14, 10, 2);
                p.fill(60);
                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(11);
                p.text(legendItems[l].label, legendX + 20, ly + 1);
            }

            p.pop();
        }
    };
})();
