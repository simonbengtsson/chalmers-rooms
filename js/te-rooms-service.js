var app = angular.module('cgr');

app.service('teRooms', ['$http', '$q', 'ModelService', function ($http, $q, model) {

    /**
     * Get complete info for all rooms
     *
     * @returns promise
     */
    this.getAllRooms = function () {
        return $q(function (resolve, reject) {

            var rooms = JSON.parse(localStorage.getItem('allRooms'));
            var time = parseInt(localStorage.getItem('roomsUpdated'));

            if (!rooms || !time || !areRoomsFresh(time)) {
                console.log('Fetching all rooms')
                $http.get('/server.php?action=fetchRooms').then(function (res) {
                    localStorage.setItem('allRooms', JSON.stringify(res.data));
                    localStorage.setItem('roomsUpdated', new Date().getTime());
                    resolve(res.data);
                }).catch(function (err) {
                    reject(err);
                });
            } else {
                resolve(rooms);
            }

        });
    };

    var areRoomsFresh = function (time) {
        var oneWeek = 1000 * 3600 * 24 * 7;
        var diff = time - (new Date()).getTime();
        return diff < oneWeek;
    };

    this.getAvailableRooms = function (allRooms, date, hour) {
        var deferred = $q.defer();

        var promises = [];
        for (var i = 1; i <= 4; i++) {
            promises.push(fetchAvailableRooms(date, hour, i));
        }

        console.log('Fetching available')
        $q.all(promises).then(function (res) {
            var rooms = {};

            console.log('Available fetched')

            res.forEach(function (ids, index) {
                ids.forEach(function (id) {
                    if (allRooms[id]) {
                        rooms[id] = allRooms[id];
                        rooms[id].vacantTime = index + 1;
                    }
                });
            });

            let grouped = model.groupInBuildings(rooms)
            deferred.resolve(grouped);
        }, function (res) {
            deferred.reject(res);
        });

        return deferred.promise;
    };

    var refreshDevToken = function () {
        var deferred = $q.defer();

        $http.get('/server.php?action=login').then(function (res) {
            console.log("Logged in: " + res.data);
            localStorage.setItem('devToken', res.data);
            deferred.resolve('Success');
        }, function (res, error) {
            deferred.reject("Couldn't login to timeedit, error: " + error);
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
        let encodedUrl = encodeURIComponent(url)

        $http.get('/server.php?action=fetchAvailable&url=' + encodedUrl).then(function (res) {
            deferred.resolve(parseJsonRooms(res.data))
        }).catch(function(err) {
            console.log(err)
            deferred.reject(err)
        });

        return deferred.promise;
    };

    var parseJsonRooms = function (json) {
        var raw = JSON.parse(json);
        var roomIds = [];
        if (raw && raw.objects) {
            raw.objects.forEach(function (obj) {
                roomIds.push(obj.id);
            });
        }
        return roomIds;
    };

}]);