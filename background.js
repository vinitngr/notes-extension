// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Quick access items (no submenu)
  chrome.contextMenus.create({
    id: "quickSaveText",
    title: "💾 Quick Save Text",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "quickSaveCode",
    title: "👨‍💻 Quick Save as Code",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "saveImage",
    title: "🖼️ Save Image",
    contexts: ["image"]
  });
  
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quickSaveText" || info.menuItemId === "quickSaveCode") {
    const selectedText = info.selectionText;
    // Log the selected text to the background console to check for newlines
    console.log("Selected Text:", JSON.stringify(selectedText)); 

    chrome.storage.local.get(['savedItems'], (result) => {
      const savedItems = result.savedItems || [];
      savedItems.push({
        type: info.menuItemId === "quickSaveCode" ? 'code' : 'text',
        content: selectedText,
        date: new Date().toLocaleString(),
        url: tab.url,
        pageName: tab.title
      });
      
      chrome.storage.local.set({ savedItems });
    });
  }
  
  if (info.menuItemId === "saveImage") {
    const imageUrl = info.srcUrl;
    
    chrome.storage.local.get(['savedItems'], (result) => {
      const savedItems = result.savedItems || [];
      savedItems.push({
        type: 'image',
        content: imageUrl,
        date: new Date().toLocaleString(),
        url: tab.url,
        pageName: tab.title
      });
      
      chrome.storage.local.set({ savedItems });
    });
  }
}); 
