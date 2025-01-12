// QualifyingTrendGraph.js
const QualifyingTrendGraph = ({ data, driver1Name, driver2Name }) => {
    // Transform data for the graph
    const chartData = data.map((item, index) => ({
        round: index + 1,
        difference: item
    }));

    // Calculate trend line
    const points = chartData.map(d => [d.round, d.difference]);
    const trend = linearRegression(points);
    const trendData = chartData.map(d => ({
        round: d.round,
        trend: trend.m * d.round + trend.b
    }));

    // Combine actual and trend data
    const combinedData = chartData.map((d, i) => ({
        ...d,
        trend: trendData[i].trend
    }));

    // Calculate y-axis domain with some padding
    const maxDiff = Math.max(...data);
    const minDiff = Math.min(...data);
    const padding = (maxDiff - minDiff) * 0.1;
    const yDomain = [minDiff - padding, maxDiff + padding];

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.height = '400px';
    container.style.margin = '20px auto';

    const chart = new Highcharts.Chart({
        chart: {
            renderTo: container,
            type: 'line'
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
            min: yDomain[0],
            max: yDomain[1]
        },
        tooltip: {
            formatter: function() {
                return `Race ${this.x}<br/>
                        ${this.series.name}: ${this.y.toFixed(3)}%`;
            }
        },
        series: [{
            name: 'Qualifying Gap',
            data: chartData.map(d => [d.round, d.difference])
        }, {
            name: 'Trend',
            data: trendData.map(d => [d.round, d.trend]),
            dashStyle: 'dash',
            color: '#82ca9d'
        }]
    });

    return container;
};

// Add static create method to help with rendering
QualifyingTrendGraph.create = function(container, data, driver1Name, driver2Name) {
    const graph = new QualifyingTrendGraph({
        data: data,
        driver1Name: driver1Name,
        driver2Name: driver2Name
    });
    container.appendChild(graph);
};
