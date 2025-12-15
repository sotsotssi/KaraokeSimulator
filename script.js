const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let ytPlayer = null;
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready");
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        console.log("Video Ended - Auto Finish");
        finishSong();
    }
}

const state = {
    members: [],
    songs: [],
    history: [], 
    currentSongIndex: 0,
    isPlaying: false,
    logs: [],
    currentSinger: null,
    intervalId: null,
    autoNextTimeout: null,
    countdownInterval: null
};

const $ = (id) => document.getElementById(id);

function switchTab(tabName) {
    ['members', 'songs', 'room'].forEach(name => {
        $(`tab-${name}`).classList.add('hidden');
        $(`tab-btn-${name}`).classList.remove('active', 'text-purple-400', 'border-b-2', 'border-purple-400');
    });
    
    $(`tab-${tabName}`).classList.remove('hidden');
    $(`tab-btn-${tabName}`).classList.add('active');
}

function exportData(type) {
    let data = {};
    let filename = 'karaoke_data.json';

    if (type === 'members') {
        if (state.members.length === 0) return alert('저장할 명단이 없습니다.');
        data = { members: state.members };
        filename = 'karaoke_members.json';
    } else if (type === 'songs') {
        if (state.songs.length === 0) return alert('저장할 예약 목록이 없습니다.');
        data = { songs: state.songs };
        filename = 'karaoke_songs.json';
    } else if (type === 'all') {
        data = { members: state.members, songs: state.songs };
        filename = 'karaoke_backup.json';
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (type === 'members' || type === 'all') {
                if (data.members && Array.isArray(data.members)) {
                    state.members = data.members;
                    renderMembers();
                }
            }
            
            if (type === 'songs' || type === 'all') {
                if (data.songs && Array.isArray(data.songs)) {
                    state.songs = data.songs;
                    renderSongs();
                }
            }
            
            alert('데이터를 성공적으로 불러왔습니다.');
        } catch (err) {
            alert('파일 형식이 올바르지 않습니다.');
            console.error(err);
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function addMember() {
    const input = $('member-input');
    const name = input.value.trim();
    if (!name) return alert('이름을 입력해주세요.');
    if (state.members.includes(name)) return alert('이미 명단에 존재하는 이름입니다.');
            
    
    state.members.push(name);
    input.value = '';
    renderMembers();
}

function removeMember(index) {
    state.members.splice(index, 1);
    renderMembers();
}

function clearMembers() {
    if(confirm('명단을 초기화하시겠습니까?')) {
        state.members = [];
        renderMembers();
    }
}

function renderMembers() {
    const list = $('member-list');
    $('member-count').innerText = state.members.length;
    
    if (state.members.length === 0) {
        list.innerHTML = '<li class="text-center text-gray-500 py-4">참가자를 추가해주세요.</li>';
        return;
    }

    list.innerHTML = state.members.map((member, idx) => `
        <li class="flex justify-between items-center bg-gray-700 px-3 py-2 rounded">
            <span>👤 ${member}</span>
            <button onclick="removeMember(${idx})" class="text-red-400 hover:text-white">✕</button>
        </li>
    `).join('');
}

function addSong() {
    const artist = $('song-artist').value.trim();
    const title = $('song-title').value.trim();
    const link = $('song-link').value.trim();

    if (!artist || !title) return alert('가수와 제목은 필수입니다.');

    let videoId = null;
    let siParam = null;

    if (link) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = link.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        } else {
            alert('유효하지 않은 유튜브 링크입니다. 링크 없이 추가합니다.');
        }

        const siMatch = link.match(/[?&]si=([^#&]+)/);
        if (siMatch) {
            siParam = siMatch[1];
        }
    }

    state.songs.push({ artist, title, videoId, siParam });
    $('song-artist').value = '';
    $('song-title').value = '';
    $('song-link').value = '';
    renderSongs();
}

function removeSong(index) {
    state.songs.splice(index, 1);
    renderSongs();
}

function clearSongs() {
    if(confirm('예약 목록을 초기화하시겠습니까?')) {
        state.songs = [];
        renderSongs();
    }
}

function renderSongs() {
    const list = $('song-list');
    $('song-count').innerText = state.songs.length;

    if (state.songs.length === 0) {
        list.innerHTML = '<li class="text-center text-gray-500 py-4">예약된 곡이 없습니다.</li>';
        return;
    }

    list.innerHTML = state.songs.map((song, idx) => `
        <li class="flex justify-between items-center bg-gray-700 px-3 py-2 rounded ${idx === state.currentSongIndex && state.isPlaying ? 'border border-green-500' : ''}">
            <div class="overflow-hidden">
                <div class="font-bold text-sm truncate">${song.title}</div>
                <div class="text-xs text-gray-400 truncate">${song.artist}</div>
            </div>
            <button onclick="removeSong(${idx})" class="text-red-400 hover:text-white ml-2">✕</button>
        </li>
    `).join('');
}

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function startKaraoke() {
    if (state.members.length === 0) return alert('참가자가 최소 1명 필요합니다.');
    if (state.songs.length === 0) return alert('예약된 곡이 없습니다.');
    
    if (!state.isPlaying && state.currentSongIndex === 0) {
        state.history = [];
    }

    if (state.currentSongIndex >= state.songs.length) {
        state.currentSongIndex = 0; 
    }

    switchTab('room');
    playSong(state.currentSongIndex);
}

function playSong(index) {
    state.isPlaying = true;
    state.currentSongIndex = index;
    const song = state.songs[index];
    state.currentSinger = pickRandom(state.members);
    
    $('btn-play').disabled = true;
    $('btn-play').classList.add('opacity-50');
    $('btn-skip').disabled = false;
    $('btn-skip').classList.remove('opacity-50');
    $('status-indicator').innerText = "재생 중";
    $('status-indicator').className = "text-xs px-2 py-1 rounded bg-green-600 text-white animate-pulse";
    $('now-playing-text').innerText = `NOW PLAYING: ${song.title} - ${song.artist} [🎤 ${state.currentSinger}]`;
    $('score-overlay').classList.add('hidden');
    if(state.autoNextTimeout) clearTimeout(state.autoNextTimeout);
    if(state.countdownInterval) clearInterval(state.countdownInterval);


    const frameContainer = $('youtube-frame-container');
    const placeholder = $('screen-placeholder');
    
    if (song.videoId) {
        placeholder.classList.add('hidden');
        frameContainer.classList.remove('hidden');
        
        if (ytPlayer) {
            ytPlayer.loadVideoById({
                videoId: song.videoId,
                startSeconds: 0
            });
            ytPlayer.unMute();
            ytPlayer.playVideo();
        } else {
            ytPlayer = new YT.Player('yt-player', {
                height: '100%',
                width: '100%',
                videoId: song.videoId,
                playerVars: {
                    'autoplay': 1,
                    'controls': 1,
                    'rel': 0,
                    'enablejsapi': 1,
                    'origin': window.location.origin
                },
                events: {
                    'onStateChange': onPlayerStateChange
                }
            });
        }
    } else {
        if(ytPlayer) ytPlayer.stopVideo();
        frameContainer.classList.add('hidden');
        placeholder.classList.remove('hidden');
        placeholder.innerHTML = `
            <div class="text-6xl mb-4">🎵</div>
            <h2 class="text-xl font-bold text-white">${song.title}</h2>
            <p class="text-gray-400">${song.artist}</p>
            <p class="text-purple-400 mt-2 font-bold">Singing by ${state.currentSinger}</p>
        `;
    }

    renderSongs();
    addLog('system', `--- 🎵 '${song.title}' 시작! (${state.currentSinger}) ---`);

    if (state.intervalId) clearInterval(state.intervalId);
    state.intervalId = setInterval(() => simulationStep(), 3000);
}

function simulationStep() {
    const performanceScore = Math.floor(Math.random() * 100);
    
    let singerAction = "";
    if (performanceScore > 85) {
        singerAction = pickRandom([
            `${state.currentSinger}의 고음이 천장을 뚫을 기세입니다.`,
            `${state.currentSinger}이(가) 감정을 풍부하게 담아 노래합니다.`,
            `${state.currentSinger}의 성량에 유리잔이 공명합니다.`,
            `${state.currentSinger}이(가) 마이크를 쥐고 방을 장악합니다.`
        ]);
    } else if (performanceScore > 40) {
        singerAction = pickRandom([
            `${state.currentSinger}이(가) 리듬을 타며 노래를 부릅니다.`,
            `${state.currentSinger}이(가) 가사를 흘끗 보며 열심히 부릅니다.`,
            `${state.currentSinger}이(가) 노래를 무난하게 소화하고 있습니다.`,
            `${state.currentSinger}이(가) 약간 박자를 놓쳤지만 금방 따라잡습니다.`
        ]);
    } else {
        singerAction = pickRandom([
            `${state.currentSinger}의 노래에서 삑사리가 납니다.`,
            `${state.currentSinger}이(가) 음정을 찾지 못하고 헤맵니다.`,
            `${state.currentSinger}이(가) 고난이도 파트를 전부 놓쳐 버립니다.`,
            `${state.currentSinger}의 목소리가 갈라집니다.`
        ]);
    }
    addLog('singer', singerAction);

    const audience = state.members.filter(m => m !== state.currentSinger);
    if (audience.length > 0) {
        const randomMember = pickRandom(audience);
        const actions = [
            `탬버린을 신나게 흔듭니다.`,
            `다음 곡을 예약하기 위해 리모컨을 찾습니다.`,
            `화장실에 다녀옵니다.`,
            `음료수를 한 모금 마십니다.`,
            `과자를 집어 먹습니다.`,
            `핸드폰을 보고 있습니다.`,
            `박수를 치며 호응합니다.`,
            `다른 마이크를 잡고 화음을 넣습니다.`,
            `신기한 듯 가사가 나오는 화면을 바라봅니다.`,
            `점수 제거를 외치려다 참습니다.`,
            `노래방 기계의 이펙트 버튼을 눌러봅니다.`,
            `다음 노래를 고민합니다.`,
            `핸드폰 플래시를 켜고 좌우로 흔들어줍니다.`,
            `노래방 기계에 지폐를 추가로 넣습니다.`
        ];
        addLog('audience', `${randomMember}: ${pickRandom(actions)}`);
    }
}

function addLog(type, text) {
    const container = $('log-container');
    while (container.children.length >= 50) {
        container.removeChild(container.firstChild);
    }
    const div = document.createElement('div');
    
    if (type === 'system') {
        div.className = "text-center text-xs text-yellow-500 font-bold bg-yellow-900/20 py-1 rounded";
    } else if (type === 'singer') {
        div.className = "text-sm text-purple-300 pl-2 border-l-2 border-purple-500";
    } else {
        div.className = "text-sm text-gray-400 pl-2";
    }
    
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function finishSong() {
    if (!state.isPlaying) return;

    clearInterval(state.intervalId);
    state.isPlaying = false;

    if(ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
    }
    
    const frameContainer = $('youtube-frame-container');
    frameContainer.classList.add('hidden');
    $('screen-placeholder').classList.remove('hidden');
    
    const score = Math.floor(Math.random() * 51) + 50; 
    let comment = "";
    
    if (score === 100) comment = "기계가 고장날 정도의 완벽함!";
    else if (score >= 90) comment = "가수 데뷔하셔도 되겠어요!";
    else if (score >= 80) comment = "분위기 메이커! 훌륭합니다.";
    else if (score >= 70) comment = "열심히 부르는 모습이 보기 좋습니다.";
    else if (score >= 60) comment = "다음 곡은 더 잘 부를 수 있을 거예요!";
    else comment = "점수 기계가 잠시 멈칫했습니다.";

    const currentSong = state.songs[state.currentSongIndex];
    state.history.push({
        artist: currentSong.artist,
        title: currentSong.title,
        singer: state.currentSinger,
        score: score
    });

    $('score-value').innerText = score;
    $('score-comment').innerText = comment;
    $('score-overlay').classList.remove('hidden');
    
    addLog('system', `--- 점수: ${score}점 (${comment}) ---`);
    
    $('status-indicator').innerText = "점수 확인 중";
    $('status-indicator').className = "text-xs px-2 py-1 rounded bg-yellow-600 text-white";
    
    $('btn-skip').disabled = true;
    $('btn-skip').classList.add('opacity-50');
    
    if (state.currentSongIndex < state.songs.length - 1) {
        
        let timeLeft = 5;
        const countdownEl = $('next-song-countdown');
        countdownEl.innerText = `${timeLeft}초 후 다음 곡이 시작됩니다...`;
        
        state.countdownInterval = setInterval(() => {
            timeLeft--;
            if(timeLeft > 0) {
                countdownEl.innerText = `${timeLeft}초 후 다음 곡이 시작됩니다...`;
            } else {
                clearInterval(state.countdownInterval);
            }
        }, 1000);

        state.autoNextTimeout = setTimeout(() => {
            nextSong();
        }, 5000);
    } else {
        $('next-song-countdown').innerText = "마지막 곡이었습니다.";
        
        state.autoNextTimeout = setTimeout(() => {
            showResults();
        }, 3000);
    }
}

function nextSong() {
    if(state.autoNextTimeout) clearTimeout(state.autoNextTimeout);
    if(state.countdownInterval) clearInterval(state.countdownInterval);

    state.currentSongIndex++;
    if (state.currentSongIndex >= state.songs.length) {
        showResults();
    } else {
        playSong(state.currentSongIndex);
    }
}

function showResults() {
    if(state.autoNextTimeout) clearTimeout(state.autoNextTimeout);

    $('score-overlay').classList.add('hidden');
    $('status-indicator').innerText = "결과 발표";
    $('status-indicator').className = "text-xs px-2 py-1 rounded bg-purple-600 text-white";
    $('now-playing-text').innerText = "모든 순서가 종료되었습니다.";

    const sortedHistory = [...state.history].sort((a, b) => b.score - a.score);

    const tbody = $('results-table-body');
    tbody.innerHTML = sortedHistory.map((item, index) => {
        let rankEmoji = '👏';
        if(index === 0) rankEmoji = '👑';
        else if(index === 1) rankEmoji = '🥈';
        else if(index === 2) rankEmoji = '🥉';

        return `
        <tr class="border-b border-gray-700/50 last:border-0">
            <td class="py-3 pl-2 font-bold text-yellow-400">${rankEmoji} ${index + 1}</td>
            <td class="py-3">
                <div class="font-bold text-white">${item.title}</div>
                <div class="text-xs text-gray-400">${item.artist} | 🎤 ${item.singer}</div>
            </td>
            <td class="py-3 text-right pr-2 text-lg font-bold text-purple-300">${item.score}</td>
        </tr>
        `;
    }).join('');

    const today = new Date();
    $('results-date').innerText = today.toLocaleDateString();
    $('results-overlay').classList.remove('hidden');
}

function downloadResults() {
    const captureArea = $('results-capture-area');    
    const clone = captureArea.cloneNode(true);
    
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = captureArea.offsetWidth + 'px';
    
    const listContainer = clone.querySelector('.max-h-80');
    if (listContainer) {
        listContainer.classList.remove('max-h-80', 'overflow-y-auto');
        listContainer.classList.add('h-auto');
    }

    document.body.appendChild(clone);

    html2canvas(clone, { 
        backgroundColor: "#1f2937", 
        scale: 2 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'karaoke_results.png';
        link.href = canvas.toDataURL();
        link.click();
        
        document.body.removeChild(clone);
    }).catch(err => {
        console.error(err);
        alert('이미지 저장 중 오류가 발생했습니다.');
        if(document.body.contains(clone)) {
            document.body.removeChild(clone);
        }
    });
}

function restartKaraoke() {
    if(!confirm("처음부터 다시 시작하시겠습니까? 기록이 초기화됩니다.")) return;

    state.currentSongIndex = 0;
    state.history = [];
    state.isPlaying = false;
    if(state.intervalId) clearInterval(state.intervalId);
    if(state.autoNextTimeout) clearTimeout(state.autoNextTimeout);
    if(ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();


    $('results-overlay').classList.add('hidden');
    $('score-overlay').classList.add('hidden');
    $('log-container').innerHTML = '<div class="text-center text-xs text-gray-500 my-2">--- 노래방에 입장했습니다 ---</div>';
    
    $('btn-play').disabled = false;
    $('btn-play').classList.remove('opacity-50');
    $('btn-skip').disabled = true;
    $('btn-skip').classList.add('opacity-50');

    $('status-indicator').innerText = "대기중";
    $('status-indicator').className = "text-xs px-2 py-1 rounded bg-gray-800 text-gray-400";
    $('now-playing-text').innerText = "현재 재생 중인 곡이 없습니다...";
    $('screen-placeholder').innerHTML = `<div class="text-4xl mb-2">📺</div><p class="text-gray-500 text-sm">재생 버튼을 누르면 시작됩니다.</p>`;
    
    switchTab('members');
}

renderMembers();
renderSongs();