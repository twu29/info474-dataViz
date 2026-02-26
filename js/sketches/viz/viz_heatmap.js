// viz_heatmap.js
// Geographic heatmap showing medal counts by country on a world map (placeholder data)
(function () {
    // Equirectangular projection helpers
    function lonToX(lon, left, w) {
        return left + ((lon + 180) / 360) * w;
    }
    function latToY(lat, top, h) {
        return top + ((90 - lat) / 180) * h;
    }

    // Simplified continent outlines (lon, lat pairs)
    var continents = {
        northAmerica: [
            [-130,50],[-125,60],[-110,68],[-95,72],[-80,70],[-65,60],[-55,48],
            [-65,45],[-70,42],[-75,35],[-82,25],[-90,20],[-105,20],[-115,30],
            [-125,40],[-130,50]
        ],
        southAmerica: [
            [-80,10],[-75,5],[-70,-5],[-75,-15],[-70,-25],[-65,-35],[-68,-45],
            [-73,-52],[-65,-55],[-60,-50],[-55,-35],[-50,-25],[-45,-15],[-35,-5],
            [-50,0],[-60,5],[-70,10],[-80,10]
        ],
        europe: [
            [-10,36],[0,38],[5,44],[0,48],[-5,48],[0,52],[5,54],[10,55],[15,55],
            [20,55],[25,55],[30,58],[30,65],[25,70],[15,70],[10,65],[5,60],
            [0,55],[-5,52],[-10,50],[-10,36]
        ],
        africa: [
            [-15,35],[-17,15],[-10,5],[-5,5],[5,5],[10,2],[15,5],[25,0],[30,-5],
            [35,-10],[40,-15],[35,-25],[30,-30],[25,-33],[20,-35],[15,-30],
            [10,-20],[10,-10],[5,0],[0,5],[-5,10],[-15,15],[-15,35]
        ],
        asia: [
            [30,35],[35,35],[40,40],[50,40],[55,45],[60,50],[70,55],[80,55],
            [90,50],[100,55],[110,55],[120,55],[130,55],[135,50],[140,45],
            [140,40],[130,35],[120,30],[110,20],[105,15],[100,15],[95,20],
            [90,25],[85,25],[80,15],[75,10],[70,20],[65,25],[55,25],[45,30],
            [35,30],[30,35]
        ],
        oceania: [
            [115,-15],[120,-18],[130,-15],[140,-12],[148,-15],[150,-20],[152,-25],
            [150,-30],[145,-35],[140,-38],[135,-35],[130,-32],[125,-30],[118,-22],
            [115,-15]
        ]
    };

    // Country centroids (lon, lat) and placeholder total medal counts
    var countries = [
        { code: 'USA', lon: -98, lat: 38, medals: 2650, name: 'United States' },
        { code: 'RUS', lon: 60, lat: 55, medals: 1556, name: 'Russia/USSR' },
        { code: 'GER', lon: 10, lat: 51, medals: 1300, name: 'Germany' },
        { code: 'GBR', lon: -2, lat: 54, medals: 920, name: 'Great Britain' },
        { code: 'FRA', lon: 2, lat: 47, medals: 840, name: 'France' },
        { code: 'ITA', lon: 12, lat: 42, medals: 700, name: 'Italy' },
        { code: 'CHN', lon: 105, lat: 35, medals: 640, name: 'China' },
        { code: 'AUS', lon: 134, lat: -25, medals: 560, name: 'Australia' },
        { code: 'JPN', lon: 138, lat: 36, medals: 500, name: 'Japan' },
        { code: 'KOR', lon: 128, lat: 36, medals: 340, name: 'South Korea' },
        { code: 'CUB', lon: -79, lat: 22, medals: 230, name: 'Cuba' },
        { code: 'BRA', lon: -52, lat: -15, medals: 150, name: 'Brazil' },
        { code: 'KEN', lon: 38, lat: 1, medals: 110, name: 'Kenya' },
        { code: 'NOR', lon: 10, lat: 62, medals: 190, name: 'Norway' },
        { code: 'SWE', lon: 16, lat: 62, medals: 210, name: 'Sweden' },
        { code: 'CAN', lon: -106, lat: 56, medals: 320, name: 'Canada' },
        { code: 'NED', lon: 5, lat: 52, medals: 300, name: 'Netherlands' },
        { code: 'HUN', lon: 19, lat: 47, medals: 510, name: 'Hungary' },
        { code: 'JAM', lon: -77, lat: 18, medals: 85, name: 'Jamaica' },
        { code: 'ETH', lon: 39, lat: 9, medals: 60, name: 'Ethiopia' },
        { code: 'NZL', lon: 174, lat: -41, medals: 130, name: 'New Zealand' },
        { code: 'IND', lon: 79, lat: 21, medals: 35, name: 'India' }
    ];

    var maxMedals = 2650;

    function getMedalColor(val, maxVal) {
        var t = Math.pow(val / maxVal, 0.6); // non-linear for better spread
        // Light yellow -> orange -> deep red
        var r = Math.floor(255 - t * 55);
        var g = Math.floor(235 - t * 195);
        var b = Math.floor(130 - t * 120);
        return [r, g, b];
    }

    window.VizHeatmap = {
        draw: function (p, manager, ai, progress) {
            p.push();
            var left = (manager.offsetX || 80);
            var top = (manager.offsetY || 0) + 55;
            var w = (manager.width || 600) - 10;
            var h = (manager.height || 520) - 110;

            // Title
            p.noStroke();
            p.fill(40);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(15);
            p.textStyle(p.BOLD);
            p.text('Olympic Medal Counts by Country', left, top - 45);
            p.textStyle(p.NORMAL);
            p.textSize(11);
            p.fill(100);
            p.text('Total medals won across all Summer Olympic Games', left, top - 27);

            // Ocean background
            p.fill(230, 240, 250);
            p.noStroke();
            p.rect(left, top, w, h, 4);

            // Draw continent outlines
            p.fill(235, 235, 230);
            p.stroke(200);
            p.strokeWeight(0.8);
            var contKeys = Object.keys(continents);
            for (var c = 0; c < contKeys.length; c++) {
                var pts = continents[contKeys[c]];
                p.beginShape();
                for (var i = 0; i < pts.length; i++) {
                    var px = lonToX(pts[i][0], left, w);
                    var py = latToY(pts[i][1], top, h);
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
            }

            // Draw country bubbles
            p.noStroke();
            for (var i = 0; i < countries.length; i++) {
                var ct = countries[i];
                var cx = lonToX(ct.lon, left, w);
                var cy = latToY(ct.lat, top, h);
                var size = 8 + Math.sqrt(ct.medals / maxMedals) * 30;
                var col = getMedalColor(ct.medals, maxMedals);

                // Bubble
                p.fill(col[0], col[1], col[2], 200);
                p.ellipse(cx, cy, size, size);

                // Label
                p.fill(40);
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(8);
                p.noStroke();
                p.text(ct.code, cx, cy + size / 2 + 2);
            }

            // Legend
            var legendX = left + 5;
            var legendY = top + h + 12;
            p.fill(60);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(10);
            p.text('Fewer medals', legendX, legendY);

            var gradX = legendX + 75;
            var gradW = 100;
            var gradH = 10;
            for (var i = 0; i < 20; i++) {
                var t = i / 19;
                var gc = getMedalColor(t * maxMedals, maxMedals);
                p.fill(gc[0], gc[1], gc[2]);
                p.noStroke();
                p.rect(gradX + i * (gradW / 20), legendY - gradH / 2, gradW / 20 + 1, gradH);
            }

            p.fill(60);
            p.textAlign(p.LEFT, p.CENTER);
            p.text('More medals', gradX + gradW + 5, legendY);

            // Circle size legend
            var sizeX = gradX + gradW + 100;
            p.fill(60);
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(9);
            p.text('Circle size = total medals', sizeX, legendY);

            p.pop();
        }
    };
})();
