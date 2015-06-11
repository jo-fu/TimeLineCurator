// Based on jiahuang's d3-timeline
// https://github.com/jiahuang/d3-timeline

(function () {
  d3.timeline = function() {

    var mouseover = function () {},
        mouseout = function () {},
        click = function () {},
        width = $("#topBox").width(),
        //height = $("#topBox").height(),
        tickFormat = {
          format: d3.time.format("%Y"),
          tickTime: d3.time.years,
          tickInterval: 5,
          tickSize: 10 },
        ending = 1420070400000, // 2015
        beginning = 946684800000, // 2000
        itemMargin = 5,
        itemHeight = 20;

    function timeline (gParent) {
      var g = gParent.append("g").attr("class","allthedates"),
          gParentSize = gParent[0][0].getBoundingClientRect(),
          gParentItem = d3.select(gParent[0][0]);

      
      var scaleFactor = (1/(ending - beginning)) * (width - margin.left - margin.right);

      // draw axis
      var xScale = d3.time.scale()
        .domain([beginning, ending])
        .range([puffer/2, width - puffer*2]);

      var xAxis = d3.svg.axis()
        .scale(xScale)
        .ticks(15)
        .tickSize(15);

      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 +","+(margin.top + (itemHeight + itemMargin))+")")
        .call(xAxis);
    }

    // SETTINGS

    timeline.margin = function (p) {
      if (!arguments.length) return margin;
      margin = p;
      return timeline;
    };


    timeline.itemHeight = function (h) {
      if (!arguments.length) return itemHeight;
      itemHeight = h;
      return timeline;
    };

    timeline.tickFormat = function (format) {
      if (!arguments.length) return tickFormat;
      tickFormat = format;
      return timeline;
    };

    timeline.click = function (clickFunc) {
      if (!arguments.length) return click;
      click = clickFunc;
      return timeline;
    };

    // Keep for potential later usage

    timeline.mouseover = function (mouseoverFunc) {
      if (!arguments.length) return mouseoverFunc;
      mouseover = mouseoverFunc;
      return timeline;
    };

    timeline.mouseout = function (mouseoverFunc) {
      if (!arguments.length) return mouseoverFunc;
      mouseout = mouseoverFunc;
      return timeline;
    };
    

    return timeline;
  };
})();
