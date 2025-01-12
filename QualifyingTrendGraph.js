function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    // State management
    const state = {
            filteredData: [...data],
            excludedPoints: [],
            currentSegments: 3,          // Default 3 segments
            activeThreshold: 2,          // Default 2% filter
            trendOnlyGraph: null,
            mainChart: null,
            trendChart: null,
            isZeroLineRed: true,         // Zero line on by default
            showTrendInMain: true,       // Trend on by default
            showDataPointsInTrend: true, // Show data points by default
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
                color: '#ff3333',  // Always start with red line
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
                    color: 'rgb(0, 0, 139)',  // Solid blue without transparency
                    marker: { 
                        enabled: true, 
                        radius: 3,
                        states: {
                            hover: {
                                enabled: false  // Disable hover effect
                            }
                        }
                    },
                    lineWidth: 1,
                    connectNulls: false,
                    enableMouseTracking: false,
                    states: {
                        inactive: {
                            opacity: 1  // Maintain opacity when inactive
                        }
                    }
                }] : []),
                ...trends.map(trend => ({
                    ...trend,
                    lineWidth: 4
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
    
        // Calculate points per segment, ensuring we include all points
        const pointsPerSegment = Math.ceil(data.length / state.currentSegments);
        
        // Create segments with different colors for visibility
        const colors = ['#3cb371', '#1e90ff', '#ff6b6b', '#ffd700'];
        const segments = [];
    
        for (let i = 0; i < state.currentSegments; i++) {
            const start = i * pointsPerSegment;
            const end = Math.min(start + pointsPerSegment, data.length);
            const segmentData = data.slice(start, end);
            
            if (segmentData.length > 1) {
                // Calculate linear regression for this segment
                const xValues = segmentData.map(d => d[0]);
                const yValues = segmentData.map(d => d[1]);
                const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
                const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
                
                let numerator = 0;
                let denominator = 0;
                for (let j = 0; j < xValues.length; j++) {
                    numerator += (xValues[j] - xMean) * (yValues[j] - yMean);
                    denominator += Math.pow(xValues[j] - xMean, 2);
                }
                
                const slope = numerator / denominator;
                const intercept = yMean - slope * xMean;
                
                // Generate trend line points only for this segment
                const trendData = [];
                const firstX = xValues[0];
                const lastX = xValues[xValues.length - 1];
                
                for (let x = firstX; x <= lastX; x++) {
                    const y = slope * x + intercept;
                    trendData.push([x, Number(y.toFixed(3))]);
                }
                
                segments.push({
                    name: `Trend ${state.currentSegments > 1 ? (i + 1) : ''}`,
                    data: trendData,
                    dashStyle: 'solid',
                    color: colors[i % colors.length],
                    lineWidth: 4,
                    marker: { enabled: false }
                });
            }
        }
        
        return segments;
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
                state.currentSegments = parseInt(e.target.value);
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

    // Initialize the main container and charts
    const mainChartContainer = document.createElement('div');
    mainChartContainer.className = 'main-chart';
    mainChartContainer.style.cssText = 'width: 100%; height: 400px';
    container.appendChild(mainChartContainer);

    createControls();

    // Set initial state of controls
    setTimeout(() => {
        // Set segments to 3
        const segmentSelect = container.querySelector('select');
        if (segmentSelect) {
            segmentSelect.value = '3';
        }

        // Set filter to 2%
        const filterSelect = container.querySelectorAll('select')[1];
        if (filterSelect) {
            filterSelect.value = '2';
        }

        // Apply initial filter
        handleFilterChange(2);

        // Show separate trend graph and update button state
        const separateTrendButton = container.querySelector('button:nth-child(5)');
        if (separateTrendButton) {
            separateTrendButton.click();
            
            // After creating separate trend graph, set its data points button
            setTimeout(() => {
                const dataPointsButton = container.querySelector('button:last-child');
                if (dataPointsButton) {
                    dataPointsButton.style.backgroundColor = '#3cb371';
                }
            }, 0);
        }

        // Update zero line button state
        const zeroLineButton = container.querySelector('button:nth-child(3)');
        if (zeroLineButton) {
            zeroLineButton.style.backgroundColor = '#8b0000';
        }

        // Update trend button state
        const trendButton = container.querySelector('button:nth-child(4)');
        if (trendButton) {
            trendButton.style.backgroundColor = '#3cb371';
        }

        updateCharts();
    }, 0);

    // Initial chart update
    updateCharts();
}
