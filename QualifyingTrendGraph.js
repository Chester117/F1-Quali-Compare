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
        // Create a single row for all controls
        const controlRow = document.createElement('div');
        controlRow.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; margin-bottom: 10px;';
        
        // Segment controls
        const segmentContainer = document.createElement('div');
        segmentContainer.style.display = 'flex';
        segmentContainer.style.alignItems = 'center';
        segmentContainer.style.gap = '5px';
        
        const segmentLabel = document.createElement('span');
        segmentLabel.textContent = 'Trend line segments:';
        segmentContainer.appendChild(segmentLabel);
        
        const segmentSelect = Object.assign(document.createElement('select'), {
            className: 'selector',
            onchange: (e) => {
                currentSegments = parseInt(e.target.value);
                updateCharts();
            },
            style: `
                background-color: white;
                color: #333;
                padding: 5px 10px;
                width: 150px;
                border: 1px solid #ddd;
            `
        });
        
        [1, 2, 3, 4].forEach(segments => {
            const option = document.createElement('option');
            option.value = segments;
            option.text = segments;
            segmentSelect.appendChild(option);
        });
        segmentContainer.appendChild(segmentSelect);
        controlRow.appendChild(segmentContainer);
        
        // Filter dropdown
        const filterSelect = Object.assign(document.createElement('select'), {
            className: 'selector',
            onchange: (e) => {
                const threshold = parseFloat(e.target.value);
                if (threshold === 0) {
                    filteredData = [...data];
                    excludedPoints = [];
                    activeThreshold = null;
                    elements.excluded.style.display = 'none';
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
                    
                    if (excludedPoints.length) {
                        elements.excluded.style.display = 'block';
                        elements.excluded.innerHTML = '<strong>Excluded Points:</strong><br>' +
                            excludedPoints.map(p => `Race ${p.raceNumber}: ${p.value}%`).join('<br>');
                    }
                }
                updateCharts();
            },
            style: `
                background-color: white;
                color: #333;
                padding: 5px 10px;
            `
        });
        
        const defaultOption = document.createElement('option');
        defaultOption.value = "0";
        defaultOption.text = "No Filter";
        filterSelect.appendChild(defaultOption);
        
        [1, 1.5, 2, 3, 5].forEach(threshold => {
            const option = document.createElement('option');
            option.value = threshold;
            option.text = `Filter >${threshold}%`;
            filterSelect.appendChild(option);
        });
        controlRow.appendChild(filterSelect);
        
        // Control buttons
        const createButton = (text, onClick, isToggle = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `
                margin: 0 5px;
                padding: 8px 16px;
                background-color: #4a4a4a;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.3s;
            `;
            
            button.addEventListener('click', () => {
                if (isToggle) {
                    onClick();
                } else {
                    onClick(button);
                }
            });
            
            return button;
        };
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.alignItems = 'center';
        buttonsContainer.style.gap = '10px';
        
        const zeroLineButton = createButton('Zero Line', () => {
            isZeroLineRed = !isZeroLineRed;
            zeroLineButton.style.backgroundColor = isZeroLineRed ? '#8b0000' : '#4a4a4a';
            
            if (mainChart) {
                const mainZeroLine = mainChart.yAxis[0].plotLinesAndBands[0];
                mainZeroLine.svgElem.attr({
                    stroke: isZeroLineRed ? '#ff3333' : '#CCCCCC'
                });
            }
            
            if (trendChart) {
                const trendZeroLine = trendChart.yAxis[0].plotLinesAndBands[0];
                trendZeroLine.svgElem.attr({
                    stroke: isZeroLineRed ? '#ff3333' : '#CCCCCC'
                });
            }
        });
        
        let trendGraphVisible = false;
        const trendButton = createButton('Separate Trend Graph', () => {
            if (!trendGraphVisible) {
                const graphContainer = Object.assign(document.createElement('div'), {
                    style: 'width: 100%; height: 400px; margin-top: 20px'
                });
                container.appendChild(graphContainer);
                
                const toggleButton = createButton('Show Data Points', () => {
                    showDataPointsInTrend = !showDataPointsInTrend;
                    toggleButton.style.backgroundColor = showDataPointsInTrend ? '#3cb371' : '#4a4a4a';
                    updateTrendOnlyGraph();
                }, true);
                toggleButton.style.marginTop = '10px';
                container.appendChild(toggleButton);
                
                trendOnlyGraph = graphContainer;
                updateTrendOnlyGraph();
                trendGraphVisible = true;
                trendButton.style.backgroundColor = '#3cb371';
            } else {
                container.removeChild(trendOnlyGraph);
                container.removeChild(trendOnlyGraph.nextSibling);
                trendOnlyGraph = null;
                trendGraphVisible = false;
                trendButton.style.backgroundColor = '#4a4a4a';
            }
            updateChart();
        });
        
        buttonsContainer.appendChild(zeroLineButton);
        buttonsContainer.appendChild(trendButton);
        controlRow.appendChild(buttonsContainer);
        
        // Clear existing content and add the new control row
        elements.segmentControls.innerHTML = '';
        elements.segmentControls.appendChild(controlRow);
        
        Object.assign(elements.excluded.style, {
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            display: 'none',
            width: '100%',
            textAlign: 'center'
        });
    }
    // Add this new function for export button
    function createExportButton(chart, containerId) {
        const exportButton = Object.assign(document.createElement('button'), {
            textContent: 'Download High-Res Image',
            onclick: () => {
                chart.exportChart({
                    type: 'image/png',
                    filename: 'qualifying-comparison',
                    scale: 4,
                    width: 3000,
                    sourceWidth: 3000,
                    sourceHeight: 2000
                });
            },
            style: Object.entries({
                ...buttonStyle,
                margin: '20px auto',
                display: 'block'
            }).map(([k, v]) => `${k}:${v}`).join(';')
        });
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.textAlign = 'center';
        buttonContainer.appendChild(exportButton);
        document.getElementById(containerId).appendChild(buttonContainer);
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
            series.push(...trends);
        } else {
            if (showDataPointsInTrend) {
                series.push({
                    name: 'Data Points',
                    data: data,
                    color: 'rgba(0, 0, 139, 0.15)',
                    marker: { enabled: true, radius: 3 },
                    lineWidth: 1,
                    connectNulls: false
                });
            }
            series.push(...trends);
        }
        return series;
    }

    function getChartConfig(data, trends, yMin, yMax, isTrendOnly = false) {
        return {
            chart: {
                type: 'line',
                height: '400px',
                events: {
                    load: function() {
                        const containerId = `export-container-${Date.now()}`;
                        const container = document.createElement('div');
                        container.id = containerId;
                        this.container.parentNode.appendChild(container);
                        createExportButton(this, containerId);
                    }
                },
                style: {
                    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif"
                }
            },
            title: { 
                text: isTrendOnly ? 'Trend Line' : 'Qualifying Gap Trend',
                style: {
                    fontSize: '18px',
                    fontWeight: 'bold'
                }
            },
            xAxis: {
                title: { 
                    text: 'Race Number',
                    style: {
                        fontSize: '14px'
                    }
                },
                allowDecimals: false,
                labels: {
                    style: {
                        fontSize: '12px'
                    }
                }
            },
            yAxis: {
                title: { 
                    text: 'Delta %',
                    style: {
                        fontSize: '14px'
                    }
                },
                min: yMin,
                max: yMax,
                labels: { 
                    format: '{value:.1f}%',
                    style: {
                        fontSize: '12px'
                    }
                },
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
                        style: { 
                            color: '#666666',
                            fontSize: '12px'
                        },
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
                        style: { 
                            color: '#666666',
                            fontSize: '12px'
                        },
                        useHTML: true
                    }
                }]
            },
            tooltip: {
                formatter: function() {
                    return `Race ${this.x}<br/>${this.series.name}: ${Number(this.y).toFixed(3)}%`;
                },
                style: {
                    fontSize: '12px'
                }
            },
            legend: { 
                enabled: currentSegments > 1 || !isTrendOnly,
                itemStyle: {
                    fontSize: '12px'
                }
            },
            series: createSeries(data, trends, isTrendOnly),
            plotOptions: {
                series: {
                    states: { 
                        inactive: { opacity: 1 } 
                    }
                }
            },
            exporting: {
                enabled: true,
                fallbackToExportServer: false,
                chartOptions: {
                    chart: {
                        width: 3000,
                        height: 2000,
                        style: {
                            fontSize: '16px'  // Increase font size for exported image
                        }
                    },
                    title: {
                        style: {
                            fontSize: '24px'  // Larger title in exported image
                        }
                    },
                    xAxis: {
                        labels: {
                            style: {
                                fontSize: '16px'
                            }
                        },
                        title: {
                            style: {
                                fontSize: '18px'
                            }
                        }
                    },
                    yAxis: {
                        labels: {
                            style: {
                                fontSize: '16px'
                            }
                        },
                        title: {
                            style: {
                                fontSize: '18px'
                            }
                        }
                    },
                    legend: {
                        itemStyle: {
                            fontSize: '16px'
                        }
                    }
                },
                buttons: {
                    contextButton: {
                        enabled: false  // Disable the default export button
                    }
                }
            },
            credits: {
                enabled: false  // Remove Highcharts credits
            }
        };
    }

    function calculateTrendSegments(data) {
        if (data.length < 2) return [];
    
        const points = data;
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
        // First, filter the data correctly
        const filteredFullData = data.map((value, index) => {
            if (activeThreshold && Math.abs(value) > activeThreshold) {
                return [index + 1, null];
            }
            return [index + 1, value !== null ? Number(value.toFixed(3)) : null];
        });
        
        // Prepare data for trend calculation (only using non-null values)
        const validFilteredData = filteredFullData
            .filter(point => point[1] !== null)
            .map((point, index) => [point[0], point[1]]);
        
        const trends = calculateTrendSegments(validFilteredData);
        
        // Calculate min and max from non-null values
        const validValues = filteredFullData
            .filter(point => point[1] !== null)
            .map(point => point[1]);
        
        const yMin = validValues.length > 0 
            ? Math.min(...validValues) - Math.abs(Math.min(...validValues) * 0.1)
            : -1; // Default if no valid values
        
        const yMax = validValues.length > 0 
            ? Math.max(...validValues) + Math.abs(Math.max(...validValues) * 0.1)
            : 1; // Default if no valid values
        
        return { 
            fullData: filteredFullData, 
            trends, 
            yMin, 
            yMax 
        };
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
