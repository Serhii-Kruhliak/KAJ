document.addEventListener("DOMContentLoaded", () => {
    const leaderboardBtn = document.getElementById("leaderboardBtn");

    if (leaderboardBtn) {
        leaderboardBtn.addEventListener("click", () => {
            window.location.href = "leaderboard.html";
        });
    } else {
        console.warn("Leaderboard button not found.");
    }
});