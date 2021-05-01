const findUsernameFromPage = () => new URL(document.querySelector('[data-test-id="header-profile"] > a').href).pathname.replaceAll("/", "");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type && message.type === "FROM_BG_find_username") {
    const username = findUsernameFromPage()
    chrome.runtime.sendMessage({ type: "FROM_CONTENT_result_username", username })
  }
})
