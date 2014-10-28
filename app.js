var app = angular.module('cgr', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {

    function auth($location, $q, model, teBookings) {
        var deferred = $q.defer();

        teBookings.isLoggedIn().then(function() {
            console.log('log');
            deferred.resolve();
        }, function() {
            console.log('log');
            deferred.reject();
            $location.path('/login');
        });

        return deferred.promise;
    }

    $routeProvider
        .when('/bookings', {
            templateUrl: 'partials/bookings.html',
            controller: 'BookingCtrl',
            resolve: {
                auth: ['$location', '$q', 'ModelService', 'teBookings', auth]
            }
        })
        .when('/login', {
            templateUrl: 'partials/login.html',
            controller: ['$scope', 'ModelService', 'teBookings', '$location', function ($scope, model, teBookings, $location) {
                $scope.loginError = '';
                $scope.login = function() {
                    if($scope.user && $scope.password) {
                        teBookings.refreshUserToken($scope.user, $scope.password).then(function() {
                            localStorage.setItem('user', $scope.user);
                            localStorage.setItem('password', $scope.password);
                            $scope.user = '';
                            $scope.password = '';
                            $location.path('/bookings');
                            $scope.loginError = '';
                        }, function(res) {
                            $scope.loginError = 'Oops! Wrong CID password';
                        });
                    } else {
                        $scope.loginError = 'CID or password missing';
                    }
                }
            }]
        })
        .when('/', {
            templateUrl: 'partials/rooms.html',
            controller: 'RoomCtrl'
        });
}]);