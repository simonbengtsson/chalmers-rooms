<?php

const AJAX_BRIDGE = 'https://ajax-bridge.appspot.com';

require_once('environment.php'); // Load default username and password

function dump($val) {
    highlight_string("<?php\n\$data =\n" . var_export($val, true) . ";\n?>");
}

function dd($val) {
    dump($val);
    die();
}

function getResponseHeaderString($header, $headerString) {
    $response = explode("\r\n", $headerString);
    $values = [];
    foreach ($response as $key => $r) {
        if (stripos($r, $header . ':') === 0) {
            list($headerName, $headerValue) = explode(":", $r, 2);
            array_push($values, trim($headerValue));
        }
    }
    return $values;
}

function getResponseHeader($header, $response) {
    $values = [];
    foreach ($response as $key => $r) {
        if (stripos($r, $header . ':') === 0) {
            list($headerName, $headerValue) = explode(":", $r, 2);
            array_push($values, trim($headerValue));
        }
    }
    return $values;
}

function str_replace_first($from, $to, $subject)
{
    $from = '/'.preg_quote($from, '/').'/';
    return preg_replace($from, $to, $subject, 1);
}

function getToken()
{
    $user = isset($_GET['user']) ? $_GET['user'] : $_ENV['defaultUser'];
    $pass = isset($_GET['password']) ? $_GET['password'] : $_ENV['defaultPassword'];

    $loginDomain = "https://idp.chalmers.se";
    $url = "https://se.timeedit.net/web/chalmers/db1/timeedit/sso/saml2";
    $content = file_get_contents($url);


    $xml = new DOMDocument();
    $xml->loadHTML($content);
    $form = $xml->getElementsByTagName('form')->item(0);

    $authUrl = $loginDomain . $form->getAttribute('action');

    $usernameInputName = 'ctl00$ContentPlaceHolder1$UsernameTextBox';
    $passwordInputName = 'ctl00$ContentPlaceHolder1$PasswordTextBox';

    $params = [];

    /** @var DOMNode $node */
    foreach ($form->getElementsByTagName('input') as $node) {
        $nameNode = $node->attributes->getNamedItem("name");
        $valueNode = $node->attributes->getNamedItem("value");

        if ($nameNode) {
            if ($nameNode->nodeValue === $usernameInputName) {
                $params[$nameNode->nodeValue] = $user;
            } else if ($nameNode->nodeValue === $passwordInputName) {
                $params[$nameNode->nodeValue] = $pass;
            } else {
                $params[$nameNode->nodeValue] = $valueNode->nodeValue;
            }
        }
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $authUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));  //Post Fields
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 1);

    $headers = [];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);

    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $header_size);
    $body = substr($response, $header_size);

    curl_close($ch);

    $cookies = getResponseHeaderString("Set-Cookie", $header);
    $cookieStr = array_reduce($cookies, function($carry, $elem) {
        if ($carry) {
            $carry .= "; ";
        }
        $cookie = explode(";", $elem)[0];
        return $carry . $cookie;
    }, "");

    $context = stream_context_create([
        'http' => [
            'header' => "Cookie: $cookieStr\r\n",
            'method'  => 'GET'
        ]
    ]);

    $location = getResponseHeader("Location", $http_response_header)[0];
    $location = str_replace_first(':443', '', $location);
    $result = file_get_contents($location, false, $context);

    if ($result === FALSE) {
        dd('ERROR 2!');
    }

    $cookies = getResponseHeader("Set-Cookie", $http_response_header);
    $cookieStr = array_reduce($cookies, function($carry, $elem) {
        if ($carry) {
            $carry .= "; ";
        }
        $cookie = explode(";", $elem)[0];
        return $carry . $cookie;
    }, $cookieStr);

    $context = stream_context_create([
        'http' => [
            'header' => "Cookie: $cookieStr\r\n",
            'method'  => 'GET'
        ]
    ]);
    $result = file_get_contents($location, false, $context);

    if ($result === FALSE) {
        dd('ERROR 3!');
    }

    $xml = new DOMDocument();
    $xml->loadHTML($result);
    $form = $xml->getElementsByTagName('form')->item(0);
    $actionUrl = $form->getAttribute('action');

    $params = [];
    /** @var DOMNode $node */
    foreach ($form->getElementsByTagName('input') as $node) {
        $nameNode = $node->attributes->getNamedItem("name");
        $valueNode = $node->attributes->getNamedItem("value");

        if ($nameNode) {
            $params[$nameNode->nodeValue] = $valueNode->nodeValue;
        }
    }

    $headers = [
        "User-Agent: chalmers.io"
    ];

    $postData = http_build_query($params);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $actionUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 1);

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);

    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $header_size);
    $body = substr($response, $header_size);

    curl_close($ch);

    $cookies = getResponseHeaderString("Set-Cookie", $header);

    // Should lookg something like TEwebchalmersdb1=410d9060f7d94441162e203b51f38f78-3058869567526894578
    $token = $cookie = explode(";", $cookies[0])[0];

    $roomUrl = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.json?part=t&step=1&types=186&dates=';
    $context = stream_context_create([
        'http' => [
            'header' => ["Cookie: $token", "User-Agent: chalmers.io"],
            'method'  => 'GET'
        ]
    ]);
    $result = file_get_contents($roomUrl, false, $context);

    return $token;
}

function fetchAllRooms()
{
    $token = getToken();
    $roomUrl = 'https://se.timeedit.net/web/chalmers/db1/b1/objects.json?max=50&fr=f&part=t&partajax=t&im=f&step=1&sid=1004&l=sv_SE&types=186&subtypes=186&uo=t&ff=t';
    $context = stream_context_create([
        'http' => [
            'header' => ["Cookie: $token", "User-Agent: chalmers.io"],
            'method'  => 'GET'
        ]
    ]);
    $result = file_get_contents($roomUrl, false, $context);

    $objectRooms = json_decode($result)->objects;

    $rooms = [];
    foreach ($objectRooms as $object) {
        $url = "https://se.timeedit.net/web/chalmers/db1/b1/objects/$object->id/o.json?fr=t&sid=1002";
        $context = stream_context_create([
            'http' => [
                'header' => ["Cookie: $token", "User-Agent: chalmers.io"],
                'method'  => 'GET'
            ]
        ]);
        $result = file_get_contents($url, false, $context);
        $roomObject = json_decode($result);
        $rooms[$object->id] = [
            "id" => $object->id,
            "short" => $roomObject->ID,
            "sign" => $roomObject->Lokalsignatur,
            "name" => $roomObject->Lokalnamn,
            "building" => $roomObject->Byggnad,
            "type" => $roomObject->Lokaltyp,
            "equipment" => $roomObject->Utrustning
        ];
    }

    return $rooms;
}

function fetchAvailable() {
    $token = getToken();
    $url = $_GET['url'];
    $context = stream_context_create([
        'http' => [
            'header' => ["Cookie: $token", "User-Agent: chalmers.io"],
            'method'  => 'GET'
        ]
    ]);
    $result = file_get_contents($url, false, $context);
    return $result;
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
    case 'fetchRooms':
        $res = fetchAllRooms();
        break;
    case 'fetchAvailable':
        $res = fetchAvailable();
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