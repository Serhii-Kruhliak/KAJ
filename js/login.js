$(document).ready(function () {
    const message = $("#auth-message");

    // Add event listener for audio
    const title = document.querySelector('.game-title');
    const audio = document.getElementById('login-audio');
    title.addEventListener('click', () => {
        audio.play().catch(err => {
        console.error('Audio play failed:', err);
        });
    });

    showUserLocationWithFlag;

    function showUserLocationWithFlag() {
        const output = document.getElementById("location-output");
      
        fetch("https://ipapi.co/json/")
          .then(response => response.json())
          .then(data => {
            const countryCode = data.country_code; // e.g. "US"
            const flagEmoji = getFlagEmoji(countryCode);
            output.textContent = `${flagEmoji}`;
          })
          .catch(() => {
            output.textContent = "🌍";
          });
      }
      
      // Helper to convert "US" to 🇺🇸
      function getFlagEmoji(countryCode) {
        return countryCode
          .toUpperCase()
          .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
      }
    
    // Hash password function
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Clear error messages
    function clearErrors() {
        message.text("").removeClass("error success");
        $("input").removeClass("error");
    }

    // Show error message
    function showError(msg, fieldId = null) {
        message.text(msg).addClass("error").removeClass("success");
        if (fieldId) {
            $(fieldId).addClass("error").focus();
        }
    }

    // Show success message
    function showSuccess(msg) {
        message.text(msg).addClass("success").removeClass("error");
    }

    // Validate form data
    function validateForm(username, password) {
        clearErrors();

        if (!username.trim()) {
            showError("Username is required.", "#login-username");
            return false;
        }

        if (!password) {
            showError("Password is required.", "#login-password");
            return false;
        }

        return true;
    }

    // Handle form submission
    $("#login-form").on("submit", async function (e) {
        e.preventDefault();

        const username = $("#login-username").val().trim();
        const password = $("#login-password").val();

        // Validate form
        if (!validateForm(username, password)) {
            return;
        }

        try {
            // Show loading state
            const submitBtn = $("button[type=submit]");
            const originalText = submitBtn.text();
            submitBtn.prop("disabled", true).text("Logging in...");

            // Hash password for comparison
            const hashedPassword = await hashPassword(password);

            // Send login request to server
            const response = await fetch("php/login_user.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    username: username, 
                    password: hashedPassword 
                })
            });

            const result = await response.json();

            if (result.status === "success") {
                // Store logged in user info (you might want to use a more secure method)
                sessionStorage.setItem("loggedInUser", username);
                showSuccess("Login successful! Redirecting...");
                
                setTimeout(() => {
                    window.location.href = "game.html";
                }, 500);
            } else {
                showError(result.message || "Invalid username or password.");
                
                // Clear password field for security
                $("#login-password").val("");
                
                // Focus on username if user not found, password if wrong password
                if (result.message && result.message.toLowerCase().includes("username")) {
                    $("#login-username").addClass("error").focus();
                } else {
                    $("#login-password").addClass("error").focus();
                }
            }

        } catch (error) {
            console.error("Login error:", error);
            showError("Server error. Please check your connection and try again.");
            
            // Clear password for security
            $("#login-password").val("");
        } finally {
            // Restore button state
            const submitBtn = $("button[type=submit]");
            submitBtn.prop("disabled", false).text("Log In");
        }
    });

    // Clear errors when user starts typing
    $("#login-username, #login-password").on("input", function() {
        $(this).removeClass("error");
        if (message.hasClass("error")) {
            clearErrors();
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    showUserLocationWithFlag();

    function showUserLocationWithFlag() {
        const output = document.getElementById("location-output");

        fetch("https://ipapi.co/json/")
            .then(response => response.json())
            .then(data => {
                const countryCode = data.country_code; // e.g. "US"
                const flagEmoji = getFlagEmoji(countryCode);
                output.textContent = `${flagEmoji}`;
            })
            .catch(() => {
                output.textContent = "🌍";
            });
    }

    function getFlagEmoji(countryCode) {
        return countryCode
            .toUpperCase()
            .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
    }
});