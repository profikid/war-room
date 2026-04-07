const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data/.openclaw/workspace/snuuu-telegram-entities/entities';

// Basic auth
app.use(basicAuth({
    users: { 'snuuu': 'warroom2024' },
    challenge: true,
    realm: 'War Room'
}));

app.use(express.static('public'));

// Read all entities from JSONL files
function readEntities() {
    const entities = [];
    const channels = [];
    
    if (!fs.existsSync(DATA_DIR)) {
        return { entities: [], channels: [] };
    }
    
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.jsonl'));
    
    for (const file of files) {
        const channel = path.basename(file, '.jsonl');
        channels.push(channel);
        
        const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const entity = JSON.parse(line);
                entity.id = `${channel}-${entity.message_id}-${entity.text}-${entity.type}`;
                entities.push(entity);
            } catch (e) {
                console.error('Parse error:', e.message);
            }
        }
    }
    
    // Sort by timestamp descending
    entities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { entities, channels };
}

// Get entity types
function getEntityTypes(entities) {
    const types = new Set();
    entities.forEach(e => types.add(e.type));
    return Array.from(types).sort();
}

// Get stats
function getStats(entities) {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const byType = {};
    const byChannel = {};
    let lastHour = 0;
    let last24Hours = 0;
    
    entities.forEach(e => {
        const ts = new Date(e.timestamp);
        
        byType[e.type] = (byType[e.type] || 0) + 1;
        byChannel[e.channel] = (byChannel[e.channel] || 0) + 1;
        
        if (ts > oneHourAgo) lastHour++;
        if (ts > oneDayAgo) last24Hours++;
    });
    
    return {
        total: entities.length,
        lastHour,
        last24Hours,
        byType,
        byChannel
    };
}

// Get hourly data for chart
function getHourlyData(entities) {
    const hours = 24;
    const data = [];
    const now = new Date();
    
    for (let i = hours - 1; i >= 0; i--) {
        const hourStart = new Date(now - (i + 1) * 60 * 60 * 1000);
        const hourEnd = new Date(now - i * 60 * 60 * 1000);
        
        const count = entities.filter(e => {
            const ts = new Date(e.timestamp);
            return ts >= hourStart && ts < hourEnd;
        }).length;
        
        data.push({
            hour: hourStart.getHours(),
            count
        });
    }
    
    return data;
}

// API Routes
app.get('/api/entities', (req, res) => {
    const { entities, channels } = readEntities();
    const { channel, type, search, limit = 100 } = req.query;
    
    let filtered = entities;
    
    if (channel && channel !== 'all') {
        filtered = filtered.filter(e => e.channel === channel);
    }
    
    if (type && type !== 'all') {
        filtered = filtered.filter(e => e.type === type);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(e => 
            e.text.toLowerCase().includes(searchLower) ||
            (e.context && e.context.toLowerCase().includes(searchLower))
        );
    }
    
    res.json({
        entities: filtered.slice(0, parseInt(limit)),
        channels,
        types: getEntityTypes(entities),
        stats: getStats(entities),
        hourly: getHourlyData(entities)
    });
});

app.get('/api/recent', (req, res) => {
    const { entities } = readEntities();
    res.json({
        entities: entities.slice(0, 10),
        total: entities.length
    });
});

app.get('/api/stats', (req, res) => {
    const { entities } = readEntities();
    res.json({
        stats: getStats(entities),
        hourly: getHourlyData(entities)
    });
});

app.listen(PORT, () => {
    console.log(`🦭 War Room Dashboard running on port ${PORT}`);
});
