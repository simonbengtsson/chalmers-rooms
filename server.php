<?php

const AJAX_BRIDGE = 'http://localhost:8082';

require_once('environment.php'); // Load default username and password

function getToken()
{
    $user = isset($_GET['user']) ? $_GET['user'] : $_ENV['defaultUser'];
    $pass = isset($_GET['password']) ? $_GET['password'] : $_ENV['defaultPassword'];

    $context = stream_context_create(['http' => [
        'follow_location' => 0,
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query([
            'url' => 'https://se.timeedit.net/web/chalmers/db1/b1',
            'method' => 'POST',
            'headers' => ['Content-Type' => "application/x-www-form-urlencoded", 'User-Agent' => 'chalmers.io'],
            'content' => "authServer=student&username=$user&password=$pass"
        ])
    ]]);
    $res = file_get_contents(AJAX_BRIDGE, false, $context);
    $headers = json_decode($res, true)['headers'];
    if(isset($headers['Set-Cookie'])) {
        $token = explode(';', json_decode($res, true)['headers']['Set-Cookie'])[0];
        return $token;
    } else {
        return false;
    }
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
        if(!$res) {
            http_response_code(401);
            $res = "Couldn't login";
        }
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