function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let isFiltered = false;
    let currentSegments = 1;
    let activeThreshold = null;
    let trendOnlyGraph = null;

    // Create main controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.textAlign = 'center';
    controlsContainer.style.marginBottom = '20px';
    container.appendChild(controlsContainer);

    // Create filter buttons container
    const filterButtonsContainer = document.createElement('div');
    filterButtonsContainer.style.marginBottom = '10px';
    controlsContainer.appendChild(filterButtonsContainer);

    // Create segment selector container
    const segmentContainer = document.createElement('div');
    segmentContainer.style.marginBottom = '10px';
    controlsContainer.appendChild(segmentContainer);

    // Create trend-only graph button container
    const trendButtonContainer = document.createElement('div');
    trendButtonContainer.style.marginBottom = '10px';
    controlsContainer.appendChild(trendButtonContainer);

    // Add segment selector label
    const segmentLabel = document.createElement('span');
    segmentLabel.textContent = 'Trend line segments: ';
    segmentLabel.style.marginRight = '10px';
    segmentContainer.appendChild(segmentLabel);

    // Create segment selector buttons
    [1, 2, 3, 4].forEach(segments => {
        const button = document.createElement('button');
        button.textContent = segments;
        button.style.margin = '0 5px';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = segments === 1 ? '#666666' : '#4a4a4a';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.minWidth = '30px';

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#666666';
        });
        button.addEventListener('mouseout', () => {
            if (currentSegments !== segments) {
                button.style.backgroundColor = '#4a4a4a';
            }
        });

        button.onclick = () => {
            segmentContainer.querySelectorAll('button').forEach(btn => {
                btn.style.backgroundColor = '#4a4a4a';
            });
            button.style.backgroundColor = '#666666';
            currentSegments = segments;
            updateChart();
            if (trendOnlyGraph) updateTrendOnlyGraph();
        };
        segmentContainer.appendChild(button);
    });

    // Create filter buttons
    const filterButtons = [
        { threshold: 1, label: '1%' },
        { threshold: 1.5, label: '1.5%' },
        { threshold: 2, label: '2%' },
        { threshold: 3, label: '3%' },
        { threshold: 5, label: '5%' }
    ];

    filterButtons.forEach(({ threshold, label }) => {
        const button = document.createElement('button');
        button.textContent = `Filter >${label}`;
        button.style.margin = '0 10px';
        button.style.padding = '8px 16px';
        button.style.backgroundColor = '#4a4a4a';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.3s';

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = activeThreshold === threshold ? '#2d862d' : '#666666';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = activeThreshold === threshold ? '#3cb371' : '#4a4a4a';
        });

        button.onclick = () => toggleFilter(threshold, button);
        filterButtonsContainer.appendChild(button);
    });

    // Create trend-only graph button
    const trendButton = document.createElement('button');
    trendButton.textContent = 'Show Trend-Only Graph';
    trendButton.style.padding = '8px 16px';
    trendButton.style.backgroundColor = '#4a4a4a';
    trendButton.style.color = 'white';
    trendButton.style.border = 'none';
    trendButton.style.borderRadius = '4px';
    trendButton.style.cursor = 'pointer';

    trendButton.addEventListener('mouseover', () => {
        trendButton.style.backgroundColor = '#666666';
    });
    trendButton.addEventListener('mouseout', () => {
        trendButton.style.backgroundColor = '#4a4a4a';
    });

    trendButton.onclick = createTrendOnlyGraph;
    trendButtonContainer.appendChild(trendButton);

    // Create container for excluded points
    const excludedContainer = document.createElement('div');
    excludedContainer.style.marginTop = '20px';
    excludedContainer.style.padding = '10px';
    excludedContainer.style.backgroundColor = '#f5f5f5';
    excludedContainer.style.borderRadius = '4px';
    excludedContainer.style.display = 'none';
    container.appendChild(excludedContainer);

    function toggleFilter(threshold, button) {
        if (isFiltered && activeThreshold === threshold) {
            // Deactivate filter
            filteredData = [...data];
            excludedPoints = [];
            isFiltered = false;
            activeThreshold = null;
            excludedContainer.style.display = 'none';
            button.style.backgroundColor = '#4a4a4a';
        } else {
            // Activate filter
            excludedPoints = [];
            filteredData = data.map((value, index) => {
                if (Math.abs(value) > threshold) {
                    excludedPoints.push({
                        raceNumber: index + 1,
                        value: Number(parseFloat(value).toFixed(3))
                    });
                    return null;
                }
                return Number(parseFloat(value).toFixed(3));
            }).filter(value => value !== null);
            isFiltered = true;
            activeThreshold = threshold;
    
            // Reset all filter buttons to default color
            filterButtonsContainer.querySelectorAll('button').forEach(btn => {
                btn.style.backgroundColor = '#4a4a4a';
            });
            // Set active button color
            button.style.backgroundColor = '#3cb371';
    
            if (excludedPoints.length > 0) {
                excludedContainer.style.display = 'block';
                excludedContainer.innerHTML = '<strong>Excluded Points:</strong><br>' +
                    excludedPoints.map(point => 
                        `Race ${point.raceNumber}: ${point.value}%`
                    ).join('<br>');
            }
        }
        updateChart();
        if (trendOnlyGraph) updateTrendOnlyGraph();
    }

    function calculateTrendSegments(data, numSegments) {
        const segmentLength = Math.floor(data.length / numSegments);
        const trends = [];

        for (let i = 0; i < numSegments; i++) {
            const start = i * segmentLength;
            const end = i === numSegments - 1 ? data.length : (i + 1) * segmentLength;
            const segmentData = data.slice(start, end);
            
            const points = segmentData.map((y, index) => [start + index + 1, parseFloat(y)]);
            const trend = ss.linearRegression(points);
            
            trends.push({
                start: start + 1,
                end: end,
                trend: trend
            });
        }

        return trends;
    }

    function createTrendOnlyGraph() {
        if (!trendOnlyGraph) {
            const trendContainer = document.createElement('div');
            trendContainer.style.width = '100%';
            trendContainer.style.height = '400px';
            trendContainer.style.marginTop = '20px';
            container.appendChild(trendContainer);
            trendOnlyGraph = trendContainer;
        }
        updateTrendOnlyGraph();
    }

    function updateTrendOnlyGraph() {
        const trends = calculateTrendSegments(filteredData, currentSegments);
        const maxDiff = Math.max(...filteredData);
        const minDiff = Math.min(...filteredData);
        const padding = (maxDiff - minDiff) * 0.1;
    
        const trendSeries = trends.map((segment, index) => ({
            name: `Trend ${currentSegments > 1 ? (index + 1) : ''}`,
            data: Array.from({ length: segment.end - segment.start + 1 }, (_, i) => {
                const x = segment.start + i;
                return [x, Number((segment.trend.m * x + segment.trend.b).toFixed(3))];
            }),
            color: '#82ca9d'
        }));
    
        Highcharts.chart(trendOnlyGraph, {
            chart: {
                type: 'line',
                height: '400px'
            },
            title: {
                text: 'Trend Lines Only'
            },
            xAxis: {
                title: {
                    text: 'Race Number'
                },
                allowDecimals: false
            },
            yAxis: {
                title: {
                    text: 'Delta %'
                },
                min: minDiff - padding,
                max: maxDiff + padding,
                labels: {
                    format: '{value:.3f}%'
                }
            },
            tooltip: {
                formatter: function() {
                    const value = parseFloat(this.y).toFixed(3);
                    const text = `Race ${this.x}<br/>
                            ${this.series.name}: ${value}%`;
                    return text;
                },
                useHTML: true
            },
            legend: {
                enabled: currentSegments > 1
            },
            series: trendSeries
        });
    }

    function updateChart() {
        const chartData = filteredData.map((percentage, index) => ({
            x: index + 1,
            y: parseFloat(percentage)
        }));

        const trends = calculateTrendSegments(filteredData, currentSegments);
        const maxDiff = Math.max(...filteredData);
        const minDiff = Math.min(...filteredData);
        const padding = (maxDiff - minDiff) * 0.1;

        const trendSeries = trends.map((segment, index) => ({
            name: `Trend ${currentSegments > 1 ? (index + 1) : ''}`,
            data: Array.from({ length: segment.end - segment.start + 1 }, (_, i) => {
                const x = segment.start + i;
                return [x, segment.trend.m * x + segment.trend.b];
            }),
            dashStyle: 'shortdash',
            color: '#82ca9d',
            marker: { enabled: false }
        }));

        createChart(chartData, trendSeries, minDiff - padding, maxDiff + padding);
    }

    function createChart(chartData, trendSeries, yMin, yMax) {
        Highcharts.chart(graphContainer, {
            chart: {
                type: 'line',
                height: '400px'
            },
            title: {
                text: 'Qualifying Gap Trend'
            },
            xAxis: {
                title: {
                    text: 'Race Number'
                },
                allowDecimals: false
            },
            yAxis: {
                title: {
                    text: 'Delta %'
                },
                min: yMin,
                max: yMax,
                labels: {
                    format: '{value:.3f}%'
                }
            },
            tooltip: {
                formatter: function() {
                    const value = parseFloat(this.y).toFixed(3);
                    const text = `Race ${this.x}<br/>
                            ${this.series.name}: ${value}%`;
                    return text;
                },
                useHTML: true
            },
            legend: {
                enabled: true
            },
            series: [
                {
                    name: 'Qualifying Gap',
                    data: chartData.map(point => [point.x, Number(point.y.toFixed(3))]),
                    color: '#00008B',
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                ...trendSeries.map(series => ({
                    ...series,
                    data: series.data.map(point => [point[0], Number(point[1].toFixed(3))])
                }))
            ]
        });
    }

    const graphContainer = document.createElement('div');
    graphContainer.style.width = '100%';
    graphContainer.style.height = '400px';
    container.appendChild(graphContainer);

    updateChart();
}
