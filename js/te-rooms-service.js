var app = angular.module('cgr');

app.service('teRooms', ['$http', '$q', 'ModelService', function ($http, $q, model) {

    var MAX_BOOKING_COUNT = 4;
    var BASE_URL = 'https://se.timeedit.net/web/chalmers/db1/b1';
    var AJAX_BRIDGE_URL = "https://ajax-bridge.appspot.com";

    var self = this;
    var roomsUpdated = localStorage.getItem('roomsUpdated');
    var allRooms = localStorage.getItem('allRooms') ? JSON.parse(localStorage.getItem('rooms')) : '';

    /**
     * Send ajax request to TimeEdit via AjaxBridge
     *
     * @param url The url to connect to
     * @param [method=GET] The http method
     * @param [refreshTokenOnFailure=false]
     * @returns promise
     */
    var ajax = function (url, method, refreshTokenOnFailure) {
        method = method || 'GET';
        refreshTokenOnFailure = refreshTokenOnFailure !== false;

        var data = {
            url: url,
            method: method,
            headers: {
                'User-Agent': 'chalmers.io',
                'Cookie': localStorage.getItem('devToken')
            },
            content: ''
        };

        data = $.param(data);

        var deferred = $q.defer();

        $http.post(AJAX_BRIDGE_URL, data, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).then(function (res) {
            res = res.data;

            // Stored token OK
            if (res.status >= 200 && res.status < 400) {
                deferred.resolve(res);
            }

            // Try refresh of token
            else if (res.status === 412 && refreshTokenOnFailure) {
                refreshDevToken().then(function () {
                    // Try same request again
                    ajax(url, method, false).then(function (res) {
                        deferred.resolve(res);
                    }, function (res) {
                        deferred.reject(res);
                    });
                }, function (res) {
                    console.error(res);
                });
            } else {
                deferred.reject(res);
            }

        }, function (res, error) {
            deferred.reject("Couldn't connect to AjaxBridge, error: " + error);
        });

        return deferred.promise;
    };

    var refreshDevToken = function () {
        var deferred = $q.defer();

        $http.get('/server.php?action=login').then(function (res) {
            localStorage.setItem('devToken', res.data);
            deferred.resolve('Success');
        }, function (res, error) {
            deferred.reject("Couldn't login to timeedit, error: " + error);
        });

        return deferred.promise;
    };

    this.getAvailableRooms = function (allRooms, date, hour) {
        var deferred = $q.defer();

        var promises = [];
        for (var i = 1; i <= 4; i++) {
            promises.push(fetchAvailableRooms(date, hour, i));
        }

        $q.all(promises).then(function (res) {
            var rooms = {};

            res.forEach(function (ids, index) {
                ids.forEach(function (id) {
                    if (allRooms[id]) {
                        rooms[id] = allRooms[id];
                        rooms[id].vacantTime = index + 1;
                    }
                });
            });

            deferred.resolve(model.groupInBuildings(rooms));
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    /**
     * Fetch vacant rooms the specified time
     *
     * @param date
     * @param hour
     * @param duration
     * @returns promise
     */
    var fetchAvailableRooms = function (date, hour, duration) {
        var deferred = $q.defer();

        var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.json?part=t&step=1&types=186&dates=';
        url += date + '-' + date + '&starttime=' + hour + ':0&endtime=' + (hour + duration) + ':0';

        ajax(url).then(function (res) {
            deferred.resolve(parseJsonRooms(res.content));
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    var parseJsonRooms = function (json) {
        var raw = JSON.parse(json);
        var roomIds = [];
        if (typeof raw == 'object' && raw !== null) {
            raw.objects.forEach(function (obj) {
                roomIds.push(obj.id);
            });
        }
        return roomIds;
    };

    /**
     * Get complete info for all rooms
     *
     * @returns promise
     */
    this.getAllRooms = function () {
        return $q(function (resolve, reject) {

            var rooms = JSON.parse(localStorage.getItem('allRooms'));
            var time = parseInt(localStorage.getItem('roomsUpdated'));

            if (!(rooms && time && isRoomsFresh(time))) {
                fetchAllRooms().then(function (res) {
                    localStorage.setItem('allRooms', JSON.stringify(res));
                    localStorage.setItem('roomsUpdated', (new Date()).getTime());
                    resolve(res);
                }, function (res) {
                    reject(res);
                });
            } else {
                resolve(rooms);
            }

        });
    };

    /**
     * Fetch all rooms
     *
     * @returns promise
     */
    var fetchAllRooms = function () {
        var deferred = $q.defer();

        var allRoomsUrl = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.html?fr=t&partajax=t&im=f&add=f&sid=1002&l=sv_SE&step=1&grp=5&types=186';
        ajax(allRoomsUrl).then(function (res) {

            res = res.content;

            var ids = parseRooms(res);
            var promises = [];
            for (var i = 0; i < ids.length; i++) {
                var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects/' + ids[i] + '/o.json?fr=t&sid=1002';
                promises.push(ajax(url));
            }
            $q.all(promises).then(function (res) {
                var rooms = {};
                res.forEach(function (json, index) {
                    json = json.content;
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

    var parseRooms = function (html) {
        var roomIds = [];
        $('<div>' + html + '</div>').find('.searchObject').each(function (i, elem) {
            roomIds.push(elem.getAttribute('data-idonly'))
        });
        return roomIds;
    };

    var isRoomsFresh = function (time) {
        var oneWeek = 1000 * 3600 * 24 * 7;
        var diff = time - (new Date()).getTime();
        return diff < oneWeek;
    };

}]);