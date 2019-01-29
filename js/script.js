
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
    var location, trace;
    var svg=d3.select("svg");
    var g=svg.append("g").attr("transform","translate(172.5,150)");
    var domain = [0,100];

    var gg = viz.gg()
      .domain(domain)
      .outerRadius(150)
      .innerRadius(30)
      .value(0.5*(domain[1]+domain[0]))
      .duration(500);

    gg.defs(svg);
    g.call(gg);

    d3.select(self.frameElement).style("height", "700px");
    function reset()
    {
        $s.distance = 0;
        $s.speed = 0;
        $s.direction = 0;
        location = undefined;
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
                    gg.setNeedle($s.speed);

                    // Now get the bearing
                    var brng = calculateBearing(location.coords, pos.coords);
                    $s.direction = convertBearingToText(brng);
                }
                location = pos;
            });
        }, 5000);
    });
}]);
