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

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ตัวแปร UI
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const throwBtn = document.getElementById('throwBtn');
const coin = document.getElementById('coin');
const coinName = document.getElementById('coin-name');
const powerBar = document.getElementById('power-bar');
const anglePointer = document.getElementById('angle-pointer');

// ตัวแปรระบบเกม
let currentPlayer = "";
let isCharging = false;
let power = 0;
let powerDirection = 1;
let angle = 0;
let angleDirection = 1;
let animationInterval;
let angleInterval;

// ตรวจสอบว่าเคยเล่นแล้วหรือไม่ (ป้องกันเบื้องต้น)
if (localStorage.getItem('hasPlayedCoinToss')) {
    loginScreen.classList.remove('active');
    leaderboardScreen.classList.add('active');
    updateLeaderboard();
}

// 2. ระบบลงทะเบียน
startBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name === "") {
        alert("โปรดลงนามก่อนเข้าประลอง");
        return;
    }
    
    // ตรวจสอบในฐานข้อมูลว่าชื่อนี้เล่นไปหรือยัง (ป้องกันแบบเซิร์ฟเวอร์)
    database.ref('players/' + name).once('value', snapshot => {
        if (snapshot.exists()) {
            alert("ชื่อนี้เข้าร่วมการประลองไปแล้ว!");
        } else {
            currentPlayer = name;
            coinName.innerText = name;
            document.getElementById('display-name').innerText = "ผู้เล่น: " + name;
            
            loginScreen.classList.remove('active');
            gameScreen.classList.add('active');
            startMeters();
        }
    });
});

// 3. ระบบเกจพลังงานและองศา
function startMeters() {
    // เข็มองศาสวิงไปมา (-90 ถึง 90 องศา, โดย 0 คือตรงกลาง)
    angleInterval = setInterval(() => {
        angle += 3 * angleDirection;
        if (angle >= 90 || angle <= -90) angleDirection *= -1;
        anglePointer.style.transform = `rotate(${angle}deg)`;
    }, 20);
}

// รองรับทั้งการสัมผัสบนมือถือและการคลิกเมาส์
throwBtn.addEventListener('mousedown', startCharge);
throwBtn.addEventListener('touchstart', startCharge, {passive: true});

throwBtn.addEventListener('mouseup', throwCoin);
throwBtn.addEventListener('touchend', throwCoin, {passive: true});

function startCharge(e) {
    if (isCharging) return;
    isCharging = true;
    
    // พลังงานขึ้นลง 0-100
    animationInterval = setInterval(() => {
        power += 2 * powerDirection;
        if (power >= 100 || power <= 0) powerDirection *= -1;
        powerBar.style.width = power + '%';
    }, 20);
}

// 4. ระบบคำนวณและโยนเหรียญ
function throwCoin(e) {
    if (!isCharging) return;
    isCharging = false;
    clearInterval(animationInterval);
    clearInterval(angleInterval);
    throwBtn.disabled = true;

    // สูตรคำนวณฟิสิกส์จำลอง
    // องศาที่ดีที่สุดคือ 0 ในระบบกราฟิกนี้ (ปาตรงๆ)
    const optimalAngleDiff = Math.abs(angle); 
    // ยิ่งองศาเบี้ยวเยอะ ตัวคูณระยะทางยิ่งน้อย
    const angleMultiplier = Math.max(0.1, 1 - (optimalAngleDiff / 90)); 
    
    // คำนวณระยะทาง
    const distance = (power * 1.5 * angleMultiplier).toFixed(2);

    // อนิเมชันเหรียญพุ่งออกไป
    coin.style.transform = `scale(0.2) rotate(720deg) translateX(${angle * 2}px)`;
    coin.style.bottom = '150%';
    coin.style.opacity = '0';

    setTimeout(() => {
        saveScore(distance);
    }, 1500);
}

// 5. ระบบบันทึกและแสดงผล
function saveScore(distance) {
    // บันทึกลง Firebase
    database.ref('players/' + currentPlayer).set({
        name: currentPlayer,
        score: parseFloat(distance),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        // แบนผู้เล่นนี้ใน LocalStorage ป้องกันการเล่นซ้ำ
        localStorage.setItem('hasPlayedCoinToss', 'true');
        
        gameScreen.classList.remove('active');
        leaderboardScreen.classList.add('active');
        document.getElementById('result-distance').innerText = `คุณโยนได้: ${distance} เมตร`;
        updateLeaderboard();
    });
}

function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    
    // ดึงข้อมูลจัดเรียงตามคะแนน
    database.ref('players').orderByChild('score').limitToLast(10).on('value', snapshot => {
        list.innerHTML = '';
        let scores = [];
        snapshot.forEach(child => {
            scores.push(child.val());
        });
        
        // เรียงจากมากไปน้อย
        scores.reverse();
        
        scores.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${player.name}</strong> - ${player.score} เมตร`;
            list.appendChild(li);
        });
    });
}
