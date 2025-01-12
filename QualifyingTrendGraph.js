function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let currentSegments = 1;
    let activeThreshold = null;
    let trendOnlyGraph = null;
    let mainChart = null;
    let trendChart = null;
    let isZeroLineRed = false;
    let showTrendInMain = true;
    let showDataPointsInTrend = false;

    const driver1LastName = driver1Name.split(' ').pop();
    const driver2LastName = driver2Name.split(' ').pop();

    const buttonStyle = {
        margin: '0 5px',
        padding: '8px 16px',
        backgroundColor: '#4a4a4a',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s'
    };

    const elements = ['filterButtons', 'segmentControls', 'excluded'].reduce((acc, id) => {
        acc[id] = document.createElement('div');
        acc[id].style.textAlign = 'center';
        acc[id].style.marginBottom = '10px';
        container.appendChild(acc[id]);
        return acc;
    }, {});

    // Create controls
    function createControls() {
        elements.segmentControls.appendChild(Object.assign(document.createElement('span'), {
            textContent: 'Trend line segments: ',
            style: 'marginRight: 10px'
        }));

        [1, 2, 3, 4].forEach(segments => {
            const button = Object.assign(document.createElement('button'), {
                textContent: segments,
                onclick: () => {
                    elements.segmentControls.querySelectorAll('button:not(.trend-only-btn):not(.zero-line-btn)')
                        .forEach(b => b.style.backgroundColor = '#4a4a4a');
                    button.style.backgroundColor = '#3cb371';
                    currentSegments = segments;
                    updateCharts();
                },
                style: Object.entries({...buttonStyle, padding: '5px 10px'})
                    .map(([k, v]) => `${k}:${v}`).join(';')
            });
            if (segments === 1) button.style.backgroundColor = '#3cb371';
            elements.segmentControls.appendChild(button);
        });

        elements.segmentControls.appendChild(createSeparator());
        elements.segmentControls.appendChild(createZeroLineButton());
        elements.segmentControls.appendChild(createSeparator());
        elements.segmentControls.appendChild(createTrendButton());

        [1, 1.5, 2, 3, 5].forEach(threshold => {
            const button = Object.assign(document.createElement('button'), {
                textContent: `Filter >${threshold}%`,
                onclick: () => toggleFilter(threshold, button),
                style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
            });
            elements.filterButtons.appendChild(button);
        });

        Object.assign(elements.excluded.style, {
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            display: 'none'
        });
    }

    function createSeparator() {
        return Object.assign(document.createElement('span'), {
            textContent: ' | ',
            style: 'margin: 0 10px'
        });
    }

    function createZeroLineButton() {
        return Object.assign(document.createElement('button'), {
            textContent: 'Zero Line',
            className: 'zero-line-btn',
            onclick: function() {
                isZeroLineRed = !isZeroLineRed;
                this.style.backgroundColor = isZeroLineRed ? '#8b0000' : '#4a4a4a';
                
                if (mainChart) {
                    const mainZeroLine = mainChart.yAxis[0].plotLinesAndBands[0];
                    if (isZeroLineRed) {
                        mainZeroLine.svgElem.show();
                        mainZeroLine.svgElem.attr({
                            stroke: '#ff3333',
                            'stroke-width': 1
                        });
                    } else {
                        mainZeroLine.svgElem.show();
                        mainZeroLine.svgElem.attr({
                            stroke: '#CCCCCC',
                            'stroke-width': 1
                        });
                    }
                }
                
                if (trendChart) {
                    const trendZeroLine = trendChart.yAxis[0].plotLinesAndBands[0];
                    if (isZeroLineRed) {
                        trendZeroLine.svgElem.show();
                        trendZeroLine.svgElem.attr({
                            stroke: '#ff3333',
                            'stroke-width': 1
                        });
                    } else {
                        trendZeroLine.svgElem.show();
                        trendZeroLine.svgElem.attr({
                            stroke: '#CCCCCC',
                            'stroke-width': 1
                        });
                    }
                }
            },
            style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
        });
    }

    function createTrendButton() {
        return Object.assign(document.createElement('button'), {
            textContent: 'Separate Trend Graph',
            className: 'trend-only-btn',
            onclick: toggleTrendGraph,
            style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
        });
    }

    function toggleTrendGraph() {
        showTrendInMain = !showTrendInMain;
        if (!trendOnlyGraph) {
            this.style.backgroundColor = '#3cb371';
            
            const controlsContainer = document.createElement('div');
            controlsContainer.style.cssText = 'text-align: center; margin: 30px 0 10px 0';
            
            const dataPointsToggle = Object.assign(document.createElement('button'), {
                textContent: 'Show Data Points',
                onclick: () => {
                    showDataPointsInTrend = !showDataPointsInTrend;
                    dataPointsToggle.style.backgroundColor = showDataPointsInTrend ? '#3cb371' : '#4a4a4a';
                    updateTrendOnlyGraph();
                },
                style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
            });
            controlsContainer.appendChild(dataPointsToggle);
            container.appendChild(controlsContainer);
            
            trendOnlyGraph = Object.assign(document.createElement('div'), {
                style: 'width: 100%; height: 400px; margin-top: 20px'
            });
            container.appendChild(trendOnlyGraph);
            updateTrendOnlyGraph();
        } else {
            this.style.backgroundColor = '#4a4a4a';
            container.removeChild(trendOnlyGraph.previousSibling);
            container.removeChild(trendOnlyGraph);
            trendOnlyGraph = null;
        }
        updateChart();
    }

    function toggleFilter(threshold, button) {
        if (activeThreshold === threshold) {
            filteredData = [...data];
            excludedPoints = [];
            activeThreshold = null;
            elements.excluded.style.display = 'none';
            button.style.backgroundColor = '#4a4a4a';
        } else {
            excludedPoints = [];
            filteredData = data.map((value, index) => {
                if (Math.abs(value) > threshold) {
                    excludedPoints.push({ raceNumber: index + 1, value: Number(value.toFixed(3)) });
                    return null;
                }
                return Number(value.toFixed(3));
            });
            activeThreshold = threshold;
            elements.filterButtons.querySelectorAll('button')
                .forEach(b => b.style.backgroundColor = '#4a4a4a');
            button.style.backgroundColor = '#3cb371';
            if (excludedPoints.length) {
                elements.excluded.style.display = 'block';
                elements.excluded.innerHTML = '<strong>Excluded Points:</strong><br>' +
                    excludedPoints.map(p => `Race ${p.raceNumber}: ${p.value}%`).join('<br>');
            }
        }
        updateCharts();
    }

    function createSeries(data, trends, isTrendOnly) {
        const series = [];
        if (!isTrendOnly) {
            series.push({
                name: 'Qualifying Gap',
                data: data,
                color: '#00008B',
                marker: { enabled: true, radius: 4 },
                connectNulls: false
            });
            if (showTrendInMain) series.push(...trends);
        } else {
            if (showDataPointsInTrend) {
                series.push({
                    name: 'Data Points',
                    data: data,
                    color: 'rgba(0, 0, 139, 0.15)',
                    marker: { enabled: true, radius: 3 },
                    lineWidth: 1,
                    connectNulls: false,
                    enableMouseTracking: false,
                    states: { inactive: { opacity: 0.15 } }
                });
            }
            series.push(...trends);
        }
        return series;
    }

    function getChartConfig(data, trends, yMin, yMax, isTrendOnly = false) {
        return {
            chart: { type: 'line', height: '400px' },
            title: { text: isTrendOnly ? 'Trend Line' : 'Qualifying Gap Trend' },
            xAxis: {
                title: { text: 'Race Number' },
                allowDecimals: false
            },
            yAxis: {
                title: { text: 'Delta %' },
                min: yMin,
                max: yMax,
                labels: { format: '{value:.1f}%' },
                plotLines: [{
                    color: isZeroLineRed ? '#ff3333' : '#CCCCCC',
                    width: 1,
                    value: 0,
                    zIndex: 2
                }],
                plotBands: [{
                    from: 0,
                    to: yMax,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${driver1LastName} is Faster`,
                        align: 'left',
                        x: 10,
                        style: { color: '#666666' }
                    }
                }, {
                    from: yMin,
                    to: 0,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${driver2LastName} is Faster`,
                        align: 'left',
                        x: 10,
                        style: { color: '#666666' }
                    }
                }]
            },
            tooltip: {
                formatter: function() {
                    return `Race ${this.x}<br/>${this.series.name}: ${Number(this.y).toFixed(3)}%`;
                }
            },
            legend: { enabled: currentSegments > 1 || !isTrendOnly },
            series: createSeries(data, trends, isTrendOnly),
            plotOptions: {
                series: {
                    states: { inactive: { opacity: 1 } }
                }
            }
        };
    }

    function calculateTrendSegments(data) {
        const points = data.map((value, index) => 
            value !== null ? [index + 1, value] : null
        ).filter(point => point !== null);

        if (points.length < 2) return [];

        const segmentLength = Math.floor(points.length / currentSegments);
        return Array.from({ length: currentSegments }, (_, i) => {
            const start = i * segmentLength;
            const end = i === currentSegments - 1 ? points.length : (i + 1) * segmentLength;
            const segmentPoints = points.slice(start, end);
            
            if (segmentPoints.length > 1) {
                const trend = ss.linearRegression(segmentPoints);
                const firstRace = segmentPoints[0][0];
                const lastRace = segmentPoints[segmentPoints.length - 1][0];
                
                return {
                    name: `Trend ${currentSegments > 1 ? (i + 1) : ''}`,
                    data: Array.from(
                        { length: lastRace - firstRace + 1 }, 
                        (_, j) => {
                            const x = firstRace + j;
                            return [x, Number((trend.m * x + trend.b).toFixed(3))];
                        }
                    ),
                    dashStyle: 'solid',
                    color: '#3cb371',
                    lineWidth: 3,
                    marker: { enabled: false }
                };
            }
            return null;
        }).filter(Boolean);
    }

    function prepareChartData() {
        const fullData = data.map((value, index) => 
            [index + 1, value !== null ? Number(value.toFixed(3)) : null]
        );
        
        const trends = calculateTrendSegments(filteredData);
        const validValues = data.filter(v => v !== null);
        const yMin = Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1);
        const yMax = Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1);
        
        return { fullData, trends, yMin, yMax };
    }

    function updateChart() {
        const { fullData, trends, yMin, yMax } = prepareChartData();
        mainChart = Highcharts.chart(graphContainer, getChartConfig(fullData, trends, yMin, yMax));
    }

    function updateTrendOnlyGraph() {
        if (!trendOnlyGraph) return;
        const { fullData, trends, yMin, yMax } = prepareChartData();
        trendChart = Highcharts.chart(trendOnlyGraph, 
            getChartConfig(fullData, trends, yMin, yMax, true));
    }

    function updateCharts() {
        updateChart();
        if (trendOnlyGraph) updateTrendOnlyGraph();
    }

    const graphContainer = Object.assign(document.createElement('div'), {
        style: 'width: 100%; height: 400px'
    });
    container.appendChild(graphContainer);
    
    createControls();
    updateChart();
}
