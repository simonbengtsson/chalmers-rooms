var app = angular.module('cgr');

app.controller('BookingCtrl', ['$scope', '$location', 'ModelService', '$timeout', 'teRooms', 'teBookings', function ($scope, $location, model, $timeout, teRooms, teBookings) {

    $scope.bookings = {};

    teBookings.fetchBookings().then(function (bookings) {
        $scope.bookings = bookings;
    });

    $scope.cancelBooking = function (id) {
        console.log(id);
        teBookings.cancelBooking(id).then(function (res) {
            delete $scope.bookings[id];
        }, function (res) {
            console.error(res)
        });
    };

    $scope.createBooking = function () {
        console.log(model.chosenRoom);
        teBookings.cancelBooking(id).then(function (res) {
            delete $scope.bookings[id];
        }, function (res) {
            console.error(res)
        });
    };

    $scope.bookingsLength = function () {
        return Object.keys($scope.bookings).length;
    };

    $scope.booking = function (index) {
        return $scope.bookings[Object.keys($scope.bookings)[index]];
    };
}]);