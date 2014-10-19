var app = angular.module('cgr');

app.service('UtilsService', [function () {

    this.showToast = function (str) {
        $('#toast').text(str).fadeIn('fast');
        setTimeout(function () {
            $('#toast').fadeOut('fast');
        }, 4000);
    };

    this.pad = function (n, width) {
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
    };

    this.find = function(myArray, searchTerm, property) {
        for(var i = 0, len = myArray.length; i < len; i++) {
            if (myArray[i][property] === searchTerm) return i;
        }
        return -1;
    }

}]);