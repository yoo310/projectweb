document.addEventListener("DOMContentLoaded", function () {
    let chatButton = document.getElementById("chat-button");
    let chatIcon = document.getElementById("chat");
    let chatPopup = document.getElementById("chat-pop-up");
    let chatPopup_user = document.getElementById("float-chat-user");
    let postbutton = document.getElementById("postbutton");
    let post_popup = document.getElementById("pop-up-post");
    let postdisplay = document.getElementById("postdisplayed");

    function toggleChatPopup() {
        if (chatPopup.style.display === "flex") {
            chatPopup.style.display = "none";
        } else {
            chatPopup.style.display = "flex";
        }
    }


    if (chatButton) {
        chatButton.addEventListener("click", function (event) {
            chatPopup.style.top = "430px";
            chatPopup.style.right = "80px";
            event.stopPropagation();
            toggleChatPopup();
        });
    }

    if (chatIcon) {
        chatIcon.addEventListener("click", function (event) {
            chatPopup.style.top = "80px";
            chatPopup.style.right = "20px";
            event.stopPropagation(); 
            toggleChatPopup();
        });
    }


    document.addEventListener("click", function (event) {
        if (!chatButton.contains(event.target) && !chatPopup.contains(event.target) && !chatIcon.contains(event.target)) {
            chatPopup.style.display = "none";
        }
    });


    postbutton.addEventListener("click", function (event) {
        event.stopPropagation();
        post_popup.style.display = "flex";
    });

    document.addEventListener("click", function (event) {
        if (!postdisplay.contains(event.target) && !postbutton.contains(event.target)) {
            post_popup.style.display = "none";
        }
    });

    document.getElementById("chat-button").addEventListener("click", function() {
        window.location.href = "/chat/showchat"; // ✅ บังคับให้เปลี่ยนหน้า
    });

    window.ChatOpen = function () {
        chatPopup_user.style.display = "flex";
    };

    window.close_pop_up = function () {
        post_popup.style.display = "none";
    };

    window.closechat = function () {
        chatPopup_user.style.display = "none";
    };

    document.addEventListener("click", function (event) {
        if (!chatPopup_user.contains(event.target) && !chatPopup.contains(event.target)) {
            chatPopup_user.style.display = "none";
        }
    });


});