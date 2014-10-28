var app = angular.module('cgr');

app.service('teBookings', ['$http', '$q', 'ModelService', function ($http, $q, model) {

    var MAX_BOOKING_COUNT = 4;
    var AJAX_BRIDGE_URL = "https://ajax-bridge.appspot.com";

    var self = this;
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
     * @returns promise
     */
    var ajax = function (url, method, additionalHeaders, content, refreshTokenOnFailure) {
        method = method || 'GET';
        additionalHeaders = additionalHeaders || {};
        content = content || '';
        refreshTokenOnFailure = refreshTokenOnFailure !== false;


        var headers = {
            'User-Agent': 'chalmers.io',
            'Cookie': model.userToken
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

        $http.post(AJAX_BRIDGE_URL, data).then(function (res) {
            res = res.data;

            // Stored token OK
            if (res.status >= 200 && res.status < 400) {
                deferred.resolve(res);
            }

            // Try refresh of token
            else if (res.status === 412 && refreshTokenOnFailure) {
                var promise = self.refreshUserToken(localStorage.getItem('user'), localStorage.getItem('password'));
                promise.then(function () {
                    // Try same request again
                    ajax(url, method, additionalHeaders, content, false).then(function (res) {
                        deferred.resolve(res);
                    }, function (res) {
                        deferred.reject(res);
                    });
                }, function (res) {
                    deferred.reject(res);
                });
            } else {
                deferred.reject(res);
            }

        }, function (res, error) {
            deferred.reject("Couldn't connect to AjaxBridge, error: " + error);
        });

        return deferred.promise;
    };

    this.refreshUserToken = function (user, pass) {
        var deferred = $q.defer();

        $http.get('/server.php?action=login&user=' + user + '&password=' + pass).then(function (res) {
            console.log(res);
            model.userToken = res.data;
            deferred.resolve('Success');
        }, function (res, error) {
            deferred.reject("Couldn't login to timeedit, error: " + error);
        });

        return deferred.promise;
    };

    this.isLoggedIn = function () {
        return ajax('https://se.timeedit.net/web/chalmers/db1/b1');
    };

    this.createBooking = function (room) {
        var d = $q.defer();
        var headers = {'Content-Type': 'application/x-www-form-urlencoded'};
        var content = 'o=' + room.id  + '.186&o=203460.192&dates=' + room.date + '&starttime=' + room.startHour + '%3A00&endtime=' + room.endHour + '%3A00&url=none';
        console.log(content);
        ajax('https://se.timeedit.net/web/chalmers/db1/b1/ri1Q5008.html', 'POST', headers, content).then(function (res) {
            d.resolve(res);
        }, function (res) {
            d.reject(res);
        });
        return d.promise;
    };

    /**
     * Fetch all bookings for the current user
     *
     * @returns promise
     */
    this.fetchBookings = function () {
        var deferred = $q.defer();

        ajax('https://se.timeedit.net/web/chalmers/db1/b1/my.html/o.json').then(function (res) {
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

        ajax('https://se.timeedit.net/web/chalmers/db1/b1/r.html?id=' + id, 'DELETE').then(function (res) {
            deferred.resolve(res.content);
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

}]);