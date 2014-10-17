var app = angular.module('cgr', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/bookings', {
            templateUrl: 'partials/bookings.html',
            controller: 'MainCtrl'
        })
        .when('/', {
            templateUrl: 'partials/rooms.html',
            controller: 'MainCtrl'
        });
}]);

app.controller('MainCtrl', ['$scope', function ($scope) {
    $scope.hey = 'hey!';
}]);