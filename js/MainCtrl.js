var app = angular.module('cgr');

app.controller('MainCtrl', ['$scope', '$location', '$timeout', 'ModelService', 'teRooms', 'teBookings', function ($scope, $location, $timeout, model, teRooms, teBookings) {

    $scope.test = {};
    $scope.test.status = 'Status2';

    $scope.model = model;

    $scope.logout = function() {
        model.userToken = '';
        localStorage.removeItem('user');
        localStorage.removeItem('password');
        $location.path('/');
    };

    $scope.showStatus = function(msg) {
        $scope.status = msg;
        $timeout(function() {
            $scope.status = 'Reset';
        }, 2000);
    };

    $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };

    /*$scope.range = function(to){
        var range = [];
        for(var i = 0; i < to; i++)
            range.push(i);
        return range;
    }*/


}]);