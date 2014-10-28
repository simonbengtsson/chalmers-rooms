var app = angular.module('cgr');

app.service('timeedit', ['$http', '$q', 'ModelService', function ($http, $q, model) {

    var MAX_BOOKING_COUNT = 4;
    var BASE_URL = 'https://se.timeedit.net/web/chalmers/db1/b1';

    var self = this;
    var devToken = null;
    var roomsUpdated = localStorage.getItem('roomsUpdated');
    var allRooms = localStorage.getItem('rooms') ? JSON.parse(localStorage.getItem('rooms')) : '';

    /**
     * Send ajax request to TimeEdit via AjaxBridge
     *
     * @param url The url to connect to
     * @param [method=GET] The http method
     * @param [additionalHeaders=[]] Any additional headers to be merged with the default ones
     * @param [content=''] The http content
     * @param [refreshTokenOnFailure=false]
     * @param [userAuth=false]
     * @returns promise
     */
    var ajax = function (url, method, additionalHeaders, content, refreshTokenOnFailure, userAuth) {
        method = method || 'GET';
        additionalHeaders = additionalHeaders || {};
        content = content || '';
        refreshTokenOnFailure = refreshTokenOnFailure !== false;
        userAuth = userAuth || false;


        var headers = {
            'User-Agent': 'chalmers.io',
            'Cookie': userAuth ? model.userAuth : devToken
        };
        Object.keys(additionalHeaders).forEach(function (key) {
            headers[key] = additionalHeaders[key];
        });

        var data = {
            url: url,
            method: method,
            headers: headers,
            content: content
        };

        var deferred = $q.defer();

        $http.post('http://localhost:8080', data).then(function (res) {
            res = res.data;

            // Stored token OK
            if (res.status >= 200 && res.status < 400) {
                deferred.resolve(res);
            }

            // Try refresh of token
            else if (res.status === 412 && refreshTokenOnFailure) {
                var promise = userAuth ? self.login(localStorage.getItem('user'), localStorage.getItem('password'), refreshTokenOnFailure) : refreshDevToken();
                promise.then(function () {
                    console.log(userAuth);
                    // Try same request again
                    ajax(url, method, additionalHeaders, content, false, userAuth).then(function (res) {
                        deferred.resolve(res);
                    }, function (res) {
                        deferred.reject(res);
                    });
                })
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
            devToken = res.data;
            deferred.resolve('Success');
        }, function (res, error) {
            deferred.reject("Couldn't login to timeedit, error: " + error);
        });

        return deferred.promise;
    };

    /**
     * Login with the provided credentials
     *
     * @param user
     * @param pass
     * @param refreshOnFailure
     * @returns promise
     */
    this.login = function (user, pass, refreshOnFailure) {
        refreshOnFailure = refreshOnFailure !== false;
        var deferred = $q.defer();

        var content = 'authServer=student&username=' + user + '&password=' + pass;
        var headers = {"Content-Type": "application/x-www-form-urlencoded"};

        ajax(BASE_URL, 'POST', headers, content, refreshOnFailure, true).then(function (res) {
            model.userToken = res.headers['Set-Cookie'].split(';')[0];
            deferred.resolve();
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    this.isLoggedIn = function () {
        return ajax('https://se.timeedit.net/web/chalmers/db1/b1', 'GET', [], '', true, true);
    };

    /**
     * Fetch all rooms
     *
     * @returns promise
     */
    this.fetchAllRooms = function () {
        var deferred = $q.defer();

        var allRoomsUrl = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.html?fr=t&partajax=t&im=f&add=f&sid=1002&l=sv_SE&step=1&grp=5&types=186';
        ajax(allRoomsUrl).then(function (res) {

            res = res.content;

            var ids = parseRooms(res);
            var rooms = [];
            var promises = [];
            for (var i = 0; i < ids.length; i++) {
                var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects/' + ids[i] + '/o.json?fr=t&sid=1002';
                promises.push(ajax(url));
            }
            $q.all(promises).then(function (res) {
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

    /**
     * Fetch vacant rooms the specified time
     *
     * @param date
     * @param hour
     * @param duration
     * @returns promise
     */
    this.fetchAvailableRooms = function (date, hour, duration) {
        var deferred = $q.defer();

        var url = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.html?partajax=t&sid=1002&step=1&types=186&dates=';
        url += date + '-'.date + '&starttime=' + hour + '%3A00&endtime=' + (hour + duration) + '%3A00';

        ajax(url).then(function (res) {
            deferred.resolve(parseRooms(res.content));
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

    this.createBooking = function (date, hour) {

    };

    /**
     * Fetch all bookings for the current user
     *
     * @returns promise
     */
    this.fetchBookings = function () {
        var deferred = $q.defer();

        ajax('https://se.timeedit.net/web/chalmers/db1/b1/my.html/o.json', 'GET', [], '', true, true).then(function (res) {
            var bookings = {};
            JSON.parse(res.content).reservations.forEach(function (raw) {
                bookings[raw.id] = {
                    id: raw.id,
                    room: raw.columns[0],
                    date: raw.startdate,
                    time: raw.starttime + ' - ' + raw.endtime
                };
            });
            deferred.resolve(bookings);
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    /**
     * Cancel a booking
     *
     * @param id Booking id
     * @returns promise
     */
    this.cancelBooking = function (id) {
        var deferred = $q.defer();

        ajax('https://se.timeedit.net/web/chalmers/db1/b1/r.html?id=' + id, 'DELETE', [], '', true, true).then(function (res) {
            deferred.resolve(res.content);
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
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
                self.fetchAllRooms().then(function (res) {
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

    var isRoomsFresh = function (time) {
        var oneWeek = 1000 * 3600 * 24 * 7;
        var diff = time - (new Date()).getTime();
        return diff < oneWeek;
    };

}]);