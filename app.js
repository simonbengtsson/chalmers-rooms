var app = angular.module('cgr', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/bookings', {
            templateUrl: 'partials/bookings.html',
            controller: 'BookingCtrl'
        })
        .when('/', {
            templateUrl: 'partials/rooms.html',
            controller: 'RoomCtrl'
        });
}]);