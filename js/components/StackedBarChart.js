var d3 = require('d3');
var React = require('react');

class StackedBarChart extends React.Component {
	calcMinMax(series) {
		var children = [];
		for (var child in series) {
			if (series.hasOwnProperty(child))
				children.push(series[child]);
		}

		var positiveValues = [0];
		var negativeValues = [0];
		if (children.length > 0 && children[0].length > 0) {
			for (var j = 0; j < children[0].length; j++) {
				positiveValues.push(children.reduce(function(accum, curr, i, arr) {
					if (arr[i][j] > 0)
						return accum + arr[i][j];
					return accum;
				}, 0));
				negativeValues.push(children.reduce(function(accum, curr, i, arr) {
					if (arr[i][j] < 0)
						return accum + arr[i][j];
					return accum;
				}, 0));
			}
		}

		return [Math.min.apply(Math, negativeValues), Math.max.apply(Math, positiveValues)];
	}
	sortedSeries(series) {
		// Return an array of the series names, from highest to lowest sums (in
		// absolute terms)

		var seriesNames = [];
		var seriesValues = {};
		for (var child in series) {
			if (series.hasOwnProperty(child)) {
				seriesNames.push(child);
				seriesValues[child] = series[child].reduce(function(accum, curr, i, arr) {
					return accum + Math.abs(curr);
				}, 0);
			}
		}
		seriesNames.sort(function(a, b) {
			return seriesValues[b] - seriesValues[a];
		});

		return seriesNames;
	}
	calcAxisMarkSeparation(minMax, height, ticksPerHeight) {
		var targetTicks = height / ticksPerHeight;
		var range = minMax[1]-minMax[0];
		var rangePerTick = range/targetTicks;
		var roundOrder = Math.floor(Math.log(rangePerTick) / Math.LN10);
		var roundTo = Math.pow(10, roundOrder);
		return Math.ceil(rangePerTick/roundTo)*roundTo;
	}
	render() {
		var height = 400;
		var width = 1000;
		var legendWidth = 100;
		var xMargin = 70;
		var yMargin = 70;
		height -= yMargin*2;
		width -= xMargin*2;

		var minMax = this.calcMinMax(this.props.report.FlattenedSeries);
		var xAxisMarksEvery = this.calcAxisMarkSeparation(minMax, height, 40);
		var y = d3.scaleLinear()
			.range([0, height])
			.domain(minMax);
		var x = d3.scaleLinear()
			.range([0, width])
			.domain([0, this.props.report.Labels.length + 0.5]);
		var sortedSeries = this.sortedSeries(this.props.report.FlattenedSeries);

		var bars = [];
		var labels = [];

		var barWidth = x(0.75);
		var barStart = x(0.25) + (x(1) - barWidth)/2;

		// Add Y axis marks and labels, and initialize positive- and
		// negativeSum arrays
		var positiveSum = [];
		var negativeSum = [];
		for (var i=0; i < this.props.report.Labels.length; i++) {
			positiveSum.push(0);
			negativeSum.push(0);
			var labelX = x(i) + barStart + barWidth/2;
			var labelY = height + 15;
			labels.push((
				<text key={"y-axis-label-"+i} x={labelX} y={labelY} transform={"rotate(45 "+labelX+" "+labelY+")"}>{this.props.report.Labels[i]}</text>
			));
			labels.push((
				<line key={"y-axis-tick-"+i} className="axis-tick" x1={labelX} y1={height-3} x2={labelX} y2={height+3} />
			));
		}

		// Make X axis marks and labels
		var makeXLabel = function(value) {
			labels.push((
					<line key={"x-axis-tick-"+value} className="axis-tick" x1={-3} y1={height - y(value)} x2={3} y2={height - y(value)} />
			));
			labels.push((
					<text key={"x-axis-label-"+value} is x={-10} y={height - y(value) + 6} text-anchor={"end"}>{value}</text>
			));
		}
		for (var i=0; i < minMax[1]; i+= xAxisMarksEvery)
			makeXLabel(i);
		for (var i=0-xAxisMarksEvery; i > minMax[0]; i -= xAxisMarksEvery)
			makeXLabel(i);

		// Add all the bars and group them
		var legendMap = {};
		var childId=1;
		for (var i=0; i < sortedSeries.length; i++) {
			var child = sortedSeries[i];
			var childData = this.props.report.FlattenedSeries[child];

			var rectClasses = "chart-element chart-color" + (childId % 12);
			var self = this;
			var rectOnClick = function() {
				var childName = child;
				var onSelectSeries = self.props.onSelectSeries;
				return function() {
					onSelectSeries(childName);
				};
			}();

			var seriesBars = [];
			for (var j=0; j < childData.length; j++) {
				var value = childData[j];
				if (value == 0)
					continue;
				if (value > 0) {
					rectHeight = y(value) - y(0);
					positiveSum[j] += rectHeight;
					rectY = height - y(0) - positiveSum[j];
				} else {
					rectHeight = y(0) - y(value);
					rectY = height - y(0) + negativeSum[j];
					negativeSum[j] += rectHeight;
				}

				seriesBars.push((
					<g key={"stacked-bar-"+j}>
						<title>{child}: {value}</title>
						<rect onClick={rectOnClick} className={rectClasses} x={x(j) + barStart} y={rectY} width={barWidth} height={rectHeight} rx={1} ry={1}/>
					</g>
				));
			}
			if (seriesBars.length > 0) {
				legendMap[child] = childId;
				bars.push((
					<g key={"series-bars-"+childId} className="chart-series">
						{seriesBars}
					</g>
				));
				childId++;
			}
		}

		var legend = [];
		for (var series in legendMap) {
			var legendClasses = "chart-color" + (legendMap[series] % 12);
			var legendY = (legendMap[series] - 1)*15;
			legend.push((
				<rect key={"legend-key-"+legendMap[series]} className={legendClasses} x={0} y={legendY} width={10} height={10}/>
			));
			legend.push((
				<text key={"legend-label-"+legendMap[series]} x={0 + 15} y={legendY + 10}>{series}</text>
			));
		}

		return (
			<svg height={height + 2*yMargin} width={width + 2*xMargin + legendWidth}>
				<g className="stacked-bar-chart" transform={"translate("+xMargin+" "+yMargin+")"}>
					{bars}
					<line className="axis x-axis" x1={0} y1={height} x2={width} y2={height} />
					<line className="axis y-axis" x1={0} y1={0} x2={0} y2={height} />
					{labels}
				</g>
				<g className="chart-legend" transform={"translate("+(width + 2*xMargin)+" "+yMargin+")"}>
					{legend}
				</g>
			</svg>
		);
	}
}

module.exports =  StackedBarChart;
