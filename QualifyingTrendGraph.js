function QualifyingTrendGraph(container, data, driver1Name, driver2Name) {
    // Transform data for the graph
    const chartData = data.map((item, index) => ({
        x: index + 1,
        y: item
    }));

    // Calculate trend line using simple-statistics
    const points = data.map((y, x) => [x + 1, y]);
    const trend = ss.linearRegression(points);
    const trendData = points.map(([x, _]) => ({
        x: x,
        y: trend.m * x + trend.b
    }));

    // Calculate y-axis domain with padding
    const maxDiff = Math.max(...data);
    const minDiff = Math.min(...data);
    const padding = (maxDiff - minDiff) * 0.1;

    // Create the chart
    Highcharts.chart(container, {
        chart: {
            type: 'line',
            height: '400px'
        },
        title: {
            text: 'Qualifying Performance Trend'
        },
        xAxis: {
            title: {
                text: 'Race Number'
            }
        },
        yAxis: {
            title: {
                text: 'Gap (%)'
            },
            min: minDiff - padding,
            max: maxDiff + padding
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
        series: [{
            name: 'Qualifying Gap',
            data: chartData.map(point => [point.x, point.y]),
            color: '#8884d8'
        }, {
            name: 'Trend',
            data: trendData.map(point => [point.x, point.y]),
            dashStyle: 'shortdash',
            color: '#82ca9d'
        }]
    });
}
