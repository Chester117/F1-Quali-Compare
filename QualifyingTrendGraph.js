function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let isFiltered = false;
    let currentSegments = 1;
    let activeThreshold = null;

    // Create filter buttons container
    const filterButtonsContainer = document.createElement('div');
    filterButtonsContainer.style.textAlign = 'center';
    filterButtonsContainer.style.marginBottom = '10px';
    container.appendChild(filterButtonsContainer);

    // Create segment selector container
    const segmentContainer = document.createElement('div');
    segmentContainer.style.marginBottom = '10px';
    container.appendChild(segmentContainer);

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

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = activeThreshold === threshold ? '#2d862d' : '#666666';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = activeThreshold === threshold ? '#3cb371' : '#4a4a4a';
        });

        button.onclick = () => toggleFilter(threshold, button);
        filterButtonsContainer.appendChild(button);
    });

    // Create container for excluded points
    const excludedContainer = document.createElement('div');
    excludedContainer.style.marginTop = '20px';
    excludedContainer.style.padding = '10px';
    excludedContainer.style.backgroundColor = '#f5f5f5';
    excludedContainer.style.borderRadius = '4px';
    excludedContainer.style.display = 'none';
    container.appendChild(excludedContainer);

    // Create the graph container
    const graphContainer = document.createElement('div');
    graphContainer.style.width = '100%';
    graphContainer.style.height = '400px';
    container.appendChild(graphContainer);

    function toggleFilter(threshold, button) {
        if (isFiltered && activeThreshold === threshold) {
            filteredData = [...data];
            excludedPoints = [];
            isFiltered = false;
            activeThreshold = null;
            excludedContainer.style.display = 'none';
            button.style.backgroundColor = '#4a4a4a';
        } else {
            excludedPoints = [];
            filteredData = data.map((value, index) => {
                if (Math.abs(value) > threshold) {
                    excludedPoints.push({
                        raceNumber: index + 1,
                        value: Number(value.toFixed(3))
                    });
                    return null;
                }
                return Number(value.toFixed(3));
            }).filter(value => value !== null);
            isFiltered = true;
            activeThreshold = threshold;

            filterButtonsContainer.querySelectorAll('button').forEach(btn => {
                btn.style.backgroundColor = '#4a4a4a';
            });
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
    }

    function calculateTrendSegments(data) {
        const segmentLength = Math.floor(data.length / currentSegments);
        const trends = [];

        for (let i = 0; i < currentSegments; i++) {
            const start = i * segmentLength;
            const end = i === currentSegments - 1 ? data.length : (i + 1) * segmentLength;
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

    function updateChart() {
        const chartData = filteredData.map((percentage, index) => ({
            x: index + 1,
            y: Number(percentage.toFixed(3))
        }));

        const trends = calculateTrendSegments(filteredData);
        const maxDiff = Math.max(...filteredData);
        const minDiff = Math.min(...filteredData);
        const padding = (maxDiff - minDiff) * 0.1;

        const trendSeries = trends.map((segment, index) => ({
            name: `Trend ${currentSegments > 1 ? (index + 1) : ''}`,
            data: Array.from({ length: segment.end - segment.start + 1 }, (_, i) => {
                const x = segment.start + i;
                return [x, Number((segment.trend.m * x + segment.trend.b).toFixed(3))];
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
                },
                plotLines: [{
                    color: '#CCCCCC',
                    width: 2,
                    value: 0,
                    zIndex: 2
                }],
                plotBands: [{
                    from: yMin,
                    to: 0,
                    color: 'rgba(0, 0, 0, 0.03)',
                    label: {
                        text: `${driver1Name} faster`,
                        align: 'right',
                        y: -5,
                        x: -10,
                        style: {
                            color: '#666666'
                        }
                    }
                }, {
                    from: 0,
                    to: yMax,
                    color: 'rgba(0, 0, 0, 0.03)',
                    label: {
                        text: `${driver2Name} faster`,
                        align: 'right',
                        y: 5,
                        x: -10,
                        style: {
                            color: '#666666'
                        }
                    }
                }]
            },
            tooltip: {
                formatter: function() {
                    const value = Number(this.y).toFixed(3);
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
                    data: chartData.map(point => [point.x, point.y]),
                    color: '#00008B',
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                ...trendSeries
            ]
        });
    }

    // Initial chart creation
    updateChart();
}
