function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let isFiltered = false;
    let currentSegments = 1;
    let activeThreshold = null;
    let trendOnlyGraph = null;
    let isZeroLineRed = false;
    let showTrendInMain = true;
    let showDataPointsInTrend = false;

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
                elements.segmentControls.querySelectorAll('button:not(.trend-only-btn):not(.zero-line-btn)').forEach(b => 
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

    // Add separator and trend-only button
    elements.segmentControls.appendChild(Object.assign(document.createElement('span'), {
        textContent: ' | ',
        style: 'margin: 0 10px'
    }));

    const trendOnlyButton = Object.assign(document.createElement('button'), {
        textContent: 'Separate Trend Graph',
        className: 'trend-only-btn',
        onclick: () => {
            showTrendInMain = !showTrendInMain;
            if (!trendOnlyGraph) {
                trendOnlyButton.style.backgroundColor = '#3cb371';
                
                // Create container for trend graph controls
                const trendControlsContainer = document.createElement('div');
                trendControlsContainer.style.textAlign = 'center';
                trendControlsContainer.style.marginBottom = '10px';
                container.appendChild(trendControlsContainer);
                
                // Create toggle button for data points
                const dataPointsToggle = Object.assign(document.createElement('button'), {
                    textContent: 'Show Data Points',
                    style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';'),
                    onclick: () => {
                        showDataPointsInTrend = !showDataPointsInTrend;
                        dataPointsToggle.style.backgroundColor = showDataPointsInTrend ? '#3cb371' : '#4a4a4a';
                        updateTrendOnlyGraph();
                    }
                });
                trendControlsContainer.appendChild(dataPointsToggle);
                
                // Create trend graph container
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
                // Remove both the graph and its controls
                container.removeChild(trendOnlyGraph.previousSibling); // Remove controls
                container.removeChild(trendOnlyGraph);
                trendOnlyGraph = null;
            }
            updateChart();
        },
        style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
    });
    elements.segmentControls.appendChild(trendOnlyButton);

    // Add separator and zero line toggle
    elements.segmentControls.appendChild(Object.assign(document.createElement('span'), {
        textContent: ' | ',
        style: 'margin: 0 10px'
    }));

    const zeroLineButton = Object.assign(document.createElement('button'), {
        textContent: 'Zero Line',
        className: 'zero-line-btn',
        onclick: () => {
            isZeroLineRed = !isZeroLineRed;
            zeroLineButton.style.backgroundColor = isZeroLineRed ? '#8b0000' : '#4a4a4a';
            updateChart();
            if (trendOnlyGraph) updateTrendOnlyGraph();
        },
        style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
    });
    elements.segmentControls.appendChild(zeroLineButton);

    // Create filter buttons
    [1, 1.5, 2, 3, 5].forEach(threshold => {
        const button = Object.assign(document.createElement('button'), {
            textContent: `Filter >${threshold}%`,
            onclick: () => toggleFilter(threshold, button),
            style: Object.entries(buttonStyle).map(([k, v]) => `${k}:${v}`).join(';')
        });
        elements.filterButtons.appendChild(button);
    });

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
        const series = [];
        
        if (!isTrendOnly) {
            series.push({
                name: 'Qualifying Gap',
                data: data,
                color: '#00008B',
                marker: { enabled: true, radius: 4 },
                connectNulls: false
            });
            if (showTrendInMain) {
                series.push(...trends);
            }
        } else {
            if (showDataPointsInTrend) {
                series.push({
                    name: 'Data Points',
                    data: data,
                    color: 'rgba(0, 0, 139, 0.2)', // Very transparent blue
                    marker: { enabled: true, radius: 4 },
                    connectNulls: false,
                    enableMouseTracking: false // Disable hover interaction
                });
            }
            series.push(...trends);
        }

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
                    color: isZeroLineRed ? '#8b0000' : '#CCCCCC',
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
                        align: 'left',
                        x: 10,
                        style: { color: '#666666' },
                        useHTML: true
                    }
                }, {
                    from: yMin,
                    to: 0,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${driver2LastName} is Faster`,
                        align: 'left',
                        x: 10,
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
            series: series
        };
    }

    function calculateTrendSegments(data) {
        // Convert data into points format while preserving race numbers
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
                
                // Get actual race numbers for this segment
                const firstRace = segmentPoints[0][0];
                const lastRace = segmentPoints[segmentPoints.length - 1][0];
                
                // Create trend line data points for actual race numbers
                const trendData = Array.from(
                    { length: lastRace - firstRace + 1 }, 
                    (_, j) => {
                        const x = firstRace + j;
                        return [x, Number((trend.m * x + trend.b).toFixed(3))];
                    }
                );

                return {
                    name: `Trend ${currentSegments > 1 ? (i + 1) : ''}`,
                    data: trendData,
                    dashStyle: 'solid',
                    color: '#3cb371',
                    lineWidth: 3,
                    marker: { enabled: false }
                };
            }
            return null;
        }).filter(Boolean);
    }

    function updateChart() {
        // Create data points preserving race numbers and null values
        const fullData = data.map((value, index) => 
            [index + 1, value !== null ? Number(value.toFixed(3)) : null]
        );
        
        const trends = calculateTrendSegments(filteredData);
        
        // Calculate yMin and yMax from valid values only
        const validValues = data.filter(v => v !== null);
        const yMin = Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1);
        const yMax = Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1);
        
        Highcharts.chart(graphContainer, getChartConfig(fullData, trends, yMin, yMax));
    }

    function updateTrendOnlyGraph() {
        if (!trendOnlyGraph) return;
        
        const fullData = data.map((value, index) => 
            [index + 1, value !== null ? Number(value.toFixed(3)) : null]
        );
        
        const validValues = data.filter(v => v !== null);
        const yMin = Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1);
        const yMax = Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1);
        
        Highcharts.chart(trendOnlyGraph, 
            getChartConfig(fullData, calculateTrendSegments(filteredData), yMin, yMax, true));
    }

    updateChart();
}
