function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let isFiltered = false;
    let currentSegments = 1;
    let activeThreshold = null;
    let trendOnlyGraph = null;
    let isZeroLineRed = false;

    // Get last names for labels
    const driver1LastName = driver1Name.split(' ').pop();
    const driver2LastName = driver2Name.split(' ').pop();

    // Create containers
    const elements = ['filterButtons', 'segmentControls', 'excluded'].reduce((acc, id) => {
        acc[id] = document.createElement('div');
        acc[id].style.textAlign = 'center';
        acc[id].style.marginBottom = '10px';
        container.appendChild(acc[id]);
        return acc;
    }, {});

    // Common button styles
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

    // Create segment controls
    elements.segmentControls.appendChild(Object.assign(document.createElement('span'), {
        textContent: 'Trend line segments: ',
        style: 'marginRight: 10px'
    }));

    // Segment buttons
    [1, 2, 3, 4].forEach(segments => {
        const button = Object.assign(document.createElement('button'), {
            textContent: segments,
            onclick: () => {
                elements.segmentControls.querySelectorAll('button:not(.trend-only-btn)').forEach(b => 
                    b.style.backgroundColor = '#4a4a4a');
                button.style.backgroundColor = '#3cb371';
                currentSegments = segments;
                updateChart();
                if (trendOnlyGraph) updateTrendOnlyGraph();
            },
            style: Object.entries({...buttonStyle, padding: '5px 10px'})
                .map(([k, v]) => `${k}:${v}`).join(';')
        });
        if (segments === 1) button.style.backgroundColor = '#3cb371';
        elements.segmentControls.appendChild(button);
    });

    // Add trend-only button
    elements.segmentControls.appendChild(Object.assign(document.createElement('span'), {
        textContent: ' | ',
        style: 'margin: 0 10px'
    }));

    const trendOnlyButton = Object.assign(document.createElement('button'), {
        textContent: 'Show Trend Only',
        className: 'trend-only-btn',
        onclick: () => {
            if (!trendOnlyGraph) {
                trendOnlyButton.style.backgroundColor = '#3cb371';
                trendOnlyGraph = document.createElement('div');
                Object.assign(trendOnlyGraph.style, {
                    width: '100%',
                    height: '400px',
                    marginTop: '20px'
                });
                container.appendChild(trendOnlyGraph);
                updateTrendOnlyGraph();
            } else {
                trendOnlyButton.style.backgroundColor = '#4a4a4a';
                trendOnlyGraph.remove();
                trendOnlyGraph = null;
            }
        },
        style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
    });
    elements.segmentControls.appendChild(trendOnlyButton);

    // Create filter buttons
    [1, 1.5, 2, 3, 5].forEach(threshold => {
        const button = Object.assign(document.createElement('button'), {
            textContent: `Filter >${threshold}%`,
            onclick: () => toggleFilter(threshold, button),
            style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
        });
        elements.filterButtons.appendChild(button);
    });

    // Add zero line toggle
    const zeroLineButton = Object.assign(document.createElement('button'), {
        textContent: 'Zero Line',
        onclick: () => {
            isZeroLineRed = !isZeroLineRed;
            zeroLineButton.style.backgroundColor = isZeroLineRed ? '#3cb371' : '#4a4a4a';
            updateChart();
            if (trendOnlyGraph) updateTrendOnlyGraph();
        },
        style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
    });
    elements.filterButtons.appendChild(zeroLineButton);

    // Setup excluded points container
    Object.assign(elements.excluded.style, {
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        display: 'none'
    });

    // Setup main graph container
    const graphContainer = Object.assign(document.createElement('div'), {
        style: 'width: 100%; height: 400px'
    });
    container.appendChild(graphContainer);

    function toggleFilter(threshold, button) {
        if (isFiltered && activeThreshold === threshold) {
            filteredData = [...data];
            excludedPoints = [];
            isFiltered = false;
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
            }).filter(value => value !== null);
            isFiltered = true;
            activeThreshold = threshold;
            elements.filterButtons.querySelectorAll('button').forEach(b => 
                b.style.backgroundColor = '#4a4a4a');
            button.style.backgroundColor = '#3cb371';
            if (excludedPoints.length) {
                elements.excluded.style.display = 'block';
                elements.excluded.innerHTML = '<strong>Excluded Points:</strong><br>' +
                    excludedPoints.map(p => `Race ${p.raceNumber}: ${p.value}%`).join('<br>');
            }
        }
        updateChart();
        if (trendOnlyGraph) updateTrendOnlyGraph();
    }

    function getChartConfig(data, trends, yMin, yMax, isTrendOnly = false) {
        return {
            chart: { type: 'line', height: '400px' },
            title: { text: isTrendOnly ? 'Trend Lines Only' : 'Qualifying Gap Trend' },
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
                    color: isZeroLineRed ? '#ff0000' : '#CCCCCC',
                    width: 2,
                    value: 0,
                    zIndex: 2
                }],
                plotBands: [{
                    from: 0,
                    to: yMax,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${driver1LastName} is Faster`,
                        align: 'right',
                        x: 100,
                        style: { color: '#666666' },
                        useHTML: true
                    }
                }, {
                    from: yMin,
                    to: 0,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${driver2LastName} is Faster`,
                        align: 'right',
                        x: 100,
                        style: { color: '#666666' },
                        useHTML: true
                    }
                }]
            },
            tooltip: {
                formatter: function() {
                    return `Race ${this.x}<br/>${this.series.name}: ${Number(this.y).toFixed(3)}%`;
                },
                useHTML: true
            },
            legend: { enabled: currentSegments > 1 || !isTrendOnly },
            series: isTrendOnly ? trends : [
                {
                    name: 'Qualifying Gap',
                    data: data,
                    color: '#00008B',
                    marker: { enabled: true, radius: 4 },
                    connectNulls: false
                },
                ...trends
            ]
        };
    }

    function calculateTrendSegments(data) {
        const validData = data.filter(v => v !== null);
        const segmentLength = Math.floor(validData.length / currentSegments);
        return Array.from({ length: currentSegments }, (_, i) => {
            const start = i * segmentLength;
            const end = i === currentSegments - 1 ? data.length : (i + 1) * segmentLength;
            const segmentData = data.slice(start, end);
            const points = segmentData
                .map((y, index) => [start + index + 1, y])
                .filter(([_, y]) => y !== null);
            
            if (points.length > 1) {
                const trend = ss.linearRegression(points);
                return {
                    name: `Trend ${currentSegments > 1 ? (i + 1) : ''}`,
                    data: Array.from({ length: end - start }, (_, j) => {
                        const x = start + j + 1;
                        return [x, Number((trend.m * x + trend.b).toFixed(3))];
                    }),
                    dashStyle: 'shortdash',
                    color: '#82ca9d',
                    marker: { enabled: false }
                };
            }
            return null;
        }).filter(Boolean);
    }

    function updateChart() {
        const fullData = Array(Math.max(...data.map((_, i) => i + 1))).fill(null)
            .map((_, i) => filteredData[i] !== undefined ? 
                [i + 1, Number(filteredData[i]?.toFixed(3) || null)] : [i + 1, null]);
        
        const trends = calculateTrendSegments(filteredData);
        const validValues = filteredData.filter(v => v !== null);
        const yMin = Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1);
        const yMax = Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1);
        
        Highcharts.chart(graphContainer, getChartConfig(fullData, trends, yMin, yMax));
    }

    function updateTrendOnlyGraph() {
        if (!trendOnlyGraph) return;
        
        const validValues = filteredData.filter(v => v !== null);
        const yMin = Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1);
        const yMax = Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1);
        
        Highcharts.chart(trendOnlyGraph, 
            getChartConfig([], calculateTrendSegments(filteredData), yMin, yMax, true));
    }

    updateChart();
}
