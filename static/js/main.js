const videoParam = { width: 1920, height: 1200, wDelta: 2, hDelta: 32 };
const defaultTimesParams = { color: "red", xStart: 855, yStart: 552, xEnd: 882, yEnd: 580 };
const defaultResultParams = { color: "blue", xStart: 808, yStart: 590, xEnd: 835, yEnd: 618 };

let mapNameWorker = null;
let mapNameProgress = 0
let dialogWorker = null;
let dialogProgress = 0;

let timesWorker = null;
let timesProgress = 0;
let resultWorker = null;
let resultProgress = 0;

let captureMousemoveEventId = null;
let captureIntervalId = null;
let ocrIntervalId = null;

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
let manualInput = false;
let attempts = [null, null, null, null];
let result = null;

// 定義頁面元素變數
const shareScreenBtn = document.getElementById("shareScreenBtn");
const ocrBtn = document.getElementById("ocrBtn");
const ocrPauseBtn = document.getElementById("ocrPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const clear = document.getElementById("clear");
const videoState = document.getElementById("videoState");
const videoInfo = document.getElementById("videoInfo");
const screenVideo = document.getElementById("screenVideo");
const coordinate = document.getElementById("coordinate");
const capture = document.getElementById("capture");
const mark1 = document.getElementById("mark1");
const mark2 = document.getElementById("mark2");
const resultInput1 = document.getElementById("resultInput1");
const resultInput2 = document.getElementById("resultInput2");
const resultInput3 = document.getElementById("resultInput3");
const resultInput4 = document.getElementById("resultInput4");
const answer = document.getElementById("answer");

function calcParams(params) {
  return {
    color: params.color,
    xStart: params.xStart,
    yStart: params.yStart,
    xEnd: params.xEnd,
    yEnd: params.yEnd,
    width: params.xEnd - params.xStart,
    height: params.yEnd - params.yStart
  };
}

function captureRect(id, options) {
  const rect = document.getElementById(id);

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

async function createWorkers() {
  timesWorker = await Tesseract.createWorker("eng", 1, {
    logger: m => {
      if (m.status === "recognizing text") {
        timesProgress = Math.round(m.progress * 100);
        // console.log(`timesWorker 掃描進度： ${timesProgress}%`);
      }
    },
  });
  await timesWorker.setParameters({
    tesseract_char_whitelist: '0123456789'
  });

  resultWorker = await Tesseract.createWorker("eng", 1, {
    logger: m => {
      if (m.status === "recognizing text") {
        resultProgress = Math.round(m.progress * 100);
        // console.log(`resultWorker 掃描進度： ${resultProgress}%`);
      }
    },
  });
  await resultWorker.setParameters({
    tesseract_char_whitelist: '0123456789'
  });
}

function processCapture() {
  // 動態調整 capture 大小以符合影片
  capture.width = screenVideo.videoWidth;
  capture.height = screenVideo.videoHeight;

  // 監聽滑鼠移動事件，取得滑鼠座標
  capture.onmousemove = function (e) {
    const captureRect = e.target.getBoundingClientRect();
    let mouseX = e.clientX - captureRect.left;
    let mouseY = e.clientY - captureRect.top;

    if (mouseX !== null && mouseY !== null) {
      coordinate.textContent = `座標位置：(${mouseX.toFixed(0)}, ${mouseY.toFixed(0)})`;
    }
  };

  const captureCtx = capture.getContext("2d");
  captureCtx.drawImage(screenVideo, 0, 0, capture.width, capture.height);

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

  // times
  captureRect("mark1", calcParams(defaultTimesParams));
  drawStrokeRect(captureCtx, calcParams(defaultTimesParams));
  // result
  captureRect("mark2", calcParams(defaultResultParams));
  drawStrokeRect(captureCtx, calcParams(defaultResultParams));
}

function startCaptureLoop() {
  // 每200ms截圖一次
  if (captureIntervalId) clearInterval(captureIntervalId);
  captureIntervalId = setInterval(processCapture, 100);
}

function resetScreen() {
  shareScreenBtn.disabled = false;
  ocrBtn.disabled = true;
  ocrPauseBtn.disabled = true;
  resetBtn.disabled = true;

  videoState.textContent = "";
  resultInput1.value = "";
  resultInput2.value = "";
  resultInput3.value = "";
  resultInput4.value = "";
  answer.textContent = "";

  manualInput = false;
  attempts = [null, null, null, null];
  result = null;

  // 停止螢幕分享
  if (screenVideo.srcObject) {
    const tracks = screenVideo.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    screenVideo.srcObject = null;

    if (timesWorker) {
      timesWorker.terminate();
      timesWorker = null;
    }
    if (resultWorker) {
      resultWorker.terminate();
      resultWorker = null;
    }
  }

  videoInfo.textContent = "";
  coordinate.textContent = "";

  // 清空 canvas
  const captureCtx = capture.getContext("2d");
  captureCtx.clearRect(0, 0, capture.width, capture.height);

  capture.onmousemove = null;
  capture.width = 0;
  capture.height = 0;

  const mark1Params = calcParams(defaultTimesParams)
  const mark1Ctx = mark1.getContext("2d");
  mark1Ctx.clearRect(0, 0, mark1Params.width, mark1Params.height);

  mark1.width = 0;
  mark1.height = 0;

  const mark2Params = calcParams(defaultResultParams);
  const mark2Ctx = mark2.getContext("2d");
  mark2Ctx.clearRect(0, 0, mark2Params.width, mark2Params.height);

  mark2.width = 0;
  mark2.height = 0;

  // 停止定時截圖
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }

  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
  }

  document.body.className = ""; // 清除背景色
}

// 辨識次數與正確數量
async function recognizeTimesAndResult() {
  if (!timesWorker || !resultWorker) {
    console.log("worker 尚未初始化");
    return null;
  }

  if (capture.width === 0 || capture.height === 0) {
    console.log("目前沒有可辨識的畫面！");
    return null;
  }

  const timesParams = calcParams(defaultTimesParams);
  const { data: { text: timesText, confidence: timesConfidence } } = await timesWorker.recognize(capture, {
    rectangle: {
      left: timesParams.xStart,
      top: timesParams.yStart,
      width: timesParams.width,
      height: timesParams.height,
    }
  });

  console.log(`次數辨識文字：${new String(timesText).trim()} 信心度：${timesConfidence}%`);

  const resultParams = calcParams(defaultResultParams);
  const { data: { text: resultText, confidence: resultConfidence } } = await resultWorker.recognize(capture, {
    rectangle: {
      left: resultParams.xStart,
      top: resultParams.yStart,
      width: resultParams.width,
      height: resultParams.height,
    }
  });

  console.log(`結果辨識文字：${new String(resultText).trim()} 信心度：${resultConfidence}%`);

  return {
    timesText,
    timesConfidence,
    resultText,
    resultConfidence
  };
}

// 計算答案與更新畫面
function updateAttemptsAndAnswer(attemptNumber, resultNumber) {
  attempts[attemptNumber - 1] = resultNumber;

  // 閃爍效果
  // document.body.className = "flash";
  // 檢查是否所有值都已填入（沒有 null）
  const isComplete = attempts.filter(x => x !== null).length === 4;

  setTimeout(() => {
    document.body.className = isComplete ? (result ? "found" : "error") : "searching";
  }, 250);

  if (isComplete) {
    const key = attempts.join("");

    result = resultMapping[key];

    if (result) {
      console.log('找到對應答案:', result);
      answer.textContent = `答案: ${result}`; // 在畫面上顯示答案
    } else {
      console.log('錯誤：沒有找到對應答案');
      answer.textContent = '無法找到對應答案'; // 顯示錯誤訊息
    }
  } else {
    answer.textContent = `收集中: ${attempts.join(",")}`; // 顯示目前收集的數據
  }

  console.log(`收集結果：[${attempts.join(",")}]`);
}

function checkInputValue(currentInput) {
  const val = currentInput.value;
  // 只允許 0, 1, 2
  if (!/^[012]$/.test(val)) {
    currentInput.value = '';
    return false;
  }

  return true;
}

function resetAttemptsAndStatus(attemptNumber) {
  const shouldReset = !manualInput && attemptNumber === 1 && !attempts.includes(null);

  if (shouldReset) {
    attempts = [null, null, null, null];
    answer.textContent = "";

    document.body.className = "searching";
  }
}

function handleResultInput(attemptNumber) {
  let nextId = attemptNumber + 1;
  if (attemptNumber === 4) {
    nextId = 1;
  }

  const nextInputId = `resultInput${nextId}`;
  const nextInputElement = document.getElementById(nextInputId);
  if (nextInputElement) {
    nextInputElement.focus();
    nextInputElement.select();
  } else {
    console.error(`找不到 ID 為 ${nextInputId} 的輸入欄位`);
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
    // 當影片流開始播放時，啟動定時截圖
    screenVideo.onloadedmetadata = async () => {
      await createWorkers();
      startCaptureLoop();

      videoState.textContent = "錄影中，請微笑XD";

      videoInfo.textContent = `影片寬度：${screenVideo.videoWidth}, 高度：${screenVideo.videoHeight}`;

      shareScreenBtn.disabled = true;
      ocrBtn.disabled = false;
      resetBtn.disabled = false;
    };
  } catch (err) {
    console.error("無法分享螢幕：", err);
  }
};

ocrBtn.onclick = async function () {
  this.disabled = true;
  ocrPauseBtn.disabled = false;

  videoState.textContent = "OCR 辨識中...";
  resultInput1.value = "";
  resultInput2.value = "";
  resultInput3.value = "";
  resultInput4.value = "";
  answer.textContent = "";

  manualInput = false;
  attempts = [null, null, null, null];
  result = null;

  async function performOCR() {
    if (manualInput) {
      ocrPauseBtn.click();
      return;
    }

    const ocrResult = await recognizeTimesAndResult();
    if (!ocrResult) return;

    // 尋找嘗試次數
    const attemptMatch = ocrResult.timesText.match(/\s*(\d+)\s*/);
    if (!attemptMatch) {
      return;
    }

    const attemptNumber = parseInt(attemptMatch[1]);
    // 檢查數字是否合理
    if (attemptNumber < 1 || attemptNumber > 4) {
      return;
    }

    resetAttemptsAndStatus(attemptNumber);

    // 尋找正確答案數量
    const resultMatch = ocrResult.resultText.match(/\s*(\d+)\s*/);
    if (!resultMatch) {
      return;
    }

    const resultNumber = parseInt(resultMatch[1]);
    if (!/^[012]$/.test(resultNumber)) {
      return;
    }

    updateAttemptsAndAnswer(attemptNumber, resultNumber);

    const inputId = `resultInput${attemptNumber}`;
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      inputElement.value = resultNumber;
    } else {
      console.error(`找不到 ID 為 ${inputId} 的輸入欄位`);
    }
  }

  // 建立定時執行的 OCR 函數
  // 立即執行一次，然後每秒執行一次
  await performOCR();
  ocrIntervalId = setInterval(performOCR, 500);
};

ocrPauseBtn.onclick = function () {
  this.disabled = true;
  ocrBtn.disabled = false;

  videoState.textContent = "OCR 已暫停...";

  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
  }
};

resetBtn.onclick = function () {
  resetScreen();
};

resultInput1.onfocus = function () {
  this.select();
};
resultInput1.oninput = function (e) {
  const attemptNumber = 1;

  manualInput = true;
  if (checkInputValue(this)) {
    updateAttemptsAndAnswer(attemptNumber, parseInt(this.value));
    handleResultInput(attemptNumber);
  }

  e.preventDefault();
};

resultInput2.onfocus = function () {
  this.select();
};
resultInput2.oninput = function (e) {
  const attemptNumber = 2;

  manualInput = true;
  if (checkInputValue(this)) {
    updateAttemptsAndAnswer(attemptNumber, parseInt(this.value));
    handleResultInput(attemptNumber);
  }

  e.preventDefault();
};
resultInput3.onfocus = function () {
  this.select();
};
resultInput3.oninput = function (e) {
  const attemptNumber = 3;

  manualInput = true;
  if (checkInputValue(this)) {
    updateAttemptsAndAnswer(attemptNumber, parseInt(this.value));
    handleResultInput(attemptNumber);
  }

  e.preventDefault();
};

resultInput4.onfocus = function () {
  this.select();
};
resultInput4.oninput = function (e) {
  const attemptNumber = 4;

  manualInput = true;
  if (checkInputValue(this)) {
    updateAttemptsAndAnswer(attemptNumber, parseInt(this.value));
    handleResultInput(attemptNumber);
  }

  e.preventDefault();
};

clear.onclick = function () {
  resultInput1.value = "";
  resultInput2.value = "";
  resultInput3.value = "";
  resultInput4.value = "";
  answer.textContent = "";

  manualInput = false;
  attempts = [null, null, null, null];
  result = null;

  document.body.className = ""; // 清除背景色
};