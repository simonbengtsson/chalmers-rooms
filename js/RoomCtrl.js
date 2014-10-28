var app = angular.module('cgr');

app.controller('RoomCtrl', ['$scope', '$location', 'UtilsService', '$q', 'ModelService', 'teRooms', 'teBookings', function ($scope, $location, utils, $q, model, teRooms, teBookings) {

    $scope.buildings = {};

    // Chalmers rules
    var MAX_BOOKING_COUNT = 4;
    var MAX_TIME = 14 * 24 * 60 * 60 * 1000; // 14 days

    // Settings
    var MAX_HOUR = 16;
    var MIN_HOUR = 8;

    // Fields
    var picker; // Pick-a-date instance
    var pickedHour; // Most recently picked hour

    var today = new Date();
    var $pickerInput = $("#inputdate").pickadate({
        format: 'd mmm',
        firstDay: 1,
        min: today,
        max: new Date(today.getTime() + MAX_TIME),
        clear: false,
        today: false,
        onSet: function () {
            pickedHour = MIN_HOUR;
            updateRooms();
        }
    });

    picker = $pickerInput.pickadate('picker');

    /**
     * Go to booking page
     * @param room
     */
    $scope.book = function (room) {
        room.startHour = pickedHour;
        room.endHour = pickedHour + room.vacantTime;
        room.date = picker.get('select', 'yyyymmdd');
        model.chosenRoom = room;
        $location.path('/bookings');
    };

    /**
     * Fetch available rooms and bookings from TimeEdit
     */
    var updateRooms = function () {
        updateHours();
        var hour = parseInt($('.timebar').find('.time-btn.active').text());
        var date = picker.get('select', 'yyyymmdd');

        teRooms.getAllRooms().then(function (allRooms) {
            teRooms.getAvailableRooms(allRooms, date, hour).then(function(buildings) {
                $scope.buildings = buildings;
            });
        }, function (res) {
            console.error('error', res);
        });
    };

    /**
     * Update the time bar with the right set of hours
     */
    var updateHours = function () {
        var html = '';

        var currentHour = new Date().getHours();
        var currentDay = new Date().getDate();
        var pickedDay = parseInt(picker.get('select', 'dd'));

        // If no hour has been picked, initialize default value
        if (typeof pickedHour === 'undefined') {
            if (currentDay === pickedDay) {
                pickedHour = currentHour;
            } else {
                pickedHour = MIN_HOUR;
            }
        }

        // Set picked hour to current hour if current hour is outside supported range
        if (currentDay == pickedDay) {
            if (currentHour > MAX_HOUR || currentHour < MIN_HOUR) {
                pickedHour = currentHour;
            }
        }

        // Add a new box if current hour is less than min hour and today is chosen
        if (currentDay == pickedDay && currentHour < MIN_HOUR) {
            html += '<label class="btn time-btn active">';
            html += '<input type="radio" name="options">';
            html += utils.pad(currentHour, 2) + ':00';
            html += '</label>';
        }

        // Collect html
        for (var hour = MIN_HOUR; hour <= MAX_HOUR; hour++) {

            if (currentDay === pickedDay && hour < currentHour) {
                html += '<label class="btn time-btn disabled">';
            } else if (hour === pickedHour) {
                html += '<label class="btn time-btn active">';
            } else {
                html += '<label class="btn time-btn">';
            }

            html += '<input type="radio" name="options">';
            html += utils.pad(hour, 2) + ':00';
            html += '</label>';
        }

        // Add a new box if current hour is more than max hour and today is chosen
        if (currentDay == pickedDay && currentHour > MAX_HOUR) {
            html += '<label class="btn time-btn active">';
            html += '<input type="radio" name="options">';
            html += utils.pad(currentHour, 2) + ':00';
            html += '</label>';
        }


        // Set the html and click listeners
        var $hoursCont = $('.hours-cont');
        $hoursCont.unbind().html(html).children().not('.disabled').click(function () {
            pickedHour = parseInt($(this).text());
            updateRooms();
        });

        // Scroll right if picked hour is more than 12
        if (pickedHour > 12) {
            $hoursCont.scrollLeft(400);
        }
    };

    updateRooms();

}]);