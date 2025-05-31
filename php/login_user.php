<?php
header('Content-Type: application/json');

// Get JSON input
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid request data"]);
    exit;
}

// Validate required fields
if (empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Username and password are required"]);
    exit;
}

$usersFile = '../data/users.json';

// Check if users file exists
if (!file_exists($usersFile)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Load users
$users = json_decode(file_get_contents($usersFile), true);

if (!$users) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error"]);
    exit;
}

$username = $data['username'];
$password = $data['password']; // Already hashed from client

// Check if user exists
if (!isset($users[$username])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "User not found"]);
    exit;
}

// Verify password
if ($users[$username]['password'] !== $password) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid password"]);
    exit;
}

// Login successful
echo json_encode([
    "status" => "success", 
    "message" => "Login successful",
    "user" => [
        "username" => $username,
        "email" => $users[$username]['email']
    ]
]);
?>