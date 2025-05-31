<?php
// Disable all caching
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Add debug logging
error_log("Leaderboard requested at: " . date('Y-m-d H:i:s'));
error_log("Limit parameter: " . ($_GET['limit'] ?? 'not set'));

try {
    // Get limit parameter (default to 10, max 100)
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $limit = max(1, min($limit, 100)); // Ensure limit is between 1 and 100
    
    $leaderboard_file = '../data/leaderboard.json';
    
    // Check if leaderboard file exists
    if (!file_exists($leaderboard_file)) {
        echo json_encode([
            'status' => 'success',
            'leaderboard' => [],
            'total_count' => 0,
            'message' => 'No scores recorded yet'
        ]);
        exit();
    }
    
    // Load leaderboard data
    $json_data = file_get_contents($leaderboard_file);
    $leaderboard = json_decode($json_data, true);
    
    if ($leaderboard === null) {
        throw new Exception('Failed to parse leaderboard data');
    }
    
    // Sort by score (descending) and then by time survived (ascending for tiebreaker)
    usort($leaderboard, function($a, $b) {
        if ($a['score'] === $b['score']) {
            return $a['time_survived'] <=> $b['time_survived'];
        }
        return $b['score'] <=> $a['score'];
    });
    
    $total_count = count($leaderboard);
    
    // Apply limit
    $limited_leaderboard = array_slice($leaderboard, 0, $limit);
    
    // Format the response data
    $formatted_leaderboard = [];
    foreach ($limited_leaderboard as $index => $score) {
        $formatted_leaderboard[] = [
            'rank' => $index + 1,
            'username' => $score['username'],
            'score' => intval($score['score']),
            'time_survived' => intval($score['time_survived']),
            'timestamp' => $score['timestamp'] ?? $score['date_added'] ?? '',
            'date_formatted' => isset($score['date_added']) ? 
                date('M j, Y', strtotime($score['date_added'])) : 
                (isset($score['timestamp']) ? date('M j, Y', strtotime($score['timestamp'])) : 'Unknown')
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'leaderboard' => $formatted_leaderboard,
        'total_count' => $total_count,
        'limit' => $limit,
        'showing' => count($formatted_leaderboard)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'leaderboard' => []
    ]);
}
?>