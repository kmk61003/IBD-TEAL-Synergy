var express = require('express');
var router = express.Router();
var https = require('https');
var db = require('../config/db');

var OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
var MODEL = 'meta-llama/llama-4-maverick';

var SYSTEM_PROMPT = "You are Teal, a friendly and knowledgeable AI jewelry shopping assistant for IBD Teal Jewelry. " +
    "Your role:\n" +
    "- Help customers find jewelry (rings, necklaces, earrings, bracelets, bangles).\n" +
    "- Give style suggestions based on occasions, outfits, preferences, or budget.\n" +
    "- Answer questions about products, materials (gold, silver, platinum, diamond, gemstones), sizing, and care.\n" +
    "- Recommend products from the catalog provided in context.\n" +
    "- Be warm, concise, and helpful. Use ₹ for prices.\n" +
    "- When recommending products, include the product name, price, and ID so the frontend can link to them.\n" +
    "- Format product recommendations as: **[Product Name]** - ₹price {{PRODUCT:id}}\n" +
    "- If asked about things unrelated to jewelry or the store, politely steer back to jewelry topics.\n" +
    "- Do not make up products. Only recommend products from the catalog context provided.\n" +
    "- Keep responses under 300 words.";

function getProductCatalog() {
    try {
        var products = db.prepare(
            "SELECT mp.id, mp.name, mp.short_description, " +
            "(SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price, " +
            "(SELECT MAX(lp.price) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as max_price, " +
            "(SELECT GROUP_CONCAT(DISTINCT lp.metal) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as metals, " +
            "(SELECT GROUP_CONCAT(c.name, ', ') FROM category c JOIN product_category_mapping pcm ON c.id = pcm.category_id WHERE pcm.master_product_id = mp.id) as categories " +
            "FROM master_product mp WHERE mp.status = 'active' ORDER BY mp.name"
        ).all();

        return products.map(function (p) {
            var price = p.min_price === p.max_price
                ? '₹' + p.min_price
                : '₹' + p.min_price + '–₹' + p.max_price;
            return 'ID:' + p.id + ' | ' + p.name + ' | ' + (p.categories || '') + ' | ' + price + ' | Metals: ' + (p.metals || 'N/A') + ' | ' + (p.short_description || '');
        }).join('\n');
    } catch (err) {
        console.error('Failed to fetch catalog for chatbot:', err);
        return '';
    }
}

function searchProducts(query) {
    try {
        var searchTerm = '%' + query + '%';
        return db.prepare(
            "SELECT mp.id, mp.name, mp.short_description, " +
            "(SELECT MIN(COALESCE(lp.discount_price, lp.price)) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as min_price, " +
            "(SELECT GROUP_CONCAT(DISTINCT lp.metal) FROM lot_product lp WHERE lp.master_product_id = mp.id AND lp.status = 'active') as metals, " +
            "(SELECT GROUP_CONCAT(c.name, ', ') FROM category c JOIN product_category_mapping pcm ON c.id = pcm.category_id WHERE pcm.master_product_id = mp.id) as categories " +
            "FROM master_product mp WHERE mp.status = 'active' AND (mp.name LIKE ? OR mp.short_description LIKE ? OR mp.description LIKE ?) LIMIT 10"
        ).all(searchTerm, searchTerm, searchTerm);
    } catch (err) {
        return [];
    }
}

function callOpenRouter(messages, callback) {
    var body = JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
    });

    var options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'IBD Teal Jewelry'
        }
    };

    var req = https.request(options, function (res) {
        var data = '';
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function () {
            try {
                var parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices.length > 0) {
                    callback(null, parsed.choices[0].message.content);
                } else if (parsed.error) {
                    callback(new Error(parsed.error.message || 'OpenRouter API error'));
                } else {
                    callback(new Error('No response from AI model'));
                }
            } catch (e) {
                callback(new Error('Failed to parse AI response'));
            }
        });
    });

    req.on('error', function (err) {
        callback(err);
    });

    req.write(body);
    req.end();
}

// POST /api/chat
router.post('/', function (req, res) {
    if (!OPENROUTER_API_KEY) {
        return res.status(503).json({ error: 'Chatbot is not configured. API key missing.' });
    }

    var userMessage = (req.body.message || '').trim();
    var history = req.body.history || [];

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required.' });
    }
    if (userMessage.length > 1000) {
        return res.status(400).json({ error: 'Message too long. Max 1000 characters.' });
    }

    // Build catalog context
    var catalog = getProductCatalog();
    var contextMsg = "Current product catalog:\n" + catalog;

    // Check if user is asking about specific products
    var keywords = userMessage.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    var relevantProducts = [];
    for (var i = 0; i < keywords.length; i++) {
        var found = searchProducts(keywords[i]);
        for (var j = 0; j < found.length; j++) {
            if (!relevantProducts.some(function (rp) { return rp.id === found[j].id; })) {
                relevantProducts.push(found[j]);
            }
        }
        if (relevantProducts.length >= 10) break;
    }

    if (relevantProducts.length > 0) {
        contextMsg += "\n\nProducts specifically matching the user's query:\n" +
            relevantProducts.map(function (p) {
                return 'ID:' + p.id + ' ' + p.name + ' (' + (p.categories || '') + ') ₹' + p.min_price + ' Metals:' + (p.metals || '');
            }).join('\n');
    }

    // Build messages array
    var messages = [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextMsg }
    ];

    // Add conversation history (limit to last 10 messages)
    var trimmedHistory = history.slice(-10);
    for (var h = 0; h < trimmedHistory.length; h++) {
        var entry = trimmedHistory[h];
        if (entry.role === 'user' || entry.role === 'assistant') {
            messages.push({ role: entry.role, content: String(entry.content).substring(0, 1000) });
        }
    }

    messages.push({ role: 'user', content: userMessage });

    callOpenRouter(messages, function (err, reply) {
        if (err) {
            console.error('Chatbot error:', err.message);
            return res.status(502).json({ error: 'Sorry, I\'m having trouble connecting. Please try again.' });
        }
        res.json({ reply: reply });
    });
});

module.exports = router;
