function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    // State management
    const state = {
        filteredData: [...data],
        excludedPoints: [],
        currentSegments: 1,
        activeThreshold: null,
        trendOnlyGraph: null,
        mainChart: null,
        trendChart: null,
        isZeroLineRed: false,
        showTrendInMain: true,
        showDataPointsInTrend: false,
        driver1LastName: driver1Name.split(' ').pop(),
        driver2LastName: driver2Name.split(' ').pop()
    };

    // Styles
    const styles = {
        button: {
            margin: '0 5px',
            padding: '8px 16px',
            backgroundColor: '#4a4a4a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.3s'
        },
        select: `
            background-color: white;
            color: #333;
            padding: 5px 10px;
            border: 1px solid #ddd;
        `
    };

    // Helper functions
    const createButton = (text, onClick, style = styles.button) => {
        const button = document.createElement('button');
        button.textContent = text;
        Object.assign(button.style, style);
        button.addEventListener('click', onClick);
        return button;
    };

    const createSelect = (options, onChange) => {
        const select = document.createElement('select');
        select.style.cssText = styles.select;
        options.forEach(({ value, text }) => {
            const option = document.createElement('option');
            option.value = value;
            option.text = text;
            select.appendChild(option);
        });
        select.addEventListener('change', onChange);
        return select;
    };

    // Chart configuration
    const getChartConfig = (chartData, trends, yMin, yMax, isTrendOnly = false) => ({
        chart: {
            type: 'line',
            height: '400px',
            events: {
                load: function() {
                    const containerId = `export-${Date.now()}`;
                    const exportContainer = document.createElement('div');
                    exportContainer.id = containerId;
                    this.container.parentNode.appendChild(exportContainer);
                    
                    const exportButton = createButton('Download High-Res Image', () => {
                        this.exportChart({
                            type: 'image/png',
                            filename: 'qualifying-comparison',
                            scale: 4,
                            width: 3000,
                            sourceWidth: 3000,
                            sourceHeight: 2000
                        });
                    });
                    exportContainer.appendChild(exportButton);
                }
            }
        },
        title: { 
            text: isTrendOnly ? 'Trend Line' : 'Qualifying Gap Trend',
            style: { fontSize: '18px', fontWeight: 'bold' }
        },
        xAxis: {
            title: { text: 'Race Number', style: { fontSize: '14px' } },
            allowDecimals: false,
            labels: { style: { fontSize: '12px' } }
        },
        yAxis: {
            title: { text: 'Delta %', style: { fontSize: '14px' } },
            min: yMin,
            max: yMax,
            labels: { format: '{value:.1f}%', style: { fontSize: '12px' } },
            plotLines: [{
                color: state.isZeroLineRed ? '#ff3333' : '#CCCCCC',
                width: 1,
                value: 0,
                zIndex: 2
            }],
            plotBands: [
                {
                    from: 0,
                    to: yMax,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${state.driver1LastName} is Faster`,
                        align: 'left',
                        x: 10,
                        style: { color: '#666666', fontSize: '12px' }
                    }
                },
                {
                    from: yMin,
                    to: 0,
                    color: 'rgba(0, 0, 0, 0)',
                    label: {
                        text: `${state.driver2LastName} is Faster`,
                        align: 'left',
                        x: 10,
                        style: { color: '#666666', fontSize: '12px' }
                    }
                }
            ]
        },
        tooltip: {
            formatter: function() {
                return `Race ${this.x}<br/>${this.series.name}: ${Number(this.y).toFixed(3)}%`;
            },
            style: { fontSize: '12px' }
        },
        legend: {
            enabled: state.currentSegments > 1 || !isTrendOnly,
            itemStyle: { fontSize: '12px' }
        },
        series: createSeries(chartData, trends, isTrendOnly),
        credits: { enabled: false }
    });

    // Series creation
    function createSeries(data, trends, isTrendOnly) {
        if (isTrendOnly) {
            return [
                ...(state.showDataPointsInTrend ? [{
                    name: 'Data Points',
                    data: data,
                    color: 'rgba(0, 0, 139, 0.15)',
                    marker: { enabled: true, radius: 3 },
                    lineWidth: 1,
                    connectNulls: false,
                    enableMouseTracking: false  // Disable hover effect
                }] : []),
                ...trends.map(trend => ({
                    ...trend,
                    lineWidth: 4  // Thicker trend line
                }))
            ];
        }
    
        return [
            {
                name: 'Qualifying Gap',
                data: data,
                color: '#00008B',
                marker: { enabled: true, radius: 4 },
                connectNulls: false
            },
            ...(state.showTrendInMain ? trends : [])
        ];
    }

    // Trend calculation
    function calculateTrends(data) {
        if (data.length < 2) return [];
        
        const segmentLength = Math.floor(data.length / state.currentSegments);
        return Array.from({ length: state.currentSegments }, (_, i) => {
            const start = i * segmentLength;
            const end = i === state.currentSegments - 1 ? data.length : (i + 1) * segmentLength;
            const segment = data.slice(start, end);
            
            if (segment.length > 1) {
                const trend = ss.linearRegression(segment);
                const firstX = segment[0][0];
                const lastX = segment[segment.length - 1][0];
                
                return {
                    name: `Trend ${state.currentSegments > 1 ? (i + 1) : ''}`,
                    data: Array.from({ length: lastX - firstX + 1 }, (_, j) => {
                        const x = firstX + j;
                        return [x, Number((trend.m * x + trend.b).toFixed(3))];
                    }),
                    dashStyle: 'solid',
                    color: '#3cb371',
                    lineWidth: 3,
                    marker: { enabled: false }
                };
            }
            return null;
        }).filter(Boolean);
    }

    // UI Controls
    function createControls() {
        const controlRow = document.createElement('div');
        controlRow.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 20px; margin: 20px 0;';
    
        // Segments control
        const segmentControl = document.createElement('div');
        segmentControl.style.display = 'flex';
        segmentControl.style.alignItems = 'center';
        segmentControl.style.gap = '8px';
        
        const segmentLabel = document.createElement('label');
        segmentLabel.textContent = 'Trend Line Segments:';
        segmentControl.appendChild(segmentLabel);
        
        const segmentSelect = createSelect(
            [1, 2, 3, 4].map(n => ({ value: n, text: n })),
            e => {
                currentSegments = parseInt(e.target.value);
                updateCharts();
            }
        );
        segmentControl.appendChild(segmentSelect);
        controlRow.appendChild(segmentControl);
    
        // Filter control
        const filterControl = document.createElement('div');
        filterControl.style.display = 'flex';
        filterControl.style.alignItems = 'center';
        filterControl.style.gap = '8px';
        
        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Filter Extreme Value:';
        filterControl.appendChild(filterLabel);
        
        const filterSelect = createSelect(
            [
                { value: 0, text: 'No Filter' },
                ...([1, 1.5, 2, 3, 5].map(n => ({ value: n, text: `>${n}%` })))
            ],
            e => handleFilterChange(parseFloat(e.target.value))
        );
        filterControl.appendChild(filterSelect);
        controlRow.appendChild(filterControl);
    
        // Rest of the buttons
        const buttons = [
            createButton('Zero Line', toggleZeroLine),
            createButton('Trend', toggleTrend),
            createButton('Separate Trend', toggleSeparateTrend)
        ];
        buttons.forEach(button => controlRow.appendChild(button));
    
        container.appendChild(controlRow);
    }

    // Chart updates
    function updateCharts() {
        const chartData = prepareChartData();
        state.mainChart = Highcharts.chart(container.querySelector('.main-chart'), 
            getChartConfig(chartData.data, chartData.trends, chartData.yMin, chartData.yMax));
        
        if (state.trendOnlyGraph) {
            state.trendChart = Highcharts.chart(state.trendOnlyGraph, 
                getChartConfig(chartData.data, chartData.trends, chartData.yMin, chartData.yMax, true));
        }
    }

    // Event Handlers
    function handleFilterChange(threshold) {
        if (threshold === 0) {
            state.filteredData = [...data];
            state.excludedPoints = [];
            state.activeThreshold = null;
            container.querySelector('.excluded-points')?.remove();
        } else {
            state.excludedPoints = [];
            state.filteredData = data.map((value, index) => {
                if (Math.abs(value) > threshold) {
                    state.excludedPoints.push({ raceNumber: index + 1, value: Number(value.toFixed(3)) });
                    return null;
                }
                return Number(value.toFixed(3));
            });
            state.activeThreshold = threshold;
            
            if (state.excludedPoints.length) {
                showExcludedPoints();
            }
        }
        updateCharts();
    }

    function showExcludedPoints() {
        let excludedDiv = container.querySelector('.excluded-points');
        if (!excludedDiv) {
            excludedDiv = document.createElement('div');
            excludedDiv.className = 'excluded-points';
            excludedDiv.style.cssText = 'padding: 10px; background-color: #f5f5f5; border-radius: 4px; margin-top: 10px; text-align: center;';
            container.appendChild(excludedDiv);
        }
        excludedDiv.innerHTML = '<strong>Excluded Points:</strong><br>' +
            state.excludedPoints.map(p => `Race ${p.raceNumber}: ${p.value}%`).join('<br>');
    }

    function toggleZeroLine() {
        state.isZeroLineRed = !state.isZeroLineRed;
        this.style.backgroundColor = state.isZeroLineRed ? '#8b0000' : '#4a4a4a';
        
        const updateZeroLine = (chart) => {
            if (!chart) return;
            const zeroLine = chart.yAxis[0].plotLinesAndBands[0];
            zeroLine.svgElem?.attr({
                stroke: state.isZeroLineRed ? '#ff3333' : '#CCCCCC'
            });
        };
        
        updateZeroLine(state.mainChart);
        updateZeroLine(state.trendChart);
    }

    function toggleTrend() {
        state.showTrendInMain = !state.showTrendInMain;
        this.style.backgroundColor = state.showTrendInMain ? '#3cb371' : '#4a4a4a';
        updateCharts();
    }

    function toggleSeparateTrend() {
        if (!state.trendOnlyGraph) {
            // Create separate trend graph
            const graphContainer = document.createElement('div');
            graphContainer.style.cssText = 'width: 100%; height: 400px; margin-top: 20px';
            container.appendChild(graphContainer);
            
            const toggleButton = createButton('Show Data Points', () => {
                state.showDataPointsInTrend = !state.showDataPointsInTrend;
                toggleButton.style.backgroundColor = state.showDataPointsInTrend ? '#3cb371' : '#4a4a4a';
                updateCharts();
            });
            toggleButton.style.marginTop = '10px';
            container.appendChild(toggleButton);
            
            state.trendOnlyGraph = graphContainer;
            this.style.backgroundColor = '#3cb371';
            state.showTrendInMain = false;
        } else {
            // Remove separate trend graph
            container.removeChild(state.trendOnlyGraph.nextSibling); // Remove toggle button
            container.removeChild(state.trendOnlyGraph);
            state.trendOnlyGraph = null;
            this.style.backgroundColor = '#4a4a4a';
            state.showTrendInMain = true;
        }
        updateCharts();
    }

    function prepareChartData() {
        const filteredFullData = data.map((value, index) => {
            if (state.activeThreshold && Math.abs(value) > state.activeThreshold) {
                return [index + 1, null];
            }
            return [index + 1, value !== null ? Number(value.toFixed(3)) : null];
        });
        
        const validFilteredData = filteredFullData
            .filter(point => point[1] !== null)
            .map((point) => [point[0], point[1]]);
        
        const trends = calculateTrends(validFilteredData);
        
        const validValues = filteredFullData
            .filter(point => point[1] !== null)
            .map(point => point[1]);
        
        const yMin = validValues.length > 0 
            ? Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1)
            : -1;
        
        const yMax = validValues.length > 0 
            ? Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1)
            : 1;
        
        return { data: filteredFullData, trends, yMin, yMax };
    }

    // Initialize
    const mainChartContainer = document.createElement('div');
    mainChartContainer.className = 'main-chart';
    mainChartContainer.style.cssText = 'width: 100%; height: 400px';
    container.appendChild(mainChartContainer);

    createControls();
    updateCharts();
}
