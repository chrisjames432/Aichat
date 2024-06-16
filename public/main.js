const socket = io();
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const newConversationButton = document.getElementById('new-conversation-button');
const conversationsList = document.getElementById('conversations-list');
const infoColumn = document.getElementById('info-column');
const directoryInput = document.getElementById('directory-input');
let conversationName = '';
let assistantMessage = '';
let conversationHistory = [];

function sendMessage() {
  const userMessage = userInput.value.trim();
  if (userMessage === '') {
    return; // Do not send empty messages
  }
  userInput.value = '';
  chatBox.innerHTML += `<div class="message user-message"><strong>User:</strong> ${formatMessage(userMessage)}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;

  conversationHistory.push({ role: 'user', content: userMessage });
  assistantMessage = '';
  if (!conversationName) {
    startNewConversation();
  }
  console.log('Sending message:', userMessage);
  socket.emit('user_message', { conversationName, message: userMessage });
  setTimeout(addCopyButtons, 100); // Add copy buttons to new message
}

function loadConversation(name) {
  conversationName = name;
  console.log('Loading conversation:', name);
  socket.emit('load_conversation', name);
  highlightActiveConversation(name);
}

function deleteConversation(name) {
  console.log('Deleting conversation:', name);
  socket.emit('delete_conversation', name);
}

function updateConversationsList(conversations) {
  console.log('Updating conversations list:', conversations);
  conversationsList.innerHTML = '';
  conversations.forEach(name => {
    const div = document.createElement('div');
    div.className = 'conversation-item';
    div.innerHTML = `<span ondblclick="editConversationName(event, '${name}')">${name}</span><button onclick="deleteConversation('${name}')">x</button>`;
    div.onclick = () => loadConversation(name);
    conversationsList.appendChild(div);
  });
  highlightActiveConversation(conversationName);
}

function startNewConversation() {
  conversationName = `con${Date.now()}`;
  conversationHistory = [];
  chatBox.innerHTML = '';
  console.log('Starting new conversation:', conversationName);
  socket.emit('new_conversation', conversationName);
  // Add the new conversation to the list immediately
  const newConversationDiv = document.createElement('div');
  newConversationDiv.className = 'conversation-item active';
  newConversationDiv.innerHTML = `<span ondblclick="editConversationName(event, '${conversationName}')">${conversationName}</span><button onclick="deleteConversation('${conversationName}')">x</button>`;
  newConversationDiv.onclick = () => loadConversation(conversationName);
  conversationsList.appendChild(newConversationDiv);
  highlightActiveConversation(conversationName);
}

function highlightActiveConversation(name) {
  console.log('Highlighting active conversation:', name);
  const items = document.querySelectorAll('.conversation-item');
  items.forEach(item => {
    if (item.firstChild.textContent === name) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function editConversationName(event, oldName) {
  const span = event.target;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = oldName;
  input.className = 'edit-conversation-name';
  span.replaceWith(input);

  input.addEventListener('blur', () => renameConversation(input, oldName));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      renameConversation(input, oldName);
    }
  });

  input.focus();
}

function renameConversation(input, oldName) {
  const newName = input.value.trim();
  if (newName && newName !== oldName) {
    console.log('Renaming conversation:', oldName, 'to', newName);
    socket.emit('rename_conversation', { oldName, newName });
  } else {
    const span = document.createElement('span');
    span.textContent = oldName;
    span.ondblclick = (event) => editConversationName(event, oldName);
    input.replaceWith(span);
  }
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m]));
}

function formatMessage(message) {
  const codeBlockRegex = /```([\s\S]*?)```/g;

  // Escape HTML entities and replace code blocks
  let formattedMessage = message.replace(codeBlockRegex, (match, p1) => {
    // Remove language label from the code block
    const cleanedCode = p1.replace(/^(python|html|javascript|java|cpp|csharp)\s*/, '');
    return `<pre><code>${escapeHtml(cleanedCode)}</code></pre>`;
  });

  // Replace new lines outside code blocks with <br>
  formattedMessage = formattedMessage.replace(/\n(?!<\/?code>)/g, '<br>');

  return formattedMessage;
}

newConversationButton.addEventListener('click', () => {
  console.log('New conversation button clicked');
  startNewConversation();
});

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    console.log('Enter key pressed');
    sendMessage();
  }
});

sendButton.addEventListener('click', () => {
  console.log('Send button clicked');
  sendMessage();
});

socket.on('conversation_loaded', (data) => {
  const { name, messages, history } = data;
  conversationHistory = history || [];
  console.log('Conversation loaded:', name, messages, history);
  chatBox.innerHTML = messages.map(msg => {
    const roleClass = msg.role === 'user' ? 'user-message' : 'assistant-message';
    return `<div class="message ${roleClass}"><strong>${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}:</strong> ${formatMessage(msg.content)}</div>`;
  }).join('');
  Prism.highlightAll();  // Re-run Prism to highlight code blocks
  setTimeout(addCopyButtons, 100); // Add copy buttons after highlighting
  highlightActiveConversation(name);
});

socket.on('assistant_message', (msg) => {
  console.log('Assistant message received:', msg);
  assistantMessage += msg;
  const lastAssistantMessage = document.querySelector('#chat-box div.assistant-message:last-of-type');
  if (lastAssistantMessage) {
    chatBox.removeChild(lastAssistantMessage);
  }
  chatBox.innerHTML += `<div class="message assistant-message"><strong>Assistant:</strong> ${formatMessage(assistantMessage)}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
  Prism.highlightAll();  // Re-run Prism to highlight code blocks
  setTimeout(addCopyButtons, 100); // Add copy buttons after highlighting
});

socket.on('end_response', () => {
  console.log('End response received');
  conversationHistory.push({ role: 'assistant', content: assistantMessage });
  assistantMessage = '';
});

socket.on('conversations_list', (conversations) => {
  console.log('Conversations list received:', conversations);
  updateConversationsList(conversations);
});

socket.on('conversation_renamed', ({ oldName, newName }) => {
  if (conversationName === oldName) {
    conversationName = newName;
  }
  socket.emit('get_conversations'); // Refresh the conversations list
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

socket.on('directory_contents', (data) => {
  const { name, files } = data;
  const directoryDiv = document.createElement('div');
  directoryDiv.className = 'directory-contents';
  directoryDiv.innerHTML = `<h3>Contents of ${name}:</h3><ul>${files.map(file => `<li>${file}</li>`).join('')}</ul>`;
  infoColumn.appendChild(directoryDiv);
});


socket.emit('get_conversations');




// Function to handle directory picking
async function pickDirectory() {
  directoryInput.click();
}

// Handle the directory input change event
directoryInput.addEventListener('change', (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    const directoryName = files[0].webkitRelativePath.split('/')[0];
    const fileList = Array.from(files).map(file => file.webkitRelativePath);
    console.log('Directory picked:', directoryName, fileList);

    // Send the directory data to the server
    socket.emit('directory_picked', { name: directoryName, files: fileList });
  }
});


// Function to set up event listeners
function setupEventListeners() {
  const infoButton1 = document.getElementById('info-button-1');
  infoButton1.addEventListener('click', pickDirectory);
}

// Add an event listener for document load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Document fully loaded and parsed');
  setupEventListeners();
  addCopyButtons(); // Initial call to add copy buttons
});


