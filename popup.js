// Main display function
function displaySavedItems() {
  const container = document.getElementById('savedItems');
  
  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    
    if (savedItems.length === 0) {
      container.innerHTML = '<p class="no-items">No saved items yet.</p>';
      return;
    }
    
    container.innerHTML = savedItems.reverse().map((item, index) => `
      <div class="saved-item">
        <div class="item-header">
          <div class="page-name">${item.pageName || 'Unnamed Page'}</div>
          <div class="item-type">${item.type.toUpperCase()}</div>
        </div>
        ${getItemContent(item, index)}
        <div class="meta">
          <div class="timestamp-container">
            <div class="timestamp">Saved on: ${item.date}</div>
          </div>
          <div class="action-buttons">
            <button class="delete-btn" data-index="${index}">Delete</button>
            <a href="${item.url}" class="source-button" target="_blank" rel="noopener noreferrer">View Source</a>
            ${item.type === 'text' || item.type === 'code' ? `
              <button class="copy-btn" data-index="${index}">Copy</button>
              <button class="edit-btn" data-index="${index}">Edit</button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    setupAllButtons();
  });
}

// Helper functions
function getItemContent(item, index) {
  switch (item.type) {
    case 'text':
      const isQuickNote = item.pageName === 'Quick Note';
      const containerClass = isQuickNote ? 'quick-note' : 'text-content';
      return `
        <div class="${containerClass}" id="content-${index}">
          <div class="content-text">${item.content}</div>
        </div>`;
    case 'code':
      return `
        <div class="code-content" id="content-${index}">
          <pre><code id="code-${index}">${escapeHtml(item.content)}</code></pre>
        </div>`;
    case 'image':
      return `
        <div class="image-preview">
          <img src="${item.content}" class="image" alt="Saved image">
        </div>`;
    default:
      return `<div class="text-content">${item.content}</div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Item management functions
function deleteItem(button) {
  const index = parseInt(button.getAttribute('data-index'), 10);

  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    const realIndex = savedItems.length - 1 - index;
    
    savedItems.splice(realIndex, 1);
    
    chrome.storage.local.set({ savedItems }, () => {
      displaySavedItems();
    });
  });
}

function editItem(index, type = 'text') {
  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    const realIndex = savedItems.length - 1 - index;
    const item = savedItems[realIndex];
    
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    
    const textarea = document.createElement('textarea');
    textarea.value = item.content;
    textarea.className = 'edit-textarea';
    
    if (type === 'code' || item.type === 'code') {
      textarea.classList.add('code-textarea');
      textarea.style.fontFamily = 'monospace';
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }
      });
    }
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'edit-save-btn';
    saveBtn.onclick = () => saveEdit(index, textarea.value, type);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'edit-cancel-btn';
    cancelBtn.onclick = () => modal.remove();
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'edit-button-container';
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    
    modal.appendChild(textarea);
    modal.appendChild(buttonContainer);
    document.body.appendChild(modal);
    
    textarea.focus();
    textarea.select();
  });
}

function saveEdit(index, newContent, type = 'text') {
  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    const realIndex = savedItems.length - 1 - index;
    
    if (savedItems[realIndex]) {
      savedItems[realIndex].content = newContent;
      savedItems[realIndex].type = type === 'code' ? 'code' : 'text';
      
      chrome.storage.local.set({ savedItems }, () => {
        displaySavedItems();
        document.querySelector('.edit-modal').remove();
      });
    }
  });
}

// Button setup functions
function setupAllButtons() {
  setupDeleteButtons();
  setupSourceButtons();
  setupEditButtons();
  setupCopyButtons();
}

function setupDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this item?')) {
        deleteItem(e.target);
      }
    });
  });
}

function setupSourceButtons() {
  document.querySelectorAll('.source-button').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: link.href });
    });
  });
}

function setupEditButtons() {
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const contentElement = document.querySelector(`#content-${index}`);
      
      if (contentElement.classList.contains('code-content')) {
        editItem(index, 'code');
      } else {
        editItem(index, 'text');
      }
    });
  });
}

function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      const contentElement = document.querySelector(`#content-${index}`);
      
      let textToCopy;
      if (contentElement.classList.contains('code-content')) {
        const codeElement = contentElement.querySelector('pre code');
        textToCopy = codeElement ? codeElement.textContent : '';
      } else {
        textToCopy = contentElement.querySelector('.content-text').textContent;
      }

      try {
        await navigator.clipboard.writeText(textToCopy);
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
        button.textContent = 'Failed!';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
  });
}

// Download functions
function downloadAsTxt() {
  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    
    if (savedItems.length === 0) {
      alert('No items to download!');
      return;
    }

    const filename = prompt('Enter filename for your download:', `saved_items_${new Date().toLocaleDateString()}`);
    if (!filename) return;

    const content = savedItems.map(item => 
      `Type: ${item.type}\n${item.type === 'text' ? `Content: ${item.content}\n` : `Image URL: ${item.content}\n`}Saved from: ${item.url}\nDate: ${item.date}\n\n`
    ).join('-------------------\n');

    downloadFile(content, `${filename}.txt`, 'text/plain');
  });
}


function downloadAsHtml() {
  chrome.storage.local.get(['savedItems'], (result) => {
    const savedItems = result.savedItems || [];
    
    if (savedItems.length === 0) {
      alert('No items to download!');
      return;
    }

    const filename = prompt('Enter filename for your download:', `saved_items_${new Date().toLocaleDateString()}`);
    if (!filename) return;

    const htmlContent = generateHtmlContent(savedItems, filename);
    downloadFile(htmlContent, `${filename}.html`, 'text/html');
  });
}

function generateHtmlContent(savedItems, filename) {
  return `<!DOCTYPE html>
    <html>
    <head>
      <title>${filename} - Saved Items</title>
      <style>
        body {
          max-width: 800px;
          margin: 20px auto; 
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .saved-item {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 5px;
          margin-bottom: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .code-content {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 4px;
          margin: 10px 0;
          position: relative;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-x: hidden;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1 class="page-title">${filename}</h1>
      ${savedItems.map(item => `
        <div class="saved-item">
          <div class="item-header">
            <div class="page-name">${item.pageName || 'Unnamed Page'}</div>
            <div class="type-label">${item.type.toUpperCase()}</div>
          </div>
          ${item.type === 'code' 
            ? `<div class="code-content">
                <pre><code>${escapeHtml(item.content)}</code></pre>
               </div>`
            : item.type === 'text'
              ? `<div class="text-content">
                  <div class="content-text">${item.content}</div>
                 </div>`
              : `<div class="image-content"><img src="${item.content}" alt="Saved image"></div>`
          }
          <div class="meta">
            <div class="timestamp">Saved on: ${item.date}</div>
            <a href="${item.url}" class="source-btn">View Source</a>
          </div>
        </div>
      `).join('')}
    </body>
    </html>`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Quick input section
function setupInputSection() {
  const input = document.getElementById('quickInput');
  const saveBtn = document.getElementById('quickSave');

  saveBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (text) {
      chrome.storage.local.get(['savedItems'], (result) => {
        const savedItems = result.savedItems || [];
        savedItems.push({
          type: 'text',
          content: text,
          date: new Date().toLocaleString(),
          pageName: 'Quick Note',
          url: '#'
        });
        
        chrome.storage.local.set({ savedItems }, () => {
          input.value = '';
          displaySavedItems();
        });
      });
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
}

// Event listeners
document.getElementById('clearAll').addEventListener('click', () => {
  chrome.storage.local.set({ savedItems: [] }, () => {
    displaySavedItems();
  });
});

document.getElementById('downloadTxt').addEventListener('click', downloadAsTxt);
document.getElementById('downloadHtml').addEventListener('click', downloadAsHtml);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  displaySavedItems();
  setupInputSection();
});