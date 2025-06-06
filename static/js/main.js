let captureIntervalId = null;

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
  const canvas = document.getElementById("canvas");
  if (canvas.width === 0 || canvas.height === 0) {
    alert("目前沒有可辨識的畫面！");
    return;
  }

  const worker = await Tesseract.createWorker("chi_tra", 1, {
    logger: (m) => console.log("掃描進度:", m),
  });

  const ret = await worker.recognize(canvas);
  console.log("辨識結果：", ret.data, ret.data.text);
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
    const dialogParam = { xStart: 790, yStart: 465, xEnd: 1555, yEnd: 710 };
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
  captureIntervalId = setInterval(captureDialogFrame, 500);
}
