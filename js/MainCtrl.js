var app = angular.module('cgr');

app.controller('MainCtrl', ['$scope', '$location', 'timeedit', '$timeout', function ($scope, $location, timeedit, $timeout) {

    $scope.test = {};
    $scope.test.status = 'Status2';

    $scope.user = null;
    $scope.pass = null;

    $scope.logout = function() {
        console.log('logout');
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

}]);