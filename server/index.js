const db = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Initialize database then start server
db.init().then(function() {
    app.listen(PORT, function() {
        console.log('Server running on http://localhost:' + PORT);
    });
}).catch(function(err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
