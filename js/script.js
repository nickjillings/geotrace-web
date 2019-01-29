
function calculateDistance(A, B)
{
    return calculateDistance4(A.latitude, A.longitude, B.latitude, B.longitude);
}

function calculateDistance4(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}
function toRad(n) {
    return n * Math.PI / 180;
}
function toDegrees(n) {
    return n * 180 / Math.PI;
}

function calculateBearing(A, B)
{
    return calculateBearing4(A.latitude, A.longitude, B.latitude, B.longitude);
}

function calculateBearing4(lat1, lon1, lat2, lon2) {
    var phi1 = toRad(lat1);
    var phi2 = toRad(lat2);
    var lam1 = toRad(lon1);
    var lam2 = toRad(lon2);
    var dLon = toRad(lon2 - lon1);
    var dLat = toRad(lat2 - lat1);
    var y = Math.sin(dLon) * Math.cos(phi2);
    var x = Math.cos(phi1)*Math.sin(phi2) -
        Math.sin(phi1)*Math.cos(phi2)*Math.cos(dLon);
    var brng = toDegrees(Math.atan2(y, x));
    return brng;
}

function convertBearingToText(b) {
    if (b < 45 || b > 315) {
        return "N";
    }
    if (b >= 45 && b < 135) {
        return "E";
    }
    if (b >= 135 && b < 225) {
        return "S";
    }
    if (b >= 225 && b < 315) {
        return "W";
    }
}

function drawSpeedChart(t) {
    var data = google.visualization.arrayToDataTable(t);

    var options = {
      title: 'Speed',
      curveType: 'function',
      legend: { position: 'bottom' }
    };

    var chart = new google.visualization.LineChart(document.getElementById('speed_chart'));

    chart.draw(data, options);
}

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawSpeedChart);

var app = angular.module("SpeedTracer", []);

app.controller("window", ["$scope", "$window", "$rootScope", function ($s, $w, $r) {
    $s.start = function() {
        if ($s.state == 0) {
            $r.$broadcast("start-tracer");
            $s.state = 1;
        }
    }
    $s.stop = function() {
        if ($s.state == 1) {
            $r.$broadcast("stop-tracer");
            $s.state = 0;
        }
    }
    $s.state = 0;
}]);

app.controller("trace", ["$scope", "$window", "$rootScope", "$interval", function($s, $w, $r, $i) {
    $s.distance = 0;
    $s.speed = 0;
    $s.direction = 0;
    var speedHistory = [];
    var location;
    function reset()
    {
        $s.distance = 0;
        $s.speed = 0;
        $s.direction = 0;
        location = undefined;
        write_index = 0;
    }
    function pushNewPosition(s, t)
    {
        speedHistory.push({
            s: s,
            t: new Date(t)
        });
        if (speedHistory.length > 128) {
            speedHistory.splice(0,1);
        }
    }
    function convertToTable() {
        var tw = [['Time', 'Speed']];
        var d = new Date();
        speedHistory.forEach(function(entry) {
            tw.push([entry.t, entry.s]);
        });
        return tw;
    }
    $r.$on("start-tracer", function() {
        trace = $i(function(){
            return new Promise(function(resolve, reject) {
                navigator.geolocation.getCurrentPosition(function(pos) {
                    resolve(pos);
                }, function(error) {
                    reject(error);
                }, {timeout: 2000, maximumAge: 0})
            }).then(function(pos) {
                if (location !== undefined)
                {
                    var d = calculateDistance(location.coords, pos.coords)*0.621371;
                    $s.distance += d;

                    // Now get the speed in MPH
                    var deltaTime = pos.timestamp - location.timestamp;
                    $s.speed = (d*3600000) / deltaTime;

                    // Now get the bearing
                    var brng = calculateBearing(location.coords, pos.coords);
                    $s.direction = convertBearingToText(brng);

                    pushNewPosition($s.speed, pos.timestamp);
                    drawSpeedChart(convertToTable());
                }
                location = pos;
                $s.$apply();
            });
        }, 5000);
    });
}]);
