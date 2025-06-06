/**
 * Leaderboard Class - Handles leaderboard display and interactions
 */
export class Leaderboard {
    constructor() {
        this.currentLimit = 10;
        this.maxLimit = 100;
        this.debugMode = false;
        this.lastFetchTime = null;
        this.init();
    }

    /**
     * Initialize the leaderboard
     */
    init() {
        this.loadLeaderboard();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for buttons
     */
    setupEventListeners() {
        // Load more button handler
        document.getElementById('load-more-btn').addEventListener('click', () => {
            this.loadLeaderboard(this.maxLimit);
        });

        // Force refresh button handler
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.forceRefresh();
        });

        // Debug toggle button handler
        document.getElementById('debug-btn').addEventListener('click', () => {
            this.toggleDebug();
        });
    }

    /**
     * Load leaderboard data from server
     * @param {number} limit - Number of scores to fetch
     * @param {boolean} forceRefresh - Force refresh ignoring cache
     */
    async loadLeaderboard(limit = this.currentLimit, forceRefresh = false) {
        try {
            this.showLoading();
            
            // Add cache-busting parameter to prevent caching issues
            const timestamp = forceRefresh ? Date.now() : Math.floor(Date.now() / 60000); // Cache for 1 minute unless forced
            const url = `php/get_leaderboard.php?limit=${limit}&_t=${timestamp}`;
            
            this.debug(`Fetching: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            this.debug(`Response status: ${response.status}`);
            this.debug(`Response headers: ${JSON.stringify([...response.headers.entries()])}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            this.debug(`Raw response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                this.debug(`JSON parse error: ${parseError.message}`);
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
            
            this.debug(`Parsed data: ${JSON.stringify(data, null, 2)}`);
            this.lastFetchTime = new Date().toLocaleTimeString();
            
            if (data.status === 'success') {
                this.displayLeaderboard(data.leaderboard);
                this.currentLimit = limit;
            } else {
                this.showError(data.message || 'Failed to load leaderboard');
            }
        } catch (error) {
            console.error('Leaderboard error:', error);
            this.debug(`Error: ${error.message}`);
            this.showError(`Unable to connect to server: ${error.message}`);
        }
    }

    /**
     * Display leaderboard scores in the table
     * @param {Array} scores - Array of score objects
     */
    displayLeaderboard(scores) {
        const tbody = document.getElementById('leaderboard-body');
        const table = document.getElementById('leaderboard-table');
        const emptyMessage = document.getElementById('empty-message');
        const buttonContainer = document.getElementById('button-container');
        const loadMoreBtn = document.getElementById('load-more-btn');

        this.hideLoading();
        this.debug(`Displaying ${scores ? scores.length : 0} scores`);

        if (!scores || scores.length === 0) {
            table.style.display = 'none';
            emptyMessage.style.display = 'block';
            buttonContainer.style.display = 'block';
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Add score rows
        scores.forEach((score, index) => {
            const row = document.createElement('tr');
            
            const rank = index + 1;
            const rankIcon = this.getRankIcon(rank);
            
            row.innerHTML = `
                <td class="rank-cell">${rank}${rankIcon}</td>
                <td class="username-cell">${this.escapeHtml(score.username)}</td>
                <td class="score-cell">${score.score.toLocaleString()}</td>
                <td class="time-cell">${score.time_survived}s</td>
            `;
            
            tbody.appendChild(row);
        });

        table.style.display = 'table';
        emptyMessage.style.display = 'none';
        buttonContainer.style.display = 'block';

        // Update load more button
        if (this.currentLimit >= this.maxLimit || scores.length < this.currentLimit) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.textContent = `Load Top ${this.maxLimit}`;
        }
    }

    /**
     * Get rank icon for top 3 positions
     * @param {number} rank - Position rank
     * @returns {string} Rank icon
     */
    getRankIcon(rank) {
        switch(rank) {
            case 1: return '🥇 ';
            case 2: return '🥈 ';
            case 3: return '🥉 ';
            default: return '';
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading-message').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('leaderboard-table').style.display = 'none';
        document.getElementById('empty-message').style.display = 'none';
        document.getElementById('button-container').style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading-message').style.display = 'none';
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.hideLoading();
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        document.getElementById('button-container').style.display = 'block';
    }

    /**
     * Debug logging
     * @param {string} message - Debug message
     */
    debug(message) {
        if (this.debugMode) {
            console.log('[Debug]', message);
            const debugContent = document.getElementById('debug-content');
            const timestamp = new Date().toLocaleTimeString();
            debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            debugContent.scrollTop = debugContent.scrollHeight;
        }
    }

    /**
     * Toggle debug mode on/off
     */
    toggleDebug() {
        this.debugMode = !this.debugMode;
        const debugInfo = document.getElementById('debug-info');
        const debugBtn = document.getElementById('debug-btn');
        
        if (this.debugMode) {
            debugInfo.style.display = 'block';
            debugBtn.textContent = 'Hide Debug';
            this.debug('Debug mode enabled');
            if (this.lastFetchTime) {
                this.debug(`Last fetch: ${this.lastFetchTime}`);
            }
        } else {
            debugInfo.style.display = 'none';
            debugBtn.textContent = 'Show Debug';
            document.getElementById('debug-content').innerHTML = '';
        }
    }

    /**
     * Force refresh the leaderboard
     */
    forceRefresh() {
        this.debug('Force refresh initiated');
        this.loadLeaderboard(this.currentLimit, true);
    }
}

// Initialize leaderboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    new Leaderboard();
});