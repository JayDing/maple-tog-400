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

function startCaptureLoop(video) {
  function captureFrame() {
    const canvas = document.getElementById("canvas");
    // 動態調整 canvas 大小以符合影片
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // canvas.style.display = "block";

    // 監聽滑鼠移動事件，取得滑鼠座標
    canvas.addEventListener("mousemove", function (e) {
      const rect = e.target.getBoundingClientRect();
      let mouseX = e.clientX - rect.left;
      let mouseY = e.clientY - rect.top;

      if (mouseX !== null && mouseY !== null) {
        const coordinate = document.getElementById("coordinate");
        coordinate.textContent = `滑鼠位置：(${mouseX.toFixed(0)}, ${mouseY.toFixed(0)})`;
        // coordinate.style.display = "block";
      }
    });

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 加強對比度
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const threshold = 210; // 灰階閾值
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // 灰階公式：0.299*R + 0.587*G + 0.114*B
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray > threshold ? 255 : 0; // 將灰階值轉為黑白
    }
    ctx.putImageData(imageData, 0, 0);

    // map name
    // captureRect("c1", getParamsByScale(defaultMapNameParams, videoScale));
    // drawStrokeRect(ctx, getParamsByScale(defaultMapNameParams, videoScale));
    // dialog
    // captureRect("c2", getParamsByScale(defaultDialogParams, videoScale));
    // drawStrokeRect(ctx, getParamsByScale(defaultDialogParams, videoScale));
    // times
    // captureRect("c3", getParamsByScale(defaultTimesParams, videoScale));
    // drawStrokeRect(ctx, getParamsByScale(defaultTimesParams, videoScale));
    // result
    // captureRect("c4", getParamsByScale(defaultResultParams, videoScale));
    // drawStrokeRect(ctx, getParamsByScale(defaultResultParams, videoScale));
  }

  function captureRect(id, options) {
    const canvas = document.getElementById(id);
    canvas.style.display = "block";

    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      video,
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

  // 每200ms截圖一次
  if (captureIntervalId) clearInterval(captureIntervalId);
  captureIntervalId = setInterval(captureFrame, 200);
}


function resetScreen() {
  const shareScreenBtn = document.getElementById("shareScreenBtn");
  shareScreenBtn.disabled = false;
  const ocrBtn1 = document.getElementById("ocrBtn1");
  ocrBtn1.disabled = true;
  const ocrBtn2 = document.getElementById("ocrBtn2");
  ocrBtn2.disabled = true;
  const resetBtn = document.getElementById("resetBtn");
  resetBtn.disabled = true;

  // 停止螢幕分享
  const video = document.getElementById("screenVideo");
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    video.srcObject = null;
  }
  video.style.display = "none";

  const videoInfo = document.getElementById("videoInfo");
  videoInfo.textContent = "";
  videoInfo.style.display = "none";

  const coordinate = document.getElementById("coordinate");
  coordinate.textContent = "";
  coordinate.style.display = "none";

  // 清空 canvas
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = "none";

  const c1 = document.getElementById("c1");
  const c1Ctx = canvas.getContext("2d");
  c1Ctx.clearRect(0, 0, canvas.width, canvas.height);
  c1.style.display = "none";

  const c2 = document.getElementById("c2");
  const c2Ctx = canvas.getContext("2d");
  c2Ctx.clearRect(0, 0, canvas.width, canvas.height);
  c2.style.display = "none";

  const c3 = document.getElementById("c3");
  const c3Ctx = canvas.getContext("2d");
  c3Ctx.clearRect(0, 0, canvas.width, canvas.height);
  c3.style.display = "none";

  const c4 = document.getElementById("c4");
  const c4Ctx = canvas.getContext("2d");
  c4Ctx.clearRect(0, 0, canvas.width, canvas.height);
  c4.style.display = "none";

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

document.getElementById("shareScreenBtn").onclick = async function () {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    // 當使用者停止分享時，偵測並自動還原畫面
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      resetScreen();
    });

    const video = document.getElementById("screenVideo");
    video.srcObject = stream;
    // video.style.display = "block";

    // 當影片流開始播放時，啟動定時截圖
    video.onloadedmetadata = async () => {
      this.disabled = true;

      const ocrBtn1 = document.getElementById("ocrBtn1");
      ocrBtn1.disabled = false;
      const ocrBtn2 = document.getElementById("ocrBtn2");
      ocrBtn2.disabled = false;
      const resetBtn = document.getElementById("resetBtn");
      resetBtn.disabled = false;

      const videoInfo = document.getElementById("videoInfo");
      videoInfo.textContent = `辨識影像中...`;
      // videoInfo.textContent = `影片寬度：${video.videoWidth}, 高度：${video.videoHeight}`;
      videoInfo.style.display = "block";

      videoScale = video.videoWidth / videoParam.width;

      startCaptureLoop(video);

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

document.getElementById("ocrBtn1").onclick = async function () {
  const canvas = document.getElementById("canvas");
  if (canvas.width === 0 || canvas.height === 0) {
    alert("目前沒有可辨識的畫面！");
    return;
  }

  try {
    const mapNameParam = getParamsByScale(defaultMapNameParams, videoScale);
    const { data: { text: mapNameText, confidence: mapNameConfidence } } = await mapNameWorker.recognize(canvas, {
      rectangle: {
        left: mapNameParam.xStart,
        top: mapNameParam.yStart,
        width: mapNameParam.xEnd - mapNameParam.xStart,
        height: mapNameParam.yEnd - mapNameParam.yStart,
      }
    });

    alert(`地圖名稱辨識文字：${mapNameText}`)
    if (mapNameConfidence < 60) {
      alert(`地圖名稱信心度較低: ${mapNameConfidence}%，結果可能不準確`);
      return;
    }

    const dialogParams = getParamsByScale(defaultDialogParams, videoScale);
    const { data: { text: dialogText, confidence: dialogConfidence } } = await dialogWorker.recognize(canvas, {
      rectangle: {
        left: dialogParams.xStart,
        top: dialogParams.yStart,
        width: dialogParams.xEnd - dialogParams.xStart,
        height: dialogParams.yEnd - dialogParams.yStart,
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

document.getElementById("ocrBtn2").onclick = async function () {
  this.disabled = true;

  const ocrPauseBtn = document.getElementById("ocrPauseBtn");
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

    const canvas = document.getElementById("canvas");
    if (canvas.width === 0 || canvas.height === 0) {
      alert("目前沒有可辨識的畫面！");
      return;
    }

    const timesParams = getParamsByScale(defaultTimesParams, videoScale);
    const { data: { text: timesText, confidence: timesConfidence } } = await timesWorker.recognize(canvas, {
      rectangle: {
        left: timesParams.xStart,
        top: timesParams.yStart,
        width: timesParams.xEnd - timesParams.xStart,
        height: timesParams.yEnd - timesParams.yStart,
      }
    });

    console.log(`次數辨識文字：${timesText}`)
    if (timesConfidence < 60) {
      console.log(`次數信心度較低: ${timesConfidence}%，結果可能不準確`);
    }

    const resultParams = getParamsByScale(defaultResultParams, videoScale);
    const { data: { text: resultText, confidence: resultConfidence } } = await resultWorker.recognize(canvas, {
      rectangle: {
        left: resultParams.xStart,
        top: resultParams.yStart,
        width: resultParams.xEnd - resultParams.xStart,
        height: resultParams.yEnd - resultParams.yStart,
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

document.getElementById("ocrPauseBtn").onclick = function () {
  this.disabled = true;

  const ocrBtn2 = document.getElementById("ocrBtn2");
  ocrBtn2.disabled = false;

  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
  }
};

document.getElementById("resetBtn").onclick = function () {
  resetScreen();
};

