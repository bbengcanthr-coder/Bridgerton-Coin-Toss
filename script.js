// นำเข้าโมดูลจาก Firebase (ไม่ต้องลง npm ใช้ CDN ได้เลยบน Github Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// เริ่มต้นใช้งาน Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ตัวแปร DOM
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');

const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const tossBtn = document.getElementById('tossBtn');
const viewBoardBtn = document.getElementById('viewBoardBtn');
const backBtn = document.getElementById('backBtn');

const coin = document.getElementById('coin');
const coinText = document.getElementById('coin-text');
const distanceResult = document.getElementById('distance-result');
const displayName = document.getElementById('display-name');
const leaderboardList = document.getElementById('leaderboard-list');

let currentPlayer = "";
let isTossing = false;

// 1. เข้าสู่ระบบ (ใส่ชื่อ)
startBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        currentPlayer = name;
        displayName.textContent = `เลดี้ / คุณชาย ${name}`;
        coinText.textContent = name.charAt(0).toUpperCase(); // ตัวอักษรแรกบนเหรียญ
        switchScreen(loginScreen, gameScreen);
    } else {
        alert("โปรดลงนามของท่านก่อนเข้าร่วมประลอง");
    }
});

// 2. ระบบโยนเหรียญ
tossBtn.addEventListener('click', async () => {
    if (isTossing) return;
    isTossing = true;
    
    // รีเซ็ตเหรียญ
    coin.classList.remove('coin-tossed');
    distanceResult.classList.add('hidden');
    
    // ดีเลย์นิดหน่อยก่อนเล่นอนิเมชั่น
    setTimeout(() => {
        coin.classList.add('coin-tossed');
        
        // สุ่มระยะทาง (เช่น 5.00 ถึง 25.00 เมตร)
        const randomDistance = (Math.random() * 20 + 5).toFixed(2);
        
        // รอจนอนิเมชั่นจบ (1.5 วิ) ค่อยโชว์ผลและบันทึกลงฐานข้อมูล
        setTimeout(async () => {
            distanceResult.textContent = `${randomDistance} m`;
            distanceResult.classList.remove('hidden');
            
            // บันทึกข้อมูลลง Firestore (คอลเล็กชันชื่อ 'toss_scores')
            try {
                await addDoc(collection(db, "toss_scores"), {
                    name: currentPlayer,
                    distance: parseFloat(randomDistance),
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Error adding document: ", e);
            }
            
            isTossing = false;
        }, 1500);
    }, 50);
});

// 3. ระบบกระดานผู้นำ (Real-time Listener)
// ดึงข้อมูล 10 อันดับแรกที่โยนได้ไกลที่สุด
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

// นำทางหน้าจอ
viewBoardBtn.addEventListener('click', () => switchScreen(gameScreen, leaderboardScreen));
backBtn.addEventListener('click', () => switchScreen(leaderboardScreen, gameScreen));

function switchScreen(hideScreen, showScreen) {
    hideScreen.classList.add('hidden');
    showScreen.classList.remove('hidden');
}
