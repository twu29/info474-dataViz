// viz_title.js
// Draw title screen for the Olympic Games Stats article
(function () {
    var sportsImg = null;
    var imgLoaded = false;

    // Load the image once
    function ensureImage(p) {
        if (!imgLoaded) {
            imgLoaded = true;
            p.loadImage('pic.png', function (img) {
                sportsImg = img;
            });
        }
    }

    window.VizTitle = {
        draw: function (p, manager, ai, progress) {
            ensureImage(p);

            var cx = (manager.offsetX || 0) + (manager.width || 600) / 2;
            p.push();
            p.noStroke();

            var w = 500;
            var h = 220;
            var cardY = 10;
            p.fill(245, 245, 250);
            p.rect(cx - w / 2, cardY, w, h, 12);

            // Olympic rings
            var ringColors = [
                [0, 129, 188],   // blue
                [0, 0, 0],       // black
                [237, 51, 33],   // red
                [252, 177, 49],  // yellow
                [0, 157, 87]     // green
            ];
            var ringR = 18;
            var ringDiam = ringR * 2;
            var spacing = ringDiam + 8;

            var topRowY = cardY + 50;
            var topRowCx = cx;
            var topX = [topRowCx - spacing, topRowCx, topRowCx + spacing];

            var botRowY = topRowY + ringR + 2;
            var botX = [topRowCx - spacing / 2, topRowCx + spacing / 2];

            p.noFill();
            p.strokeWeight(3.5);

            for (var i = 0; i < 3; i++) {
                p.stroke(ringColors[i][0], ringColors[i][1], ringColors[i][2]);
                p.ellipse(topX[i], topRowY, ringDiam, ringDiam);
            }
            
            p.stroke(ringColors[3][0], ringColors[3][1], ringColors[3][2]);
            p.ellipse(botX[0], botRowY, ringDiam, ringDiam);
            p.stroke(ringColors[4][0], ringColors[4][1], ringColors[4][2]);
            p.ellipse(botX[1], botRowY, ringDiam, ringDiam);

            // Title text
            p.noStroke();
            p.fill(40);
            p.textAlign(p.CENTER, p.CENTER);

            var textY = cardY + 145;

            if (ai === 0) {
                p.textSize(32);
                p.textStyle(p.BOLD);
                p.text('Olympic Games Stats', cx, textY);
                p.textSize(16);
                p.textStyle(p.NORMAL);
                p.fill(100);
                p.text('Exploring athlete participation & medaling', cx, textY + 35);
                p.textSize(13);
                p.fill(120);
                p.text('Authors: Alley Wu, Cassie Hoang, Vincent Liu', cx, textY + 60);
            } else {
                p.textSize(24);
                p.textStyle(p.BOLD);
                p.text('Over 120 Years of Olympic Data', cx, textY);
                p.textSize(14);
                p.textStyle(p.NORMAL);
                p.fill(100);
                p.text('From Athens 1896 to the modern 2024 Games', cx, textY + 30);
            }

            // Draw sports pictogram image below the card
            if (sportsImg) {
                var imgW = w;
                var imgH = (sportsImg.height / sportsImg.width) * imgW;
                var imgY = cardY + h + 50;
                p.image(sportsImg, cx - imgW / 2, imgY, imgW, imgH);
            }

            p.pop();
        }
    };
})();
