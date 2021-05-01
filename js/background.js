window.pindow = {
  boards: [],
  board_feeds: [],
  username: "",
  ports: [],
  progress: {
    active: false,
    step: 0,
    total: 0,
    text: "", // 1 of 1000
    percent: 0
  }
};

const loadBoardResource = async username => {
  const queryData = {
    options: {
      //page_size: 1,
      username: username,
      isPrefetch:false,
      privacy_filter:"all",
      sort:"last_pinned_to",
      field_set_key:"profile_grid_item",
      filter_stories:false,
      group_by:"mix_public_private",
      include_archived:true,
      redux_normalize_feed:true,
      no_fetch_context_on_resource:false
    }
  }
  const serializedQueryData = JSON.stringify(queryData)
  const boardResourceUrl = `https://www.pinterest.com/resource/BoardsResource/get/?data=${serializedQueryData}`
  let result = await fetch(boardResourceUrl).then(r => r.text())
  result = JSON.parse(result)
  let data = result.resource_response.data; // boards

  console.log("resource_response", result.resource_response)

  let boards = []
  data.forEach(board => {
    boards.push({
      name: board.name,
      id: board.id,
      url: board.url,
      pinCount: board.pin_count
    })
  })

  return boards
}

const loadBoardFeedResource = async (boardId, oldBookmark, pageSize) => {
  const queryData = {
    options: {
      isPrefetch: false,
      board_id: boardId,
      sort: "default",
      layout: "default",
      page_size: typeof pageSize !== "undefined" && pageSize > 0 ? pageSize : 250
    }
  }

  if(typeof oldBookmark !== "undefined" && oldBookmark != null) {
    queryData.options['bookmarks'] = [oldBookmark]
  }

  const serializedQueryData = JSON.stringify(queryData)
  const boardResourceFeedUrl = `https://www.pinterest.com/resource/BoardFeedResource/get/?data=${serializedQueryData}`;
  let result = await fetch(boardResourceFeedUrl).then(r =>r.text())
  result = JSON.parse(result)
  const bookmark = result.resource_response.bookmark;
  const boardImagesData = result.resource_response.data;

  const data = []
  boardImagesData.forEach(boardImageData => {
    if(boardImageData.type === "pin") {
      data.push({
        dominantColor: boardImageData.dominant_color,
        id: boardImageData.id,
        image: boardImageData.images.orig // { width, height, url }
      })
    }
  })

  return {data, bookmark}
}

const loadBoardFeedResourceRecursive = async (boardId, feedCount) => {
  let oldBookmark = undefined
  let retData = []

  do {
    let {data, bookmark} = await loadBoardFeedResource(boardId, oldBookmark/*, feedCount*/)
    retData.push(...data)
    oldBookmark = bookmark
  } while(typeof oldBookmark !== "undefined" /*&& (retData.length < (feedCount || -1))*/)

  return retData
}

const getLatestPort = () => window.pindow.ports[window.pindow.ports.length-1]

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const fireProgressEvent = (progress) => {
  window.pindow.progress.active = typeof progress.active !== "undefined" ? progress.active : window.pindow.progress.active
  window.pindow.progress.step = typeof progress.step !== "undefined" ? progress.step : window.pindow.progress.step
  window.pindow.progress.total = typeof progress.total !== "undefined" ?  progress.total : window.pindow.progress.total
  window.pindow.progress.text = `Downloaded ${window.pindow.progress.step} of ${window.pindow.progress.total}`
  window.pindow.progress.percent = Math.floor(window.pindow.progress.step / window.pindow.progress.total * 100)

  const latestPort = getLatestPort()
  latestPort.postMessage({type: "progress_update", progress: window.pindow.progress});
}


chrome.runtime.onMessage.addListener((message) => {
  if(message.type && message.type === "FROM_CONTENT_result_username") {
    window.pindow.username = message.username || ""
    const latestPort = getLatestPort()
    if(typeof latestPort !== "undefined") {
      latestPort.postMessage({type: "FROM_BG_result_username", username: window.pindow.username});
    }
  }
})

chrome.extension.onConnect.addListener(function(port) {
  window.pindow.ports.push(port)

  port.onMessage.addListener(function(message) {
    if(message.type === "FROM_POPUP_load_boards") {
      console.log("sended to content")
      const username = message.username

      // find boards....
      loadBoardResource(username).then(boards => {
        window.pindow.boards = boards || [];
        const latestPort = getLatestPort()
        if(typeof latestPort !== "undefined") {
          latestPort.postMessage({type: "FROM_BG_result_boards", boards: window.pindow.boards});
        }
      })
    } else if(message.type === "FROM_POPUP_find_username") {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "FROM_BG_find_username" });
      });
    } else if(message.type === "FROM_POPUP_download_board_feed_browser") {
      const boardId = message.boardId
      let feedCount = message.downloadCount || -1
      loadBoardFeedResourceRecursive(boardId, feedCount).then(board_feeds => {
        console.log("background-  result - board-feed ", board_feeds)
        window.pindow.board_feeds = board_feeds || [];

        // download feeds...
        let boardFeeds = window.pindow.board_feeds;
        feedCount = feedCount <= 0 ? boardFeeds.length : feedCount

        fireProgressEvent({
          active: true,
          step: 0,
          total: feedCount,
        })

        for(let i = 0; i < feedCount; i++) {
          sleep(500).then(() => {
            let feed = boardFeeds[i];
            let imageName = `${feed.id}_${feed.dominantColor}_${feed.image.width}_${feed.image.height}.jpg`
            let url = feed.image.url

            chrome.downloads.download({
              url: url,
              filename: imageName
            });

            fireProgressEvent({
              step: window.pindow.progress.step + 1,
            })
          })
        }

        const latestPort = getLatestPort()
        if(typeof latestPort !== "undefined") {
          latestPort.postMessage({type: "FROM_BG_result_download_board_feed_browser", boardFeeds: window.pindow.board_feeds});
        }

      })
    } else if(message.type === "FROM_POPUP_download_board_feed_gdrive") {
      //TODO: support save boards to google drive
    }
  });
})
