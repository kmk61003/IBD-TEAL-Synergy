// Chatbot Widget
$(document).ready(function () {
    var chatHistory = [];
    var isOpen = false;
    var isWaiting = false;

    // Inject chatbot HTML
    var chatHTML =
        '<div id="chatbot-fab" title="Chat with Teal">' +
            '<span class="chatbot-fab-icon">\uD83D\uDCAC</span>' +
        '</div>' +
        '<div id="chatbot-window" style="display:none;">' +
            '<div class="chatbot-header">' +
                '<div class="chatbot-header-info">' +
                    '<span class="chatbot-avatar">\uD83D\uDC8E</span>' +
                    '<div><strong>Teal</strong><small>Jewelry Assistant</small></div>' +
                '</div>' +
                '<button id="chatbot-close" title="Close">&times;</button>' +
            '</div>' +
            '<div id="chatbot-messages" class="chatbot-messages">' +
                '<div class="chat-msg bot">' +
                    '<div class="chat-bubble">Hi! I\'m <strong>Teal</strong>, your jewelry assistant. \u2728<br>I can help you find the perfect piece, suggest styles, or answer questions about our collection. How can I help you today?</div>' +
                '</div>' +
            '</div>' +
            '<form id="chatbot-form" class="chatbot-input-area">' +
                '<input type="text" id="chatbot-input" placeholder="Ask about jewelry, styles, products..." maxlength="1000" autocomplete="off" />' +
                '<button type="submit" id="chatbot-send" title="Send">&#10148;</button>' +
            '</form>' +
        '</div>';

    $('body').append(chatHTML);

    // Toggle chat window
    $('#chatbot-fab').on('click', function () {
        isOpen = !isOpen;
        if (isOpen) {
            $('#chatbot-window').fadeIn(200);
            $('#chatbot-fab').addClass('chatbot-fab-hidden');
            $('#chatbot-input').focus();
        } else {
            $('#chatbot-window').fadeOut(200);
            $('#chatbot-fab').removeClass('chatbot-fab-hidden');
        }
    });

    $('#chatbot-close').on('click', function () {
        isOpen = false;
        $('#chatbot-window').fadeOut(200);
        $('#chatbot-fab').removeClass('chatbot-fab-hidden');
    });

    // Send message
    $('#chatbot-form').on('submit', function (e) {
        e.preventDefault();
        var input = $('#chatbot-input');
        var msg = input.val().trim();
        if (!msg || isWaiting) return;

        // Add user message
        appendMessage('user', $('<span>').text(msg).html());
        chatHistory.push({ role: 'user', content: msg });
        input.val('');

        // Show typing indicator
        isWaiting = true;
        $('#chatbot-send').prop('disabled', true);
        var typingId = showTyping();

        API.post('/api/chat', {
            message: msg,
            history: chatHistory.slice(-10)
        }).then(function (data) {
            removeTyping(typingId);
            var reply = data.reply || 'Sorry, I could not generate a response.';
            var formatted = formatReply(reply);
            appendMessage('bot', formatted);
            chatHistory.push({ role: 'assistant', content: reply });
        }).catch(function (err) {
            removeTyping(typingId);
            var errorMsg = (err.responseJSON && err.responseJSON.error) || 'Sorry, something went wrong. Please try again.';
            appendMessage('bot', '<span class="chat-error">' + $('<span>').text(errorMsg).html() + '</span>');
        }).always(function () {
            isWaiting = false;
            $('#chatbot-send').prop('disabled', false);
            $('#chatbot-input').focus();
        });
    });

    function appendMessage(role, html) {
        var msgDiv = $('<div class="chat-msg ' + role + '"><div class="chat-bubble">' + html + '</div></div>');
        $('#chatbot-messages').append(msgDiv);
        scrollToBottom();
    }

    function showTyping() {
        var id = 'typing-' + Date.now();
        var dot = '<div class="chat-msg bot" id="' + id + '"><div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div></div>';
        $('#chatbot-messages').append(dot);
        scrollToBottom();
        return id;
    }

    function removeTyping(id) {
        $('#' + id).remove();
    }

    function scrollToBottom() {
        var el = document.getElementById('chatbot-messages');
        if (el) el.scrollTop = el.scrollHeight;
    }

    function formatReply(text) {
        // Escape HTML first
        var safe = $('<span>').text(text).html();

        // Convert **bold** to <strong>
        safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Convert product references {{PRODUCT:id}} to clickable links
        safe = safe.replace(/\{\{PRODUCT:(\d+)\}\}/g, function (match, id) {
            return '<a href="/pdp.html?id=' + id + '" class="chat-product-link" title="View product">View Product \u2192</a>';
        });

        // Convert newlines to <br>
        safe = safe.replace(/\n/g, '<br>');

        return safe;
    }
});
