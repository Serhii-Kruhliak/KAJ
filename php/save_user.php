<?php
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
    exit;
}

$usersFile = '../data/users.json';
$users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];

$username = $data['username'];
if (isset($users[$username])) {
    http_response_code(409);
    echo json_encode(["status" => "error", "message" => "Username exists"]);
    exit;
}

$users[$username] = [
    "email" => $data["email"],
    "password" => $data["password"] // hashed!
];

file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
echo json_encode(["status" => "success"]);
?>