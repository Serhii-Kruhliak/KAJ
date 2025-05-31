<?php
// php/save_score.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    $required_fields = ['username', 'score', 'time_survived'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $username = trim($input['username']);
    $score = intval($input['score']);
    $time_survived = intval($input['time_survived']);
    $timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('c');
    
    // Validate data
    if (empty($username)) {
        throw new Exception('Username cannot be empty');
    }
    
    if ($score < 0) {
        throw new Exception('Score cannot be negative');
    }
    
    if ($time_survived < 0) {
        throw new Exception('Time survived cannot be negative');
    }
    
    // Load existing leaderboard
    $leaderboard_file = '../data/leaderboard.json';
    $leaderboard = [];
    
    // Create data directory if it doesn't exist
    if (!file_exists('data')) {
        mkdir('data', 0755, true);
    }
    
    // Load existing scores
    if (file_exists($leaderboard_file)) {
        $json_data = file_get_contents($leaderboard_file);
        $leaderboard = json_decode($json_data, true) ?? [];
    }
    
    // Create new score entry
    $new_score = [
        'username' => $username,
        'score' => $score,
        'time_survived' => $time_survived,
        'timestamp' => $timestamp,
        'date_added' => date('Y-m-d H:i:s')
    ];
    
    // Check if this is a high score for this user
    $user_best_score = 0;
    $user_score_index = -1;
    
    foreach ($leaderboard as $index => $existing_score) {
        if ($existing_score['username'] === $username) {
            if ($existing_score['score'] > $user_best_score) {
                $user_best_score = $existing_score['score'];
                $user_score_index = $index;
            }
        }
    }
    
    // Only save if this is better than the user's previous best score
    if ($score > $user_best_score) {
        // Remove previous best score if exists
        if ($user_score_index >= 0) {
            array_splice($leaderboard, $user_score_index, 1);
        }
        
        // Add new score
        $leaderboard[] = $new_score;
        
        // Sort by score (descending) and then by time survived (ascending for tiebreaker)
        usort($leaderboard, function($a, $b) {
            if ($a['score'] === $b['score']) {
                return $a['time_survived'] <=> $b['time_survived'];
            }
            return $b['score'] <=> $a['score'];
        });
        
        // Keep only top 100 scores
        $leaderboard = array_slice($leaderboard, 0, 100);
        
        // Save back to file
        if (file_put_contents($leaderboard_file, json_encode($leaderboard, JSON_PRETTY_PRINT)) === false) {
            throw new Exception('Failed to save leaderboard data');
        }
        
        // Find the rank of the new score
        $rank = 0;
        foreach ($leaderboard as $index => $entry) {
            if ($entry['username'] === $username && $entry['score'] === $score) {
                $rank = $index + 1;
                break;
            }
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Score saved successfully',
            'is_high_score' => true,
            'rank' => $rank,
            'total_scores' => count($leaderboard)
        ]);
        
    } else {
        // Score not high enough to save
        echo json_encode([
            'status' => 'success',
            'message' => 'Score received but not high enough for leaderboard',
            'is_high_score' => false,
            'user_best_score' => $user_best_score
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>