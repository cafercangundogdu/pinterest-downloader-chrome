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
  log("message recieved" + message);
  if(message.type && message.type === "FROM_BG_result_boards") {
    const boards = message.boards
    log("boards", boards)
    if(boards) {
      $('#select-board').val('Please Select');
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
    if(boardFeeds && boardFeeds.length>0) {
      console.log("Completed!")
    } else {
      console.log("Board is empty!")
    }
  } else if(message.type && message.type === "progress_update") {
    const progress = message.progress
    log(progress)
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
  log("will load boards...")
  const username = usernameInput.val()
  log("username: ", username)

  port.postMessage({type: "FROM_POPUP_load_boards", username});
})

downloadSelectedBoardButton.on('click', e => {
  const boardId = $('#select-board option:selected').val()
  log("will download board => ", boardId)

  //port.postMessage({type: "FROM_POPUP_load_board_feeds", boardId});
  port.postMessage({type: "FROM_POPUP_download_board_feed_browser", boardId, downloadCount: -1});
})


/****************/
/***** CODE *****/
/****************/
port.postMessage({type: "FROM_POPUP_find_username"})
