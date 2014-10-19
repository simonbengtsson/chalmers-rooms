<?php

require_once('environment.php'); // Load default username and password

function getToken()
{
    $context = stream_context_create(['http' => [
        'follow_location' => 0,
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query([
            'url' => 'https://se.timeedit.net/web/chalmers/db1/b1',
            'method' => 'POST',
            'headers' => ['Content-Type' => "application/x-www-form-urlencoded", 'User-Agent' => 'chalmers.io'],
            'content' => "authServer=student&username=$_ENV[defaultUser]&password=$_ENV[defaultPassword]"
        ])
    ]]);
    $res = file_get_contents('http://localhost:8080', false, $context);
    $token = explode(';', json_decode($res, true)['headers']['Set-Cookie'])[0];
    return $token;
}

function updateRooms()
{
    $rooms = json_decode(file_get_contents('php://input'));
    if ($rooms && sizeof($rooms)) {
        $data = [
            'roomsUpdated' => time(),
            'rooms' => $rooms
        ];
        file_put_contents('data.json', json_encode($data));
    }
}

switch (isset($_GET['action']) ? $_GET['action'] : 'none') {
    case 'updateRooms':
        updateRooms();
        $res = 'Rooms updated';
        break;
    case 'login':
        $res = getToken();
        break;
    case 'data':
        $data = file_exists('data.json') ? json_decode(file_get_contents('data.json'), true) : [];
        $res = [
            'devToken' => getToken(),
            'roomsUpdated' => isset($data['roomsUpdated']) ? $data['roomsUpdated'] : 0,
            'rooms' => isset($data->rooms) ? $data['rooms'] : [],
        ];
        break;
    default:
        $res = 'Not supported action';
        http_response_code(400);
        break;
}

if (!ob_get_contents()) {
    header('Content-Type: application/json');
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
    echo json_encode($res);
}