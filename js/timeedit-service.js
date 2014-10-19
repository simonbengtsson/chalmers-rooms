var app = angular.module('cgr');

app.service('timeedit', ['$http', '$q', function ($http, $q) {

    var MAX_BOOKING_COUNT = 4;
    var BASE_URL = 'https://se.timeedit.net/web/chalmers/db1/b1';

    var self = this;
    var devToken = null;
    var userToken = localStorage.getItem('userToken');
    var roomsUpdated = localStorage.getItem('roomsUpdated');
    var allRooms = localStorage.getItem('rooms') ? JSON.parse(localStorage.getItem('rooms')) : '';

    var token = function () {
        return userToken ? userToken : devToken;
    };

    var ajax = function (url, method, token, content, secondTry) {
        method = method || 'GET';
        token = devToken;
        content = content || '';
        secondTry = secondTry || false;

        return $q(function (resolve, reject) {
            $http({
                url: 'http://localhost:8080',
                method: 'POST',
                data: {
                    url: url,
                    method: method,
                    headers: {
                        'User-Agent': 'chalmers.io',
                        'Cookie': devToken
                    },
                    content: content
                }
            }).then(function (res) {
                res = res.data;
                if (res.status >= 200 && res.status < 400) {
                    resolve(res.content);
                } else if (res.status === 412 && !secondTry) {
                    $http.get('/server.php?action=login').then(function (res) {
                        devToken = res.data;
                        ajax(url, method, token, content, true).then(function (res) {
                            resolve(res);
                        }, function (res) {
                            reject(res);
                        });
                    }, function (res, error) {
                        reject("Couldn't login to timeedit, error: " + error);
                    });
                } else {
                    reject("Couldn't connect to timeedit");
                }
            }, function (res, error) {
                reject("Couldn't connect to AjaxBridge, error: " + error);
            });
        });
    };

    this.fetchAllRooms = function () {
        var deferred = $q.defer();

        var allRoomsUrl = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.html?fr=t&partajax=t&im=f&add=f&sid=1002&l=sv_SE&step=1&grp=5&types=186';
        ajax(allRoomsUrl).then(function (res) {

            var ids = parseRooms(res);
            var rooms = [];
            var promises = [];
            for (var i = 0; i < ids.length; i++) {
                var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects/' + ids[i] + '/o.json?fr=t&sid=1002';
                promises.push(ajax(url));
            }
            $q.all(promises).then(function (res) {
                res.forEach(function (json, index) {
                    var info = JSON.parse(json);
                    rooms[ids[index]] = {
                        id: ids[index],
                        name: info['ID'],
                        building: info['Byggnad'],
                        equipment: info['Utrustning'],
                        type: info['Lokaltyp']
                    };
                });
                deferred.resolve(rooms);
            }, function (res) {
                deferred.reject(res);
            })
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    this.fetchAvailableRooms = function (date, hour, duration) {
        var deferred = $q.defer();

        var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.html?partajax=t&sid=1002&step=1&types=186&dates=';
        url += date + '-'.date + '&starttime=' + hour + '%3A00&endtime=' + (hour + duration) + '%3A00';

        ajax(url).then(function (html) {
            deferred.resolve(parseRooms(html));
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    /**
     * Parse room html page to js objects
     * @param html
     * @returns {Array} Room ids
     */
    var parseRooms = function (html) {
        var roomIds = [];
        $('<div>' + html + '</div>').find('.searchObject').each(function (i, elem) {
            roomIds.push(elem.getAttribute('data-idonly'))
        });
        return roomIds;

    };

    var test = function () {
        var content = 'authServer=student&username=' + user + '&password=' + pass;
        ajax(BASE_URL, 'POST', {"Content-Type": "application/x-www-form-urlencoded"}, content).then(function (res) {
            devToken = res.headers['Set-Cookie'].split(';')[0];
            callback();
        });

    }
}]);