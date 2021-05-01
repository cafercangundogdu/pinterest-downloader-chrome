/*******************/
/***** LOGGING *****/
/*******************/

function log(message, data) {
  chrome.extension.getBackgroundPage().console.log("FROM POPUP > ", message, data);
}

/*********************/
/***** VARIABLES *****/
/*********************/

const usernameInput = $('#pinterest-username');
const getBoardsButton = $('#button-get-boards');
const downloadSelectedBoardButton = $('#button-download-selected-board');
const progressBarDiv = $('#progress-bar-div')
const progressBar = $('#progress-bar')
let port = chrome.extension.connect({ name: "background-connection" });


/******************/
/***** EVENTS *****/
/******************/

port.onMessage.addListener(function(message) {
  if(message.type && message.type === "FROM_BG_result_boards") {
    const boards = message.boards
    if(boards) {
      $('#select-board').empty().append(new Option('Please select a board..'));
      boards.forEach(board => {
        $('#select-board').append(new Option(`${board.name} (${board.pinCount} pin)`, board.id));
      })
    }
  } else if(message.type && message.type === "FROM_BG_result_username") {
    const username = message.username
    usernameInput.val(username)

    port.postMessage({type: "FROM_POPUP_load_boards", username});
  } else if(message.type && message.type === "FROM_BG_result_download_board_feed_browser") {
    const boardFeeds = message.boardFeeds
  } else if(message.type && message.type === "progress_update") {
    const progress = message.progress
    if(!progress.active) {
      progressBarDiv.hide()
    } else {
      progressBarDiv.show()
      progressBar.attr('aria-valuemin', 0)
      progressBar.attr('aria-valuemax', progress.total)
      progressBar.attr('aria-valuenow', progress.step)
      progressBar.css('width', `${progress.percent}%`)
      progressBar.text(progress.text)
    }
  }
});

getBoardsButton.on('click', e => {
  const username = usernameInput.val()
  port.postMessage({type: "FROM_POPUP_load_boards", username});
})

downloadSelectedBoardButton.on('click', e => {
  const boardId = $('#select-board option:selected').val()
  //port.postMessage({type: "FROM_POPUP_load_board_feeds", boardId});
  port.postMessage({type: "FROM_POPUP_download_board_feed_browser", boardId, downloadCount: -1});
})


/****************/
/***** CODE *****/
/****************/
port.postMessage({type: "FROM_POPUP_find_username"})
