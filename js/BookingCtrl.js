var app = angular.module('cgr');

app.controller('BookingCtrl', ['$scope', '$location', 'ModelService', '$timeout', 'teRooms', 'teBookings', function ($scope, $location, model, $timeout, teRooms, teBookings) {

    $scope.bookings = {};

    teBookings.fetchBookings().then(function (bookings) {
        $scope.bookings = bookings;
    });

    $scope.cancelBooking = function (id) {
        teBookings.cancelBooking(id).then(function (res) {
            delete $scope.bookings[id];
        });
    };

    $scope.createBooking = function (room) {
        teBookings.createBooking(room).then(function (res) {
            if(res.status === 303) {
                model.chosenRoom = null;
                teBookings.fetchBookings().then(function (bookings) {
                    $scope.bookings = bookings;
                });
            }
        });
    };

    $scope.roomInfo = function(room) {
        if(!room) return '';
        var arr = [room.building, room.equipment, room.type];
        for(var i = 0; i < arr.length; i++) {
            if(!arr[i]) arr.splice(i, 1);
        }
        return arr.join(", ");
    };

    $scope.roomDateTime = function() {
        if(!model.chosenRoom) return '';
        return model.chosenRoom.date + model.chosenRoom.startHour + ':00 - ' + model.chosenRoom.endHour + ':00';
    };

    $scope.bookingsLength = function () {
        return Object.keys($scope.bookings).length;
    };

    $scope.booking = function (index) {
        return $scope.bookings[Object.keys($scope.bookings)[index]];
    };
}]);