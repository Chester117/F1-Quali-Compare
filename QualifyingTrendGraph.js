function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    let filteredData = [...data];
    let excludedPoints = [];
    let isFiltered = false;
    let currentSegments = 1; // Track number of trend line segments

    // Create button containers with some spacing
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
            // Update active button styles
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
        { threshold: 2, label: '2%' },
        { threshold: 1.5, label: '1.5%' },
        { threshold: 1, label: '1%' }
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
            button.style.backgroundColor = '#666666';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#4a4a4a';
        });

        button.onclick = () => toggleFilter(threshold);
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

    function toggleFilter(threshold) {
        if (isFiltered) {
            filteredData = [...data];
            excludedPoints = [];
            isFiltered = false;
            excludedContainer.style.display = 'none';
        } else {
            excludedPoints = [];
            filteredData = data.map((value, index) => {
                if (Math.abs(value) > threshold) {
                    excludedPoints.push({
                        raceNumber: index + 1,
                        value: value
                    });
                    return null;
                }
                return value;
            }).filter(value => value !== null);
            isFiltered = true;

            if (excludedPoints.length > 0) {
                excludedContainer.style.display = 'block';
                excludedContainer.innerHTML = '<strong>Excluded Points:</strong><br>' +
                    excludedPoints.map(point => 
                        `Race ${point.raceNumber}: ${point.value.toFixed(3)}%`
                    ).join('<br>');
            }
        }
        updateChart();
    }

    function updateChart() {
        const chartData = filteredData.map((percentage, index) => ({
            x: index + 1,
            y: parseFloat(percentage)
        }));

        // Calculate trend segments
        const trends = calculateTrendSegments(filteredData, currentSegments);
        
        // Calculate y-axis domain with padding
        const maxDiff = Math.max(...filteredData);
        const minDiff = Math.min(...filteredData);
        const padding = (maxDiff - minDiff) * 0.1;

        // Create trend line series data
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
                    format: '{value}%'
                }
            },
            tooltip: {
                formatter: function() {
                    return `Race ${this.x}<br/>
                            ${this.series.name}: ${this.y.toFixed(3)}%`;
                }
            },
            legend: {
                enabled: true
            },
            series: [
                {
                    name: 'Qualifying Gap',
                    data: chartData.map(point => [point.x, point.y]),
                    color: '#00008B', // Changed to dark blue
                    marker: {
                        enabled: true,
                        radius: 4
                    }
                },
                ...trendSeries
            ]
        });
    }

    // Create the graph container
    const graphContainer = document.createElement('div');
    graphContainer.style.width = '100%';
    graphContainer.style.height = '400px';
    container.appendChild(graphContainer);

    // Initial chart creation
    updateChart();
}
