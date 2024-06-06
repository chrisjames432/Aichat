require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const conversationsDir = path.join(__dirname, 'conversations');
if (!fs.existsSync(conversationsDir)) {
  fs.mkdirSync(conversationsDir);
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('load_conversation', (conversationName) => {
    const filePath = path.join(conversationsDir, `${conversationName}.json`);
    if (fs.existsSync(filePath)) {
      const conversationData = fs.readFileSync(filePath, 'utf8');
      socket.emit('conversation_loaded', JSON.parse(conversationData));
    } else {
      socket.emit('conversation_loaded', { name: conversationName, messages: [], history: [] });
    }
  });

  socket.on('save_conversation', (data) => {
    const { name, messages, history } = data;
    const filePath = path.join(conversationsDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data));
  });

  socket.on('user_message', async (data) => {
    const { conversationName, message } = data;
    const conversationFile = path.join(conversationsDir, `${conversationName}.json`);

    let conversationHistory = [];
    if (fs.existsSync(conversationFile)) {
      const conversationData = JSON.parse(fs.readFileSync(conversationFile, 'utf8'));
      conversationHistory = conversationData.messages;
    }

    conversationHistory.push({ role: 'user', content: message });

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4",
        messages: conversationHistory,
        stream: true,
      });

      let assistantResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        assistantResponse += content;
        socket.emit('assistant_message', content);
      }

      conversationHistory.push({ role: 'assistant', content: assistantResponse });
      socket.emit('end_response');

      const conversationData = { name: conversationName, messages: conversationHistory, history: conversationHistory };
      fs.writeFileSync(conversationFile, JSON.stringify(conversationData));
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      socket.emit('error', 'Error with OpenAI API');
    }
  });

  socket.on('new_conversation', (conversationName) => {
    const filePath = path.join(conversationsDir, `${conversationName}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    socket.emit('conversation_loaded', { name: conversationName, messages: [], history: [] });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('HTTP server closed.');
    // Optionally, close any other resources like database connections here
    process.exit(0);
  });

  // If server hasn't finished closing after 10 seconds, force shutdown
  setTimeout(() => {
    console.error('Forcing server shutdown...');
    process.exit(1);
  }, 500);
};

process.on('SIGINT', shutdown); // Handle Ctrl+C
process.on('SIGTERM', shutdown); // Handle termination signals
