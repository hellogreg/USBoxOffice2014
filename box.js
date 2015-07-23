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
        date = new Date((2000 + year), month, day) || null;
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


  function drawBoxOfficeChart(data, chartKey, chartBase, chartName) {

    var margin = {top: 30, right: 120, bottom: 30, left: 120};
    var width = 800 - margin.left - margin.right;
    var height = 480 - margin.top - margin.bottom;

    var x = d3.scale.linear().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom")
        .ticks(6);

    var yAxis = d3.svg.axis().scale(y)
        .orient("left")
        .ticks(5);

    var svg = d3.select("#charts")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    var line, linReg, linRegData;

    x.domain([0, d3.max(data, function (d) {
      return d[chartBase];
    })]);

    y.domain([0, d3.max(data, function (d) {
      return d[chartKey];
    })]);

    svg.selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", "4")
        .attr("cx", function (d) {
          return x(d[chartBase]);
        })
        .attr("cy", function (d) {
          return y(d[chartKey]);
        })
        .on("mouseover", function (d) {

          svg.append("rect")
              .attr("id", "tooltip-rect")
              .attr("fill", "#fff")
              .attr("stroke", "#7386b2")
              .attr("x", parseFloat(d3.select(this).attr("cx")) - 120)
              .attr("width", 240)
              .attr("y", parseFloat(d3.select(this).attr("cy")) - 26)
              .attr("height", 20);

          svg.append("text")
              .attr("id", "tooltip")
              .attr("x", parseFloat(d3.select(this).attr("cx")))
              .attr("y", parseFloat(d3.select(this).attr("cy")) - 12)
              .attr("text-anchor", "middle")
              .attr("font-size", "11px")
              .attr("font-weight", "700")
              .attr("fill", "#f93")
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
      return [+d[chartBase], +d[chartKey]];
    })).line();

    // Create a line based on the beginning and endpoints of the range
    linRegData = x.domain().map(function (d) {
      return {
        base: +(d),
        key: linReg(+d)
      };
    });

    line = d3.svg.line()
        .x(function (d) {
          return x(d.base);
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
      // rank title totalGross maxTheaters openingDate simplePR
      this.rank = +m.rank || null;
      this.title = m.title || null;
      this.totalGross = isWholeNumber(m.totalGross) ? +m.totalGross : null;
      this.openingDate = (m.openingDate) ? convertStringToDate(m.openingDate) : null;
      this.maxTheaters = +m.maxTheaters || null;
      this.simplePR = +m.simplePR || null;
      this.totalGrossSqrt = Math.sqrt(Math.sqrt(this.totalGross))|| null;
      this.maxTheatersSqrt = this.maxTheaters || null;
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

      filterByMinGross: function (min) {
        var movies = this.getMovies();
        movies = movies.filter(function (m) {
          return (m.totalGross >= min);
        });
        dir(movies);
        return new MovieList(movies);
      },

      filterByMinTheaters: function (min) {
        var movies = this.getMovies();
        movies = movies.filter(function (m) {
          return (m.maxTheaters >= min);
        });
        dir(movies);
        return new MovieList(movies);
      },

      filterByMaxTheaters: function (max) {
        var movies = this.getMovies();
        movies = movies.filter(function (m) {
          return (m.maxTheaters <= max);
        });
        dir(movies);
        return new MovieList(movies);
      },

      sortByopeningDate: function (isDescending) {
        var movies = this.getMovies();
        sortArrayByKey(movies, "openingDate", isDescending);
        return this;
      }

    };


    // Fetch the data and start processing it.
    fetchCsvData(csvUrl, function (data) {

      var myMovieList, myMovieData;

      log("Mapping raw data to Movie objects.");
      myMovieList = new MovieList(data);

      log("Filtering and sorting data, only including movies with financial data.");
      myMovieData = myMovieList.filterByHasFinancialData().filterByMinTheaters(50).getMovies();

      log("Drawing data charts.");
      drawBoxOfficeChart(myMovieData, "totalGrossSqrt", "maxTheatersSqrt", "Total Gross (triple sqrt) over Max Theaters (sqrt)");


    });

  }());


}());
