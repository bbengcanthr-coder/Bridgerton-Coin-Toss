import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDd4WVD3kt7CNcakfS-PpULjW0SlEqTD_g",
  authDomain: "date-with-bcu.firebaseapp.com",
  databaseURL: "https://date-with-bcu-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "date-with-bcu",
  storageBucket: "date-with-bcu.firebasestorage.app",
  messagingSenderId: "832560147194",
  appId: "1:832560147194:web:f01ca66cfdf1194a377743",
  measurementId: "G-FWFRH70QG1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const actionBtn = document.getElementById('actionBtn');
const viewBoardBtn = document.getElementById('viewBoardBtn');
const backBtn = document.getElementById('backBtn');
const coin = document.getElementById('coin');
const coinText = document.getElementById('coin-text');
const distanceResult = document.getElementById('distance-result');
const displayName = document.getElementById('display-name');
const leaderboardList = document.getElementById('leaderboard-list');

const anglePointer = document.getElementById('angle-pointer');
const powerFill = document.getElementById('power-fill');

// Game States & Variables
let currentPlayer = "";
let gameState = "init"; // init, swing, power, tossed, has_played
let angleVal = 0;
let angleDirection = 1; 
let powerVal = 0;
let powerDirection = 1;
let animationFrameId;

// 1. ตรวจสอบและลงชื่อเข้าเล่น (1 สิทธิ์ต่อคน)
startBtn.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert("โปรดกรอกนามของท่านก่อน!");

    startBtn.disabled = true;
    startBtn.textContent = "กำลังตรวจสอบบัญชีรายชื่อ...";

    // ตรวจสอบขั้นที่ 1: ตรวจสอบจาก LocalStorage ของเครื่อง
    const localPlayed = localStorage.getItem(`played_${name.toLowerCase()}`);
    
    // ตรวจสอบขั้นที่ 2: ดึงข้อมูลจากฐานข้อมูล Firebase ป้องกันการลบแคชเพื่อโกง
    const qCheck = query(collection(db, "toss_scores"), where("name", "==", name));
    const querySnapshot = await getDocs(qCheck);

    if (localPlayed || !querySnapshot.empty) {
        // หากเคยเล่นแล้ว ดึงสถิติเก่ามาโชว์
        let oldDistance = localPlayed || querySnapshot.docs[0].data().distance;
        currentPlayer = name;
        displayName.textContent = `เลดี้ / คุณชาย ${name}`;
        coinText.textContent = name.charAt(0).toUpperCase();
        distanceResult.textContent = `${parseFloat(oldDistance).toFixed(2)} m`;
        distanceResult.classList.remove('hidden');
        
        actionBtn.textContent = "ท่านใช้สิทธิ์ประลองไปแล้ว";
        actionBtn.disabled = true;
        gameState = "has_played";
        
        switchScreen(loginScreen, gameScreen);
    } else {
        // ด่านใหม่ยังไม่เคยเล่น
        currentPlayer = name;
        displayName.textContent = `เลดี้ / คุณชาย ${name}`;
        coinText.textContent = name.charAt(0).toUpperCase();
        switchScreen(loginScreen, gameScreen);
        startGaugeLoop();
    }
});

// 2. ระบบ Game Loop ควบคุมเกจวิ่ง (เหวี่ยงซ้ายขวา / แรงขึ้นลง)
function startGaugeLoop() {
    gameState = "swing";
    actionBtn.textContent = "ล็อกทิศทางการเหวี่ยง";
    
    function updateGauges() {
        if (gameState === "swing") {
            // วิ่งซ้ายขวาจาก -50% ถึง 50%
            angleVal += angleDirection * 2.5; 
            if (angleVal > 46 || angleVal < -46) angleDirection *= -1;
            anglePointer.style.left = `calc(50% + ${angleVal}%)`;
        } 
        else if (gameState === "power") {
            // พลังงานวิ่งขึ้นลง 0% ถึง 100%
            powerVal += powerDirection * 3;
            if (powerVal > 100 || powerVal < 0) powerDirection *= -1;
            powerFill.style.width = `${powerVal}%`;
        }
        
        if (gameState === "swing" || gameState === "power") {
            animationFrameId = requestAnimationFrame(updateGauges);
        }
    }
    animationFrameId = requestAnimationFrame(updateGauges);
}

// 3. ระบบกดล็อก 2 จังหวะและการโยน
actionBtn.addEventListener('click', async () => {
    if (gameState === "swing") {
        gameState = "power";
        actionBtn.textContent = "ล็อกแรงปา (โยนทันที!)";
    } 
    else if (gameState === "power") {
        gameState = "tossed";
        actionBtn.disabled = true;
        actionBtn.textContent = "เหรียญกำลังลอยไป...";
        cancelAnimationFrame(animationFrameId);

        // สูตรคำนวณระยะทางจากฝีมือ: 
        // - แรงเต็มร้อย (powerVal) ปาได้ไกลสูงสุด 35 เมตร
        // - ทิศทางการเหวี่ยง (angleVal) ยิ่งห่างตรงกลาง (0) ยิ่งหักล้างระยะทางลง (ทำมุมเบี้ยวปาได้ไม่ไกล)
        const baseDistance = (powerVal / 100) * 35;
        const penalty = Math.abs(angleVal) * 0.4;
        let finalDistance = baseDistance - penalty;
        if (finalDistance < 0) finalDistance = 0.12; // ไม่ติดลบ

        // เล่นแอนิเมชันเหรียญพุ่ง (พุ่งตามทิศทางที่เหวี่ยงจริง)
        coin.style.transform = `translate(${angleVal * 2.5}px, -350px) scale(0.3) rotate(1080deg)`;
        coin.style.opacity = "0";

        setTimeout(async () => {
            distanceResult.textContent = `${finalDistance.toFixed(2)} m`;
            distanceResult.classList.remove('hidden');
            actionBtn.textContent = "สิ้นสุดการประลองของท่าน";

            // บันทึกคะแนนลง Firebase
            try {
                await addDoc(collection(db, "toss_scores"), {
                    name: currentPlayer,
                    distance: parseFloat(finalDistance.toFixed(2)),
                    timestamp: new Date()
                });
                // ล็อกในเครื่องซ้ำอีกชั้นกันเหนียว
                localStorage.setItem(`played_${currentPlayer.toLowerCase()}`, finalDistance.toFixed(2));
            } catch (e) {
                console.error("Error saving score: ", e);
            }
        }, 1200);
    }
});

// ดึงคะแนน 10 อันดับแรกแสดงผลแบบเรียลไทม์
const q = query(collection(db, "toss_scores"), orderBy("distance", "desc"), limit(10));
onSnapshot(q, (snapshot) => {
    leaderboardList.innerHTML = '';
    let rank = 1;
    snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement('li');
        li.innerHTML = `<span>${rank}. ${data.name}</span> <span>${data.distance.toFixed(2)} m</span>`;
        leaderboardList.appendChild(li);
        rank++;
    });
});

// ระบบสลับหน้าจอ
viewBoardBtn.addEventListener('click', () => switchScreen(gameScreen, leaderboardScreen));
backBtn.addEventListener('click', () => switchScreen(leaderboardScreen, gameScreen));

function switchScreen(hideScreen, showScreen) {
    hideScreen.classList.add('hidden');
    showScreen.classList.remove('hidden');
}
