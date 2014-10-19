var app = angular.module('cgr');

app.service('ModelService', ['$http', '$q', 'timeedit', function ($http, $q, timeedit) {

    // The last chosen room the user wanted to book
    this.chosenRoom = null;

    this.getAllRooms = function() {
        return $q(function(resolve, reject) {

            var rooms = JSON.parse(localStorage.getItem('allRooms'));
            var time = parseInt(localStorage.getItem('roomsUpdated'));

            if (!(rooms && time && isRoomsFresh(time))) {
                timeedit.fetchAllRooms().then(function (res) {
                    localStorage.setItem('allRooms', JSON.stringify(res));
                    localStorage.setItem('roomsUpdated', (new Date()).getTime());
                    resolve(res);
                }, function(res) {
                    reject(res);
                });
            } else {
                resolve(rooms);
            }

        });
    };

    var isRoomsFresh = function(time) {
        var oneWeek = 1000 * 3600 * 24 * 7;
        var diff = time - (new Date()).getTime();
        return diff < oneWeek;
    };

    /**
     * Group rooms in buildings
     *
     * @param rooms
     * @returns {{}}
     */
    this.groupInBuildings = function(rooms) {
        var buildings = {};
        Object.keys(rooms).forEach(function(key) {
            var room = rooms[key];
            if(!buildings[room.building]) {
                buildings[room.building] = [];
            }
            buildings[room.building].push(room);
        });
        return buildings;
    };

}]);