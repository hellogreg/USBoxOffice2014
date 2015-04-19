/* Box Office Charts, by Greg and Kathy Gibson of accessbollywood.com */

(function () {

  "use strict";

  var window = this || (0 || eval)("this");
  var console = window.console;
  var dir, log;

  console.clear();

  // Send object properties to the browser console.
  dir = function (m) {
    (!!(console) && !!(m)) && console.dir(m);
  };

  // Send status messages to the browser console.
  log = function (m) {
    !!(console) && console.log(m !== undefined ? m : "-------------");
  };

  // Sort numerical and non-numerical arrays by category (e.g., movie by release date or total gross).
  function sortArrayByKey(arr, key, isDescending) {
    if (arr.constructor === Array) {
      arr.sort(function (a, b) {
        return a[key] - b[key];
      });
      if (isDescending) {
        arr.reverse();
      }
    } else {
      arr = [];
    }
    return arr;
  }

  // Test if value is a valid number for our calculations (must be a whole number).
  // From this SO thread: http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
  function isWholeNumber(n) {
    return !isNaN(parseFloat(n))
        && isFinite(n)
        && (n % 1 === 0)
        && (n >= 0);
  }

  // Stripping non-numerics changes whole-dollar currency back to numbers for sorting and math.
  function stripNonNumerics(n) {
    var num = null;
    if (n) {
      num = +n.replace(/[^\d]/g, "") || null;
    }
    return num;
  }

  // Format numbers with commas, for currency.
  // From this SO thread: http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
  Number.prototype.monetize = function (n, x) {
    var re = "\\d(?=(\\d{" + (x || 3) + "})+" + (n > 0 ? "\\." : "$") + ")";
    return "$" + this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, "g"), "$&,");
  };

  function isValidDate(d) {
    return (Object.prototype.toString.call(d) === "[object Date]");
  }

  function convertStringToDate(d) {

    var dateArray, year, month, day, date;

    // Only convert if it's not already a valid date object!
    if (!isValidDate(d)) {
      dateArray = d ? d.split("/") : [];
      if (dateArray.length === 3) {
        year = parseInt(dateArray[2].split(" ")[0], 10);
        month = parseInt((dateArray[0] - 1), 10);
        day = parseInt(dateArray[1], 10);
        date = new Date(year, month, day) || null;
      }
    } else {
      date = d;
    }
    return date || null;
  }

  function fetchCsvData(url, callback) {
    if (callback) {
      d3.csv(url, function (data) {
        log("Retrieving raw data...");
        callback(data);
      });
    }
  }

  function drawDataTable(data, columns) {

    var table = d3.select("#tables")
        .append("table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");
    var rows, cells;

    thead.append("tr")
        .selectAll("th")
        .data(columns["display"])
        .enter()
        .append("th")
        .text(function (column) {
          return column;
        });

    rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    cells = rows.selectAll("td")
        .data(function (row) {
          return columns["id"].map(function (column) {
            return {"column": column, "value": row[column]};
          });
        })
        .enter()
        .append("td")
        .html(function (d) {
          return d.value;
        });

  }


  function drawBoxOfficeChart(data, chartKey, chartName) {

    var margin = {top: 30, right: 65, bottom: 30, left: 80};
    var width = 640 - margin.left - margin.right;
    // var width = parseInt(d3.select('#charts').style('width'), 10) - margin.left - margin.right;
    var height = 240 - margin.top - margin.bottom;

    var x = d3.time.scale().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom")
        .ticks(5);

    var yAxis = d3.svg.axis().scale(y)
        .orient("left")
        .ticks(5);

    var valueLine = d3.svg.line()
        .interpolate("monotone")
        .x(function (d) {
          return x(d.releaseDate);
        })
        .y(function (d) {
          return y(d[chartKey]);
        });

    var svg = d3.select("#charts")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    var line, linReg, linRegData;

    x.domain(d3.extent(data, function (d) {
      return d.releaseDate;
    }));

    y.domain([0, d3.max(data, function (d) {
      return d[chartKey];
    })]);

    svg.append("path")
        .attr("class", "line")
        .attr("d", valueLine(data));

    svg.selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", "4")
        .attr("cx", function (d) {
          return x(d.releaseDate);
        })
        .attr("cy", function (d) {
          return y(d[chartKey]);
        })
        .on("mouseover", function (d) {

          svg.append("rect")
              .attr("id", "tooltip-rect")
              .attr("fill", "#fff")
              .attr("stroke", "#7386b2")
              .attr("x", parseFloat(d3.select(this).attr("cx")) - 60)
              .attr("width", 120)
              .attr("y", parseFloat(d3.select(this).attr("cy")) - 26)
              .attr("height", 20);

          svg.append("text")
              .attr("id", "tooltip")
              .attr("x", parseFloat(d3.select(this).attr("cx")))
              .attr("y", parseFloat(d3.select(this).attr("cy")) - 12)
              .attr("text-anchor", "middle")
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .attr("fill", "#444")
              .text(d.title);

        })
        .on("mouseout", function () {

          d3.select("#tooltip")
              .remove();

          d3.select("#tooltip-rect")
              .remove();

        });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, " + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    // Add chart name to top of chart.
    svg.append("text")
        .attr("x", 0)
        .attr("y", 0 - (margin.top / 3))
        .attr("class", "chartname")
        .text(chartName);

    // Derive a linear regression
    linReg = ss.linear_regression().data(data.map(function (d) {
      return [+d.releaseDate, +d[chartKey]];
    })).line();

    // Create a line based on the beginning and endpoints of the range
    linRegData = x.domain().map(function (d) {
      return {
        release: new Date(d),
        key: linReg(+d)
      };
    });

    line = d3.svg.line()
        .x(function (d) {
          return x(d.release);
        })
        .y(function (d) {
          return y(d.key);
        });

    svg.append("path")
        .datum(linRegData)
        .attr("class", "trendline")
        .attr("d", line);

  }


  // INIT FUNCTION
  (function () {

    var csvUrl = "2014box.csv";

    function Movie(m) {
      this.title = m.title || null;
      this.totalGross = isWholeNumber(m.totalGross) ? +m.totalGross : null;
      this.releaseDate = (m.releaseDate) ? convertStringToDate(m.releaseDate) : null;
      this.openingGross = m.openingGross || +m.g1 || null;
      this.openingTheaters = m.openingTheaters || +m.t1 || null;
      this.maxTheaters = m.maxTheaters || +m.maxT || null;
      this.imdbId = m.imdbId || m.imdbid || null;
      this.performanceRating = Math.round(this.totalGross / this.maxTheaters) || null;
      this.openingAverage = Math.round(this.openingGross / this.openingTheaters) || null;
      this.openingGrossAsPercentOfTotal = Math.round(this.openingGross / this.totalGross * 100) || null;
    }

    Movie.prototype = {

      hasFinancialData: function () {
        return isWholeNumber(this.totalGross);
      }

    };


    function MovieList(movies) {

      var movieList = movies.map(function (m) {
            return new Movie(m);
          }) || [];

      this.getMovies = function () {
        return movieList;
      };

    }

    MovieList.prototype = {

      filterByHasFinancialData: function () {
        var movies = this.getMovies();
        movies = movies.filter(function (m) {
          return (m.hasFinancialData());
        });
        dir(movies);
        return new MovieList(movies);
      },

      filterOutDhoom3: function () {
        var movies = this.getMovies();
        movies = movies.filter(function (m) {
          return !(m.imdbId === "tt1833673");
        });
        dir(movies);
        return new MovieList(movies);
      },

      sortByReleaseDate: function (isDescending) {
        var movies = this.getMovies();
        sortArrayByKey(movies, "releaseDate", isDescending);
        return this;
      }

    };


    // Fetch the data and start processing it.
    fetchCsvData(csvUrl, function (data) {

      var yrMovieList, yrMovieData, yrNoDhoom3;

      log("Mapping raw data to Movie objects.");
      yrMovieList = new MovieList(data);

      log("Filtering and sorting data, only including movies with financial data.");
      yrMovieData = yrMovieList.filterByHasFinancialData().sortByReleaseDate().getMovies();
      yrNoDhoom3 = yrMovieList.filterByHasFinancialData().filterOutDhoom3().sortByReleaseDate().getMovies();

      log("Drawing a data table.");
      drawDataTable(yrMovieData, {
        "id": ["title", "totalGross", "maxTheaters", "openingAverage", "releaseDate"],
        "display": ["Movie Title", "Total Gross", "Max Theaters", "Opening Average", "Release Date"]
      });

      log("Drawing data charts.");
      drawBoxOfficeChart(yrMovieData, "totalGross", "Total US Gross For Each Movie ($US)");
      drawBoxOfficeChart(yrMovieData, "maxTheaters", "Highest # of Theaters In Which Each Movie Showed");
      drawBoxOfficeChart(yrMovieData, "performanceRating", "Simple Performance Rating (Total Gross / Max Theaters)");
      drawBoxOfficeChart(yrMovieData, "openingAverage", "Opening Weekend Per-Theater Average For Each Movie ($US)");
      drawBoxOfficeChart(yrMovieData, "openingGrossAsPercentOfTotal", "Opening Gross as a Percentage of Total Gross");

      drawBoxOfficeChart(yrNoDhoom3, "totalGross", "Total US Grosses, Not Counting Dhoom 3 ($US)");
      drawBoxOfficeChart(yrNoDhoom3, "openingAverage", "Opening Weekend Averages, Not Counting Dhoom 3 ($US)");

    });

  }());


}());