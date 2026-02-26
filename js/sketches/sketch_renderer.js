// sketch_renderer.js

// Responsible for rendering the main visualization based on the current active index
(function () {
    window.Renderer = {

        setData: function (manager) {
            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            function computeLayout(data) {
                manager.data = data;
            }

            computeLayout([]);
            return Promise.resolve(manager.data);
        },

        draw: function (p, manager, ai, progress) {
            // Section 0-1: Title screens
            if (ai === 0 || ai === 1) {
                window.VizTitle.draw(p, manager, ai, progress);
                return;
            }

            // Section 2-3: Country medal heatmap
            if (ai === 2 || ai === 3) {
                window.VizHeatmap.draw(p, manager, ai, progress);
                return;
            }

            // Section 4-5: Age distribution bar chart
            if (ai === 4 || ai === 5) {
                window.VizAgeBar.draw(p, manager, ai, progress);
                return;
            }

            // Section 6-7: Participation multi-line chart
            if (ai === 6 || ai === 7) {
                window.VizLine.draw(p, manager, ai, progress);
                return;
            }
        }
    };
})();
