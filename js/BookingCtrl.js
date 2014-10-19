var app = angular.module('cgr');

app.controller('BookingCtrl', ['$scope', '$location', 'timeedit', 'ModelService', function ($scope, $location, timeedit, model) {

    $scope.bookings = [
        {
            room: {
                name: 'Test'
            },
            info: "info",
            time: 'time'
        }
    ];

    /**
     * After update, add event handlers to the dom again.
     */
    function addEventHandlersBookings() {
        $('.btn-confirmed-cancel').click(cancelBooking);
        $('.btn-confirm').click(createBooking);
        $('#login-form').submit(login);

        $('.btn-unconfirmed-cancel').click(function () {
            $(this).parent().parent().removeClass('unconfirmed');
            $(this).parent().parent().addClass('empty');
        });

        $('.btn-inc').click(function () {
            var $dur = $(this).siblings('.duration');
            var val = parseInt($dur.text());
            if (val < MAX_BOOKING_COUNT) {
                $dur.text((val + 1) + 'h');
            }
        });

        $('.btn-dec').click(function () {
            var $dur = $(this).siblings('.duration');
            var val = parseInt($dur.text());
            if (val > 1) {
                $dur.text((val - 1) + 'h');
            }
        });
    }
}]);