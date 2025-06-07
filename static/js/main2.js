let captureIntervalId = null;
let ocrIntervalId = null;  // 新增變數追蹤 OCR 狀態

document.getElementById("shareScreenBtn").onclick = async function () {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    // 當使用者停止分享時，偵測並自動還原畫面
    stream.getVideoTracks()[0].addEventListener("ended", () => {
      resetScreen();
    });

    const video = document.getElementById("screenVideo");
    video.srcObject = stream;
    video.style.display = "block";

    // 當影片流開始播放時，啟動定時截圖
    video.onloadedmetadata = () => {
      startCaptureLoop(video);
    };
  } catch (err) {
    alert(`無法分享螢幕：${err}`);
  }
};

document.getElementById("ocrBtn").onclick = async function () {
  // 如果正在執行 OCR，點擊後就停止
  if (ocrIntervalId) {
    clearInterval(ocrIntervalId);
    ocrIntervalId = null;
    console.log("停止 OCR 辨識");
    return;
  }

  const canvas = document.getElementById("canvas");
  if (canvas.width === 0 || canvas.height === 0) {
    alert("目前沒有可辨識的畫面！");
    return;
  }

  const worker = await Tesseract.createWorker("chi_tra", 1, {
    // logger: (m) => console.log("掃描進度:", m),
  });

  // 儲存每次嘗試的正確答案數量
  let attempts = [];  
  // 當前是第幾次嘗試
  let currentAttempt = 0;  

  // 新增常數映射表
  const MAPPING = {
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

  // 修改 performOCR 函數
  async function performOCR() {
    const ret = await worker.recognize(canvas);
    const text = ret.data.text;
    console.log("辨識結果:", text);

    // 尋找嘗試次數
    const attemptMatch = text.match(/第\s*(\d+)/);
    if (attemptMatch) {
      const attemptNumber = parseInt(attemptMatch[1]);
      
      // 如果看到第1次，重置記錄
      if (attemptNumber === 1) {
        attempts = [];
        currentAttempt = 1;
      } else {
        currentAttempt = attemptNumber;
      }

      // 尋找正確答案數量
      const correctMatch = text.match(/中\s*(\d+)\s*個/);
      if (correctMatch && currentAttempt <= 4) {
        const correctCount = parseInt(correctMatch[1]);
        attempts[currentAttempt - 1] = correctCount;
        
        console.log(`第 ${currentAttempt} 次嘗試，正確數量: ${correctCount}`);
        console.log('目前記錄:', attempts);

        // 當收集到4次數據時，進行對應查詢
        if (attempts.length === 4) {
          const key = attempts.join('');
          const result = MAPPING[key];
          
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
  console.log("開始 OCR 辨識");
};

document.getElementById("reset").onclick = function () {
  resetScreen();
};

function resetScreen() {
  // 停止螢幕分享
  const video = document.getElementById("screenVideo");
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    video.srcObject = null;
  }
  video.style.display = "none";

  // 清空 canvas
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = "none";

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

function startCaptureLoop(video) {
  const canvas = document.getElementById("canvas");
  canvas.style.display = "block";

  // // 監聽滑鼠移動事件，取得滑鼠座標
  // let mouseX = null;
  // let mouseY = null;

  // canvas.addEventListener("mousemove", function (e) {
  //   const rect = canvas.getBoundingClientRect();
  //   mouseX = e.clientX - rect.left;
  //   mouseY = e.clientY - rect.top;
  //   console.log(`滑鼠位置：(${mouseX}, ${mouseY})`);
  // });

  // function captureFrame() {
  //   // 動態調整 canvas 大小以符合影片
  //   canvas.width = video.videoWidth;
  //   canvas.height = video.videoHeight;
  //   const ctx = canvas.getContext("2d");
  //   ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  //   // 如果有滑鼠座標，畫一個圓點
  //   if (mouseX !== null && mouseY !== null) {
  //     ctx.beginPath();
  //     ctx.arc(mouseX, mouseY, 8, 0, 2 * Math.PI);
  //     ctx.fillStyle = "rgba(255,0,0,0.7)";
  //     ctx.fill();
  //     ctx.strokeStyle = "#fff";
  //     ctx.lineWidth = 2;
  //     ctx.stroke();
  //   }
  // }

  function captureDialogFrame() {
    const dialogParam = { xStart: 890, yStart: 605, xEnd: 1555, yEnd: 710 };    
    const dialogWidth = dialogParam.xEnd - dialogParam.xStart;
    const dialogHeight = dialogParam.yEnd - dialogParam.yStart;

    canvas.width = dialogWidth;
    canvas.height = dialogHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      video,
      dialogParam.xStart,
      dialogParam.yStart,
      dialogWidth,
      dialogHeight,
      0,
      0,
      dialogWidth,
      dialogHeight
    );
  }

  // 每500ms截圖一次
  if (captureIntervalId) clearInterval(captureIntervalId);
  captureIntervalId = setInterval(captureDialogFrame, 100);
}