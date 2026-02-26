// viz_age_bar.js
// Bar chart showing age distribution of gold medalists (placeholder data)
(function () {
    // Placeholder: age bins and approximate gold medalist counts
    var ageBins = ['15-17', '18-20', '21-23', '24-26', '27-29', '30-32', '33-35', '36-38', '39-41', '42+'];
    var counts =  [45,      210,     480,     620,     530,     340,     180,     85,      35,      20];
    var maxCount = 620;

    window.VizAgeBar = {
        draw: function (p, manager, ai, progress) {
            p.push();
            var left = (manager.offsetX || 80) + 50;
            var top = (manager.offsetY || 0) + 60;
            var chartW = (manager.width || 600) - 100;
            var chartH = (manager.height || 520) - 120;
            var barW = chartW / ageBins.length;
            var barPad = 6;

            // Title
            p.noStroke();
            p.fill(40);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(16);
            p.textStyle(p.BOLD);
            p.text('Age Distribution of Gold Medalists', left - 30, top - 50);
            p.textStyle(p.NORMAL);

            // Y-axis label
            p.push();
            p.fill(80);
            p.textSize(11);
            p.textAlign(p.CENTER, p.CENTER);
            p.translate(left - 40, top + chartH / 2);
            p.rotate(-p.HALF_PI);
            p.text('Number of Gold Medals', 0, 0);
            p.pop();

            // X-axis label
            p.fill(80);
            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text('Age Group', left + chartW / 2, top + chartH + 35);

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
            var yTicks = [0, 200, 400, 600];
            for (var t = 0; t < yTicks.length; t++) {
                var ty = top + chartH - (yTicks[t] / maxCount) * chartH;
                p.text(yTicks[t], left - 5, ty);
                p.stroke(230);
                p.strokeWeight(0.5);
                p.line(left, ty, left + chartW, ty);
                p.noStroke();
            }

            // Bars
            for (var i = 0; i < ageBins.length; i++) {
                var val = counts[i];
                var barH = (val / maxCount) * chartH;
                var bx = left + i * barW + barPad / 2;
                var by = top + chartH - barH;
                var bw = barW - barPad;

                // Gold gradient color
                var goldR = 218;
                var goldG = 165 + Math.floor((val / maxCount) * 50);
                var goldB = 32;
                p.noStroke();
                p.fill(goldR, goldG, goldB, 220);
                p.rect(bx, by, bw, barH, 3, 3, 0, 0);

                // Value on top
                p.fill(80);
                p.textAlign(p.CENTER, p.BOTTOM);
                p.textSize(9);
                p.text(val, bx + bw / 2, by - 3);

                // Age label
                p.fill(60);
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(9);
                p.text(ageBins[i], bx + bw / 2, top + chartH + 5);
            }

            p.pop();
        }
    };
})();
