document.addEventListener("DOMContentLoaded", function () {
    let chatButton = document.getElementById("chat-button");
    let chatIcon = document.getElementById("chat");
    let chatPopup = document.getElementById("chat-pop-up");
    let chatPopup_user = document.getElementById("float-chat-user");

    function toggleChatPopup() {
        if (chatPopup.style.display == "flex") {
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
        if (!chatButton.contains(event.target) && !chatPopup.contains(event.target)) {
            chatPopup.style.display = "none";
        }
    });
    
    window.ChatOpen = function () {
        chatPopup_user.style.display = "flex";
    };

    window.openChat = function () {
        document.getElementById("chatPopup_user").style.display = "flex";
    }

    window.close_pop_up = function () {
        document.getElementById("pop-up-post").style.display = "none";
    }
});
