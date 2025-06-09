const videoParam = { width: 1922, height: 1232 };
const defaultMapNameParams = { color: "red", xStart: 85, yStart: 105, xEnd: 300, yEnd: 140 };
const defaultDialogParams = { color: "blue", xStart: 740, yStart: 490, xEnd: 1440, yEnd: 710 };
const defaultTimesParams = { color: "red", xStart: 855, yStart: 572, xEnd: 882, yEnd: 600 };
const defaultResultParams = { color: "blue", xStart: 805, yStart: 600, xEnd: 832, yEnd: 628 };

let mapNameWorker = null;
let mapNameProgress = 0
let dialogWorker = null;
let dialogProgress = 0;

let timesWorker = null;
let timesProgress = 0;
let resultWorker = null;
let resultProgress = 0;

let videoScale = 1;

let captureIntervalId = null;
let ocrIntervalId = null;

// 定義頁面元素變數
const shareScreenBtn = document.getElementById("shareScreenBtn");
const ocrBtn1 = document.getElementById("ocrBtn1");
const ocrBtn2 = document.getElementById("ocrBtn2");
const ocrPauseBtn = document.getElementById("ocrPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const videoInfo = document.getElementById("videoInfo");
const screenVideo = document.getElementById("screenVideo");
const coordinate = document.getElementById("coordinate");
const capture = document.getElementById("capture");
const mark1 = document.getElementById("mark1");
const mark2 = document.getElementById("mark2");
const mark3 = document.getElementById("mark3");
const mark4 = document.getElementById("mark4");

function getParamsByScale(params, scale) {
  return {
    color: params.color,
    xStart: Math.round(params.xStart * scale),
    yStart: Math.round(params.yStart * scale),
    xEnd: Math.round(params.xEnd * scale),
    yEnd: Math.round(params.yEnd * scale),
    width: Math.round((params.xEnd - params.xStart) * scale),
    height: Math.round((params.yEnd - params.yStart) * scale)
  };
}

function captureRect(id, options) {
  const rect = document.getElementById(id);
  rect.style.display = "block";

  rect.width = options.width;
  rect.height = options.height;
  const ctx = rect.getContext("2d");
  ctx.drawImage(
    screenVideo,
    options.xStart,
    options.yStart,
    options.width,
    options.height,
    0,
    0,
    options.width,
    options.height
  );
}

function drawStrokeRect(ctx, options) {
  ctx.strokeStyle = options.color || "black";
  ctx.lineWidth = 2; options.xStart
  ctx.strokeRect(options.xStart, options.yStart, options.width, options.height);
}

function processCapture(video) {
  // 動態調整 capture 大小以符合影片
  capture.width = video.videoWidth;
  capture.height = video.videoHeight;
  capture.style.display = "block";

  // 監聽滑鼠移動事件，取得滑鼠座標
  capture.addEventListener("mousemove", function (e) {
    const captureRect = e.target.getBoundingClientRect();
    let mouseX = e.clientX - captureRect.left;
    let mouseY = e.clientY - captureRect.top;

    if (mouseX !== null && mouseY !== null) {
      coordinate.textContent = `滑鼠位置：(${mouseX.toFixed(0)}, ${mouseY.toFixed(0)})`;
      coordinate.style.display = "block";
    }
  });

  const captureCtx = capture.getContext("2d");
  captureCtx.drawImage(video, 0, 0, capture.width, capture.height);

  // 加強對比度
  const imageData = captureCtx.getImageData(0, 0, capture.width, capture.height);
  const threshold = 210; // 灰階閾值
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // 灰階公式：0.299*R + 0.587*G + 0.114*B
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray > threshold ? 255 : 0; // 將灰階值轉為黑白
  }
  captureCtx.putImageData(imageData, 0, 0);

  // map name
  captureRect("mark1", getParamsByScale(defaultMapNameParams, videoScale));
  drawStrokeRect(captureCtx, getParamsByScale(defaultMapNameParams, videoScale));
  // dialog
  captureRect("mark2", getParamsByScale(defaultDialogParams, videoScale));
  drawStrokeRect(captureCtx, getParamsByScale(defaultDialogParams, videoScale));
  // times
  captureRect("mark3", getParamsByScale(defaultTimesParams, videoScale));
  drawStrokeRect(captureCtx, getParamsByScale(defaultTimesParams, videoScale));
  // result
  captureRect("mark4", getParamsByScale(defaultResultParams, videoScale));
  drawStrokeRect(captureCtx, getParamsByScale(defaultResultParams, videoScale));
}

function startCaptureLoop(video) {
  // 每200ms截圖一次
  if (captureIntervalId) clearInterval(captureIntervalId);
  captureIntervalId = setInterval(() => processCapture(video), 200);
}


function resetScreen() {
  shareScreenBtn.disabled = false;
  ocrBtn1.disabled = true;
  ocrBtn2.disabled = true;
  ocrPauseBtn.disabled = true;
  resetBtn.disabled = true;


  videoInfo.textContent = "";
  videoInfo.style.display = "none";

  // 停止螢幕分享
  if (screenVideo.srcObject) {
    const tracks = screenVideo.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    screenVideo.srcObject = null;
  }
  screenVideo.style.display = "none";

  coordinate.textContent = "";
  coordinate.style.display = "none";

  // 清空 canvas
  const captureCtx = capture.getContext("2d");
  captureCtx.clearRect(0, 0, capture.width, capture.height);
  capture.style.display = "none";

  const mark1Ctx = mark1.getContext("2d");
  mark1Ctx.clearRect(0, 0, capture.width, capture.height);
  mark1.style.display = "none";

  const mark2Ctx = mark2.getContext("2d");
  mark2Ctx.clearRect(0, 0, capture.width, capture.height);
  mark2.style.display = "none";

  const mark3Ctx = mark3.getContext("2d");
  mark3Ctx.clearRect(0, 0, capture.width, capture.height);
  mark3.style.display = "none";

  const mark4Ctx = mark4.getContext("2d");
  mark4Ctx.clearRect(0, 0, capture.width, capture.height);
  mark4.style.display = "none";

  // 停止定時截圖
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }

  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
  }
}

shareScreenBtn.onclick = async function () {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    // 當使用者停止分享時，偵測並自動還原畫面
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      resetScreen();
    });

    screenVideo.srcObject = stream;
    screenVideo.style.display = "block";

    // 當影片流開始播放時，啟動定時截圖
    screenVideo.onloadedmetadata = async () => {
      shareScreenBtn.disabled = true;
      ocrBtn1.disabled = false;
      ocrBtn2.disabled = false;
      resetBtn.disabled = false;

      videoInfo.textContent = `辨識影像中...`;
      // videoInfo.textContent = `影片寬度：${video.videoWidth}, 高度：${video.videoHeight}`;
      videoInfo.style.display = "block";


      videoScale = screenVideo.videoWidth / videoParam.width;

      startCaptureLoop(screenVideo);

      mapNameWorker = await Tesseract.createWorker("chi_tra", 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            mapNameProgress = Math.round(m.progress * 100);
            console.log(`mapNameWorker 掃描進度： ${mapNameProgress}%`);
          }
        },
      });

      dialogWorker = await Tesseract.createWorker("chi_tra", 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            dialogProgress = Math.round(m.progress * 100);
            console.log(`dialogWorker 掃描進度： ${dialogProgress}%`);
          }
        },
      });

      timesWorker = await Tesseract.createWorker("eng", 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            timesProgress = Math.round(m.progress * 100);
            console.log(`timesWorker 掃描進度： ${timesProgress}%`);
          }
        },
      });

      resultWorker = await Tesseract.createWorker("eng", 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            resultProgress = Math.round(m.progress * 100);
            console.log(`resultWorker 掃描進度： ${resultProgress}%`);
          }
        },
      });
    };
  } catch (err) {
    alert(`無法分享螢幕：${err}`);
  } finally {
    if (mapNameWorker) {
      mapNameWorker.terminate();
      mapNameWorker = null;
    }
    if (dialogWorker) {
      dialogWorker.terminate();
      dialogWorker = null;
    }
    if (timesWorker) {
      timesWorker.terminate();
      timesWorker = null;
    }
    if (resultWorker) {
      resultWorker.terminate();
      resultWorker = null;
    }
  }
};

ocrBtn1.onclick = async function () {
  if (capture.width === 0 || capture.height === 0) {
    alert("目前沒有可辨識的畫面！");
    return;
  }

  try {
    const mapNameParam = getParamsByScale(defaultMapNameParams, videoScale);
    const { data: { text: mapNameText, confidence: mapNameConfidence } } = await mapNameWorker.recognize(capture, {
      rectangle: {
        left: mapNameParam.xStart,
        top: mapNameParam.yStart,
        width: mapNameParam.width,
        height: mapNameParam.height,
      }
    });

    alert(`地圖名稱辨識文字：${mapNameText}`)
    if (mapNameConfidence < 60) {
      alert(`地圖名稱信心度較低: ${mapNameConfidence}%，結果可能不準確`);
      return;
    }

    const dialogParams = getParamsByScale(defaultDialogParams, videoScale);
    const { data: { text: dialogText, confidence: dialogConfidence } } = await dialogWorker.recognize(capture, {
      rectangle: {
        left: dialogParams.xStart,
        top: dialogParams.yStart,
        width: dialogParams.width,
        height: dialogParams.height,
      }
    });


    alert(`結果辨識文字：${dialogText}`)
    if (dialogConfidence < 60) {
      alert(`結果信心度較低: ${dialogConfidence}%，結果可能不準確`);
      return;
    }
  } catch (err) {
    console.error("辨識失敗：", err);
    alert("辨識失敗。");
  }
};

ocrBtn2.onclick = async function () {
  ocrBtn2.disabled = true;
  ocrPauseBtn.disabled = false;

  // 常數映射表
  const resultMapping = {
    "0011": "211",
    "0101": "121",
    "0110": "112",
    "1011": "022",
    "1012": "031",
    "1021": "013",
    "1101": "202",
    "1102": "301",
    "1110": "220",
    "1120": "310",
    "1201": "103",
    "1210": "130",
    "2112": "004",
    "2121": "040",
    "2211": "400",
  };

  // 儲存每次嘗試的正確答案數量
  let attempts = [];
  // 當前是第幾次嘗試
  let currentAttempt = 0;

  // 修改 performOCR 函數
  async function performOCR() {
    console.log("開始 OCR 辨識");

    if (capture.width === 0 || capture.height === 0) {
      console.log("目前沒有可辨識的畫面！");
      return;
    }

    if (!timesWorker || !resultWorker) {
      console.log("worker 尚未初始化");
      return;
    }

    const timesParams = getParamsByScale(defaultTimesParams, videoScale);
    const { data: { text: timesText, confidence: timesConfidence } } = await timesWorker.recognize(capture, {
      rectangle: {
        left: timesParams.xStart,
        top: timesParams.yStart,
        width: timesParams.width,
        height: timesParams.height,
      }
    });

    console.log(`次數辨識文字：${timesText}`)
    if (timesConfidence < 60) {
      console.log(`次數信心度較低: ${timesConfidence}%，結果可能不準確`);
    }

    const resultParams = getParamsByScale(defaultResultParams, videoScale);
    const { data: { text: resultText, confidence: resultConfidence } } = await resultWorker.recognize(capture, {
      rectangle: {
        left: resultParams.xStart,
        top: resultParams.yStart,
        width: resultParams.width,
        height: resultParams.height,
      }
    });

    console.log(`結果辨識文字：${resultText}`)
    if (resultConfidence < 60) {
      console.log(`結果信心度較低: ${resultConfidence}%，結果可能不準確`);
    }

    // 尋找嘗試次數
    const attemptMatch = timesText.match(/\s*(\d+)\s*/);
    if (attemptMatch) {
      const attemptNumber = parseInt(attemptMatch[1]);

      // 如果看到第1次，重置記錄
      if (currentAttempt != 0 && attemptNumber === 1) {
        attempts = [];
        currentAttempt = 1;
      } else {
        currentAttempt = attemptNumber;
      }

      // 尋找正確答案數量
      const correctMatch = resultText.match(/\s*(\d+)\s*/);
      if (correctMatch && currentAttempt <= 4) {
        const correctCount = parseInt(correctMatch[1]);
        attempts[currentAttempt - 1] = correctCount;

        console.log(`第 ${currentAttempt} 次嘗試，正確數量: ${correctCount}`);
        console.log('目前記錄:', attempts);

        // 當收集到4次數據時，進行對應查詢
        if (attempts.length === 4) {
          const key = attempts.join('');
          const result = resultMapping[key];

          if (result) {
            console.log('找到對應答案:', result);
          } else {
            console.log('錯誤：沒有找到對應答案');
          }
        }
      }
    }
  }

  // 建立定時執行的 OCR 函數
  // 立即執行一次，然後每秒執行一次
  await performOCR();
  ocrIntervalId = setInterval(performOCR, 1000);
};

ocrPauseBtn.onclick = function () {
  this.disabled = true;
  ocrBtn2.disabled = false;

  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
  }
};

resetBtn.onclick = function () {
  resetScreen();
};