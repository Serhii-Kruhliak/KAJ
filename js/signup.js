$(document).ready(function () {
    const message = $("#auth-message");
    
    // Hash password function
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate username (alphanumeric, 3-20 characters)
    function isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
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
    function validateForm(username, email, password, passwordVerification) {
        clearErrors();

        // Check username
        if (!username) {
            showError("Username is required.", "#signup-username");
            return false;
        }
        if (!isValidUsername(username)) {
            showError("Username must be 3-20 characters long and contain only letters, numbers, and underscores.", "#signup-username");
            return false;
        }

        // Check email
        if (!email) {
            showError("Email is required.", "#signup-email");
            return false;
        }
        if (!isValidEmail(email)) {
            showError("Please enter a valid email address.", "#signup-email");
            return false;
        }

        // Check password
        if (!password) {
            showError("Password is required.", "#signup-password");
            return false;
        }
        if (password.length < 6) {
            showError("Password must be at least 6 characters long.", "#signup-password");
            return false;
        }

        // Check password confirmation
        if (!passwordVerification) {
            showError("Please confirm your password.", "#signup-password-verification");
            return false;
        }
        if (password !== passwordVerification) {
            showError("Passwords do not match.", "#signup-password-verification");
            return false;
        }

        return true;
    }

    // Handle form submission
    $("#signup-form").on("submit", async function (e) {
        e.preventDefault();

        const username = $("#signup-username").val().trim();
        const email = $("#signup-email").val().trim();
        const password = $("#signup-password").val();
        const passwordVerification = $("#signup-password-verification").val();

        // Validate form
        if (!validateForm(username, email, password, passwordVerification)) {
            return;
        }

        try {
            // Show loading state
            const submitBtn = $("button[type=submit]");
            const originalText = submitBtn.text();
            submitBtn.prop("disabled", true).text("Registering...");

            // Hash password
            const hashedPassword = await hashPassword(password);

            // Send to server
            const response = await fetch("php/save_user.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    username: username, 
                    email: email, 
                    password: hashedPassword 
                })
            });

            const result = await response.json();

            if (result.status === "success") {
                // Clear form
                $("#signup-form")[0].reset();
                sessionStorage.setItem("loggedInUser", username);
                showSuccess("Registration successful! Redirecting to login...");
                
                setTimeout(() => {
                    window.location.href = "game.html";
                }, 500);
            } else {
                showError(result.message || "Registration failed. Please try again.");
                
                // Focus on username field if username exists error
                if (result.message && result.message.toLowerCase().includes("username")) {
                    $("#signup-username").addClass("error").focus();
                }
            }

        } catch (error) {
            console.error("Registration error:", error);
            showError("Server error. Please check your connection and try again.");
        } finally {
            // Restore button state
            const submitBtn = $("button[type=submit]");
            submitBtn.prop("disabled", false).text("Register");
        }
    });

    // Real-time validation feedback
    $("#signup-username").on("blur", function() {
        const username = $(this).val().trim();
        if (username && !isValidUsername(username)) {
            $(this).addClass("error");
            showError("Username must be 3-20 characters long and contain only letters, numbers, and underscores.");
        } else {
            $(this).removeClass("error");
            if (message.hasClass("error") && message.text().includes("Username")) {
                clearErrors();
            }
        }
    });

    $("#signup-email").on("blur", function() {
        const email = $(this).val().trim();
        if (email && !isValidEmail(email)) {
            $(this).addClass("error");
            showError("Please enter a valid email address.");
        } else {
            $(this).removeClass("error");
            if (message.hasClass("error") && message.text().includes("email")) {
                clearErrors();
            }
        }
    });

    $("#signup-password-verification").on("input", function() {
        const password = $("#signup-password").val();
        const confirmation = $(this).val();
        
        if (confirmation && password !== confirmation) {
            $(this).addClass("error");
        } else {
            $(this).removeClass("error");
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
                const countryCode = data.country_code;
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
          .replace(/./g, char => 
            String.fromCodePoint(127397 + char.charCodeAt())
          );
      }
});