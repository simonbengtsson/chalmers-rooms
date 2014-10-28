var app = angular.module('cgr');

app.service('ModelService', ['$http', '$q', function ($http, $q) {

    // The last chosen room the user wanted to book
    this.chosenRoom = null;

    this.user = null;
    this.userToken = null;

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