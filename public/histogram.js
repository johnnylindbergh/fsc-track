function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

httpGetAsync("/getTimesheet", function(cb) {
  var timesheet = JSON.parse(cb);

  const xyValues = timesheet.map(function(value,index) { return {x: Date.parse(value.clock_in).toString(), y:value.duration} });
  console.log("xyValues:", xyValues);
   var canvas = $('#histogram');

new Chart(canvas, {
  type: "scatter",
  data: {
    datasets: [{
      pointRadius: 4,
      pointBackgroundColor: "rgba(0,0,255,1)",
      data: xyValues
    }]
  },
});
})


