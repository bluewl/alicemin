const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const dialogBox = document.getElementById('dialog-box');
const dialogText = document.getElementById('dialog-text');
const dialogIndicator = document.getElementById('dialog-indicator');
const portraitCanvas = document.getElementById('portraitCanvas');
const pCtx = portraitCanvas.getContext('2d');

// Input handling
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, a: false, s: false, d: false,
    ' ': false, Enter: false
};

let mouseClicked = false;
window.addEventListener('click', () => {
    mouseClicked = true;
});

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Game state
let gameState = 'waiting_to_start'; // 'waiting_to_start', 'init', 'intro_emote', 'paul_entering', 'playing', 'dialog'
let introStartTime = Date.now();

// Asset Loading
const assets = {
    interior: new Image()
};

let assetsLoaded = 0;
const totalAssets = 1;

function assetLoaded() {
    assetsLoaded++;
}

function assetError() {
    assetsLoaded++;
    console.log('An asset failed to load via URL, using fallback.');
}

assets.interior.onload = assetLoaded; assets.interior.onerror = assetError;
assets.interior.crossOrigin = "Anonymous";
assets.interior.src = 'https://stardewvalleywiki.com/mediawiki/images/b/b4/Farmhouse_initial.png';

// Alice (Player)
const player = {
    x: 400, y: 250,
    width: 48, height: 96, 
    speed: 4,
    color: '#ffccaa',
    hairColor: '#111',
    shirtColor: '#2E97F3', // Minty blue sundress
    pantsColor: '#ffccaa', // Bare legs
    facing: 'up',
    isMoving: false
};

// Paul (NPC)
const npc = {
    x: 376, y: 350,
    width: 48, height: 96,
    color: '#ffccaa',
    hairColor: '#111', // Black hair
    shirtColor: '#2a2a2a', // Dark charcoal jacket
    pantsColor: '#111', // Black trousers
    facing: 'up',
    isMoving: false,
    visible: false
};

// Dialog sequences
const knockDialogs = [
    { speaker: '', text: "* Knock Knock! *" }
];

const introDialogs = [
    { speaker: 'Alice', text: "Who is it?" },
    { speaker: 'Paul', text: "It's your absolute favorite best friend in the world, Paul!" },
    { speaker: 'Alice', text: "Oh, exciting!" },
    { speaker: 'Alice', text: "I should let him in!" }
];

const paulDialogs = [
    { speaker: 'Paul', text: "Happy Birthday!" },
    { speaker: 'Paul', text: "I heard you are moving to a new condo soon." },
    { speaker: 'Paul', text: "I wanted to get you a beautiful indoor plant for your new home." },
    { speaker: 'Paul', text: "Since you're still packing, this item will spawn once you are settled in." },
    { speaker: 'Paul', text: "Let's head to Pierre's General Store to pick it out later!" }
];

let activeDialogs = [];
let currentDialogIndex = 0;
let currentSpeaker = '';
let isTyping = false;
let typeInterval;
let spaceWasPressed = false;

// Drawing functions
function drawCharacter(c, isPlayer) {
    ctx.save();
    
    // SV style bobbing
    let bobY = 0;
    if (c.isMoving && Math.sin(Date.now() / 100) > 0) bobY = -3;
    
    ctx.translate(c.x, c.y + bobY);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(4, 96 - bobY, 40, 10);

    // Legs / Pants
    ctx.fillStyle = c.pantsColor;
    if (isPlayer) {
        // Alice has bare legs extending from a skirt
        ctx.fillRect(14, 76, 8, 14);
        ctx.fillRect(26, 76, 8, 14);
    } else {
        ctx.fillRect(10, 60, 12, 30);
        ctx.fillRect(26, 60, 12, 30);
    }
    
    // Shoes
    ctx.fillStyle = '#3a291f';
    if (c.isMoving && Math.sin(Date.now() / 100) > 0) {
        ctx.fillRect(8, 86, 16, 10);
        ctx.fillRect(26, 84, 12, 6);
    } else if (c.isMoving) {
        ctx.fillRect(10, 84, 12, 6);
        ctx.fillRect(24, 86, 16, 10);
    } else {
        ctx.fillRect(8, 86, 14, 10);
        ctx.fillRect(26, 86, 14, 10);
    }

    if (isPlayer) {
        // Alice Sundress Outfit
        ctx.fillStyle = c.shirtColor; // Minty blue Sundress Body (extends lower into a skirt)
        ctx.fillRect(6, 36, 36, 40); 
        ctx.fillStyle = '#e0f7fa'; // delicate lace/belt detail
        ctx.fillRect(6, 54, 36, 4);
        
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(6, 72, 36, 4); // dress drop shadow at hem
        
        // Arms (Bare skin)
        ctx.fillStyle = c.color;
        ctx.fillRect(-2, 36, 10, 24);
        ctx.fillRect(40, 36, 10, 24);
        
        // Sundress straps
        ctx.fillStyle = c.shirtColor;
        ctx.fillRect(4, 36, 4, 12);
        ctx.fillRect(40, 36, 4, 12);
    } else {
        // Paul Handsome Dark Outfit details
        ctx.fillStyle = c.shirtColor; // Dark Jacket
        ctx.fillRect(8, 36, 32, 30);
        // Black turtleneck peaking out
        ctx.fillStyle = '#111';
        ctx.fillRect(18, 36, 12, 10);
        
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(8, 62, 32, 4); // Jacket drop shadow
        
        // Arms
        ctx.fillStyle = c.shirtColor;
        ctx.fillRect(0, 36, 10, 24);
        ctx.fillRect(38, 36, 10, 24);
    }
    
    // Hands
    ctx.fillStyle = c.color;
    ctx.fillRect(0, 60, 10, 8);
    ctx.fillRect(38, 60, 10, 8);

    // Head Unit
    ctx.fillStyle = c.color;
    ctx.fillRect(6, 0, 36, 36);

    // Facial features when facing down or sideways
    if (c.facing !== 'up') {
        ctx.fillStyle = '#4a210d'; // Eyes
        if (c.facing === 'down') {
            ctx.fillRect(12, 16, 6, 8);
            ctx.fillRect(30, 16, 6, 8);
            ctx.fillStyle = '#fff'; // glare
            ctx.fillRect(12, 16, 2, 2);
            ctx.fillRect(30, 16, 2, 2);
            
            if (!isPlayer) {
                // Paul handsome sharp eyebrows
                ctx.fillStyle = '#111';
                ctx.fillRect(12, 12, 6, 2);
                ctx.fillRect(30, 12, 6, 2);
            }
        } else if (c.facing === 'left') {
            ctx.fillRect(8, 16, 6, 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(8, 16, 2, 2);
        } else if (c.facing === 'right') {
            ctx.fillRect(34, 16, 6, 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(34, 16, 2, 2);
        }
    }

    // Hair base
    ctx.fillStyle = c.hairColor;
    if (c.facing === 'up') {
        ctx.fillRect(4, -6, 40, 42); // back of hair
        if (isPlayer) {
            ctx.fillRect(0, 0, 8, 60); // Alice long hair back
            ctx.fillRect(40, 0, 8, 60); 
        }
    } else {
        // Face details
        ctx.fillRect(4, -6, 40, 14); // Hair top
        
        ctx.fillStyle = c.hairColor;
        if (!isPlayer) {
            // Paul short stylish parted two-block
            ctx.fillRect(4, 0, 10, 18); // Left side volume
            ctx.fillRect(34, 0, 10, 18); // Right side volume
            ctx.fillRect(8, 6, 12, 12);  // Left swooping bangs
            ctx.fillRect(28, 6, 8, 8);   // Right subtle bang
        } else {
            // Alice elegant long hair
            ctx.fillRect(-2, 0, 10, 50); // Left drape
            ctx.fillRect(40, 0, 10, 50); // Right drape
            ctx.fillRect(4, 0, 40, 8); // bangs
            ctx.fillRect(8, 6, 10, 10); // deeper bang layering
        }
    }
    
    ctx.restore();
}

function drawEmote(c) {
    const time = Date.now() - introStartTime;
    // Bouncy bubble intro animation
    let bounce = 0;
    if (time < 200) bounce = - (time/200)*10;
    else if (time < 400) bounce = -10 + ((time-200)/200)*10;
    
    const ex = c.x + 12;
    const ey = c.y - 35 + bounce;
    
    // Bubble
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex + 12, ey + 12, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Bubble tail
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(ex + 12, ey + 28);
    ctx.lineTo(ex + 6, ey + 38);
    ctx.lineTo(ex + 18, ey + 26);
    ctx.fill();
    ctx.stroke();
    
    // ! Red Symbol
    ctx.fillStyle = '#ff1d15';
    ctx.fillRect(ex + 10, ey + 2, 4, 12);
    ctx.fillRect(ex + 10, ey + 18, 4, 4);
}

function drawPortrait(speaker) {
    pCtx.clearRect(0, 0, 120, 120);
    if (!speaker) return;
    
    pCtx.save();
    pCtx.scale(2, 2); // 60x60 logic grid

    // Base body shadow and skin
    pCtx.fillStyle = '#ffccaa';
    pCtx.fillRect(18, 20, 24, 26); // Head shape

    // Neck / shadow under chin
    pCtx.fillStyle = '#dca07b';
    pCtx.fillRect(24, 42, 12, 6);

    if (speaker === 'Alice') {
        // Alice Sundress
        
        // Exposed shoulders/chest
        pCtx.fillStyle = '#ffccaa';
        pCtx.fillRect(10, 48, 40, 12);
        
        // Minty blue sundress top
        pCtx.fillStyle = '#2E97F3';
        pCtx.fillRect(16, 52, 28, 8);
        pCtx.fillStyle = '#e0f7fa'; // Lace edge
        pCtx.fillRect(16, 52, 28, 2);
        
        // Sundress straps
        pCtx.fillStyle = '#2E97F3';
        pCtx.fillRect(14, 48, 4, 8);
        pCtx.fillRect(42, 48, 4, 8);

        // Subtle blush
        pCtx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        pCtx.fillRect(20, 36, 4, 3);
        pCtx.fillRect(36, 36, 4, 3);

        // Eyes
        pCtx.fillStyle = '#4a210d';
        pCtx.fillRect(22, 28, 4, 6);
        pCtx.fillRect(34, 28, 4, 6);
        pCtx.fillStyle = '#fff'; // glare
        pCtx.fillRect(22, 28, 2, 2);
        pCtx.fillRect(34, 28, 2, 2);

        // Hair (Elegant dark hair)
        pCtx.fillStyle = '#111';
        pCtx.fillRect(16, 12, 28, 12); // main hair volume
        pCtx.fillRect(14, 18, 6, 28); // left drape
        pCtx.fillRect(40, 18, 6, 28); // right drape
        // Bangs swooping
        pCtx.fillRect(16, 16, 18, 6);
        
    } else {
        // Paul - Handsome, clean elegant dark K-Pop style
        // Sharp black/dark grey suit/jacket
        pCtx.fillStyle = '#111'; // black inner shirt/turtleneck
        pCtx.fillRect(20, 42, 20, 18);
        pCtx.fillStyle = '#2a2a2a'; // dark charcoal jacket
        pCtx.fillRect(10, 46, 12, 14);
        pCtx.fillRect(38, 46, 12, 14);
        pCtx.fillRect(20, 48, 4, 12); // smooth collar left
        pCtx.fillRect(36, 48, 4, 12); // smooth collar right

        // Handsome structured eyebrows
        pCtx.fillStyle = '#111';
        pCtx.fillRect(20, 24, 8, 2);
        pCtx.fillRect(32, 24, 8, 2);

        // Eyes (sharp and clear)
        pCtx.fillStyle = '#4a210d';
        pCtx.fillRect(22, 28, 4, 6);
        pCtx.fillRect(34, 28, 4, 6);
        pCtx.fillStyle = '#fff'; // Glare
        pCtx.fillRect(22, 28, 2, 2);
        pCtx.fillRect(34, 28, 2, 2);

        // Hair (Stylish black, classic two-block/parted style, very clean)
        pCtx.fillStyle = '#111';
        pCtx.fillRect(14, 10, 32, 12); // Top volume
        pCtx.fillRect(12, 16, 10, 14); // Swooping bangs left
        pCtx.fillRect(34, 16, 12, 12); // Right side
        pCtx.fillRect(24, 12, 6, 12);  // Center parted strand
    }

    pCtx.restore();
}

function drawBackground() {
    // Fill outer space with black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Room boundaries
    const rx = 120, ry = 40, rw = 560, rh = 370;

    // Floor base
    ctx.fillStyle = '#d38a45';
    ctx.fillRect(rx, ry + 120, rw, rh - 120);

    // Floorboards detailed texturing
    ctx.fillStyle = '#b56d2a';
    for (let x = rx; x < rx + rw; x += 32) {
        ctx.fillRect(x, ry + 120, 2, rh - 120); // vertical gaps
    }
    for (let y = ry + 152; y < ry + rh; y += 32) {
        for (let x = rx; x < rx + rw; x += 64) {
            let offset = (y % 64 === 0) ? 32 : 0;
            ctx.fillRect(x + offset, y, 32, 2); // horizontal cuts
        }
    }

    // Walls base
    ctx.fillStyle = '#c47d49';
    ctx.fillRect(rx, ry, rw, 120);

    // Logs detailed horizontal texturing
    ctx.fillStyle = '#8e5127';
    for (let y = ry; y < ry + 120; y += 24) {
        ctx.fillRect(rx, y, rw, 4);
        ctx.fillStyle = '#e5a473'; // highlight
        ctx.fillRect(rx, y + 4, rw, 2);
        ctx.fillStyle = '#8e5127';
        ctx.fillRect(rx, y + 22, rw, 2); // shadow
    }

    // Baseboard
    ctx.fillStyle = '#4a2813';
    ctx.fillRect(rx, ry + 104, rw, 16);
    ctx.fillStyle = '#5e341a';
    ctx.fillRect(rx, ry + 104, rw, 2); // baseboard top highlight

    // Map borders (thick black/dark walls framing the room)
    ctx.fillStyle = '#111';
    ctx.fillRect(rx - 16, ry, 16, rh); // left wall
    ctx.fillRect(rx + rw, ry, 16, rh); // right wall
    ctx.fillRect(rx - 16, ry + rh, rw + 32, 16); // bottom wall

    // Front Door (Bottom Center)
    ctx.fillStyle = '#5c3516';
    ctx.fillRect(360, ry + rh - 16, 80, 16); // Frame
    ctx.fillStyle = '#3a210d';
    ctx.fillRect(364, ry + rh - 12, 72, 12); // Inner

    // Central Rug
    ctx.fillStyle = '#a83c3c';
    ctx.fillRect(300, 240, 200, 120);
    ctx.fillStyle = '#c74e4e';
    ctx.fillRect(310, 250, 180, 100);
    ctx.strokeStyle = '#e8c15a';
    ctx.lineWidth = 4;
    ctx.strokeRect(302, 242, 196, 116);
    ctx.strokeRect(314, 254, 172, 92);

    // Window (Back Left)
    ctx.fillStyle = '#593218'; // Frame
    ctx.fillRect(200, ry + 20, 60, 60);
    ctx.fillStyle = '#9cd9f7'; // Glass bright blue
    ctx.fillRect(204, ry + 24, 24, 24);
    ctx.fillRect(232, ry + 24, 24, 24);
    ctx.fillRect(204, ry + 52, 24, 24);
    ctx.fillRect(232, ry + 52, 24, 24);
    ctx.fillStyle = '#fff'; // glare
    ctx.fillRect(208, ry + 28, 8, 8);
    ctx.fillRect(236, ry + 28, 8, 8);

    // Fireplace (Top-Mid)
    const fx = 360, fy = ry + 20;
    ctx.fillStyle = '#6b6b6b';
    ctx.fillRect(fx, fy, 100, 120);
    ctx.fillStyle = '#4a4a4a';
    // Bricks
    for (let y = fy; y < fy + 120; y += 16) {
        ctx.fillRect(fx, y, 100, 2);
        for (let x = fx; x < fx + 100; x += 24) {
            let offset = (y % 32 === 0) ? 12 : 0;
            ctx.fillRect(x + offset, y, 2, 16);
        }
    }
    // Hearth opening
    ctx.fillStyle = '#222';
    ctx.fillRect(fx + 16, fy + 60, 68, 60);
    // Fire element animated
    const time = Date.now();
    ctx.fillStyle = '#d14f1f';
    ctx.fillRect(fx + 30, fy + 80 + Math.sin(time/100)*4, 40, 40);
    ctx.fillStyle = '#e8a12e';
    ctx.fillRect(fx + 40, fy + 90 + Math.sin(time/150)*4, 20, 30);
    ctx.fillStyle = '#fce253';
    ctx.fillRect(fx + 46, fy + 100 + Math.sin(time/80)*4, 8, 16);

    // TV (Left wall)
    // TV Stand
    ctx.fillStyle = '#784628';
    ctx.fillRect(140, ry + 110, 80, 40);
    ctx.fillStyle = '#4a2814';
    ctx.fillRect(140, ry + 120, 80, 4); // drawer line
    // Old TV Set
    ctx.fillStyle = '#bb945d'; // Wood TV casing
    ctx.fillRect(146, ry + 60, 68, 50);
    ctx.fillStyle = '#222';
    ctx.fillRect(154, ry + 68, 52, 34); // Bezel
    ctx.fillStyle = '#3a4a58'; // Screen Dark
    ctx.fillRect(158, ry + 72, 44, 26);
    ctx.fillStyle = '#7b95a8'; // Screen highlight
    ctx.fillRect(162, ry + 76, 8, 8);

    // Bed (Top Right)
    const bx = 550, by = ry + 90;
    
    // Bed Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(bx - 4, by + 130, 128, 30);
    
    // Bed Posts (Wooden)
    ctx.fillStyle = '#3a1f0f';
    ctx.fillRect(bx - 4, by, 8, 30); // Top left
    ctx.fillRect(bx + 116, by, 8, 30); // Top right
    ctx.fillRect(bx - 4, by + 140, 8, 20); // Bottom left
    ctx.fillRect(bx + 116, by + 140, 8, 20); // Bottom right
    
    // Bed Headboard
    ctx.fillStyle = '#593218';
    ctx.fillRect(bx, by, 120, 26);
    ctx.fillStyle = '#7a4522'; // Headboard highlight
    ctx.fillRect(bx + 2, by + 2, 116, 4);
    ctx.fillStyle = '#40220e';
    ctx.fillRect(bx + 10, by + 10, 100, 16); // inner panel shadow
    
    // Footboard
    ctx.fillStyle = '#593218';
    ctx.fillRect(bx, by + 140, 120, 12);
    ctx.fillStyle = '#7a4522';
    ctx.fillRect(bx, by + 140, 120, 2); // highlight
    
    // Mattress/Sheets Base (White)
    ctx.fillStyle = '#e8e8e8'; // side of mattress
    ctx.fillRect(bx + 4, by + 26, 112, 114);
    ctx.fillStyle = '#ffffff'; // top of sheets
    ctx.fillRect(bx + 6, by + 26, 108, 110);
    
    // Pillows
    // Left Pillow
    ctx.fillStyle = '#d2d2d2'; // shadow base
    ctx.fillRect(bx + 18, by + 30, 40, 24);
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(bx + 20, by + 32, 36, 20);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bx + 20, by + 48, 36, 4); // bottom shadow
    
    // Right Pillow
    ctx.fillStyle = '#d2d2d2'; 
    ctx.fillRect(bx + 62, by + 30, 40, 24);
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(bx + 64, by + 32, 36, 20);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bx + 64, by + 48, 36, 4); // bottom shadow

    // Classic SDV Green Blanket
    ctx.fillStyle = '#2e8f50';
    ctx.fillRect(bx + 4, by + 74, 112, 66); // blanket base
    ctx.fillStyle = '#1c5e32'; // dark green side shadows
    ctx.fillRect(bx + 4, by + 74, 4, 66);
    ctx.fillRect(bx + 112, by + 74, 4, 66);
    
    // Blanket folded top edge
    ctx.fillStyle = '#3eb56b'; // Light green highlight at fold
    ctx.fillRect(bx + 8, by + 74, 104, 6);
    ctx.fillStyle = '#1c5e32'; // Fold shadow
    ctx.fillRect(bx + 8, by + 80, 104, 4);
    
    // Vertical blanket folds/wrinkles
    ctx.fillStyle = '#257540';
    ctx.fillRect(bx + 26, by + 84, 6, 56);
    ctx.fillRect(bx + 86, by + 84, 6, 56);

    // Yellow Stardew Trim on Blanket
    ctx.fillStyle = '#fce253';
    ctx.fillRect(bx + 4, by + 126, 112, 4);
    ctx.fillStyle = '#d39922'; // dark yellow trim shadow
    ctx.fillRect(bx + 4, by + 130, 112, 4);
}

// Dialog Logic
function startDialog(sequence) {
    gameState = 'dialog';
    activeDialogs = sequence;
    currentDialogIndex = 0;
    
    dialogBox.classList.remove('hidden');
    showDialogText();
}

function showDialogText() {
    isTyping = true;
    dialogIndicator.classList.add('hidden');
    
    const dialogObj = activeDialogs[currentDialogIndex];
    currentSpeaker = dialogObj.speaker;
    
    const dialogName = document.getElementById('dialog-name');
    
    if (currentSpeaker === '') {
        dialogName.innerText = '???';
        document.getElementById('portraitCanvas').style.display = 'none';
        pCtx.clearRect(0, 0, 120, 120);
    } else {
        dialogName.innerText = currentSpeaker;
        document.getElementById('portraitCanvas').style.display = 'block';
        drawPortrait(currentSpeaker);
    }

    if (currentSpeaker === 'Paul' && npc.visible) {
        npc.facing = getDirectionToPlayer(); // Paul looks at Alice
    }
    
    const fullText = dialogObj.text;
    let currentChar = 0;
    dialogText.innerHTML = '';
    
    clearInterval(typeInterval);
    typeInterval = setInterval(() => {
        dialogText.innerHTML += fullText.charAt(currentChar);
        currentChar++;
        if (currentChar >= fullText.length) {
            clearInterval(typeInterval);
            isTyping = false;
            dialogIndicator.classList.remove('hidden');
        }
    }, 40);
}

function advanceDialog() {
    if (isTyping) {
        // Skip animation and show full text instantly
        clearInterval(typeInterval);
        dialogText.innerHTML = activeDialogs[currentDialogIndex].text;
        isTyping = false;
        dialogIndicator.classList.remove('hidden');
    } else {
        currentDialogIndex++;
        if (currentDialogIndex < activeDialogs.length) {
            showDialogText();
        } else {
            // End of dialog
            dialogBox.classList.add('hidden');
            
            if (activeDialogs === knockDialogs) {
                gameState = 'intro_emote';
                player.facing = 'down'; // Face down during the exclamation point reaction
                introStartTime = Date.now();
            } else {
                gameState = 'playing';
                if (currentSpeaker === 'Paul' && npc.visible) {
                    npc.facing = 'down';
                }
            }
        }
    }
}

function getDirectionToPlayer() {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
    } else {
        return dy > 0 ? 'down' : 'up';
    }
}

function checkNPCInteraction() {
    if (!npc.visible) {
        // Door interaction zone
        if (player.y > 300 && player.x > 320 && player.x < 480) {
            npc.visible = true;
            npc.x = 376;
            npc.y = 410; // Start off-screen
            npc.facing = 'up';
            gameState = 'paul_entering';
        }
    } else {
        // Check distance between player and npc centers
        const dist = Math.hypot((player.x + player.width/2) - (npc.x + npc.width/2), (player.y + player.height/2) - (npc.y + npc.height/2));
        if (dist < 100) {
            startDialog(paulDialogs);
        }
    }
}

// Game Loop
function update() {
    const spacePressed = keys[' '] || keys['Enter'] || mouseClicked;
    const isMoveKey = keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight || keys.w || keys.a || keys.s || keys.d;

    if (gameState === 'waiting_to_start') {
        if (isMoveKey || mouseClicked) {
            gameState = 'init';
        }
    }

    if (gameState === 'init') {
        startDialog(knockDialogs);
    } else if (gameState === 'intro_emote') {
        if (Date.now() - introStartTime > 1200) {
            startDialog(introDialogs);
        }
    } else if (gameState === 'paul_entering') {
        player.isMoving = true;
        npc.isMoving = true;
        
        let moving = false;
        // Move Alice far enough up so their hitboxes do not overlap
        if (player.y > 180) {
            player.y -= 2; // Alice steps back
            player.facing = 'up';
            moving = true;
        }
        
        // Move Paul up to stand inside the door
        if (npc.y > 300) {
            npc.y -= 2; // Paul steps forward
            moving = true;
        }
        
        if (!moving) {
            player.isMoving = false;
            npc.isMoving = false;
            player.facing = 'down';
            npc.facing = 'up';
            gameState = 'playing';
        }
    }

    if (gameState === 'playing') {
        player.isMoving = false;
        if (keys.ArrowUp || keys.w) { player.y -= player.speed; player.facing = 'up'; player.isMoving = true; }
        if (keys.ArrowDown || keys.s) { player.y += player.speed; player.facing = 'down'; player.isMoving = true; }
        if (keys.ArrowLeft || keys.a) { player.x -= player.speed; player.facing = 'left'; player.isMoving = true; }
        if (keys.ArrowRight || keys.d) { player.x += player.speed; player.facing = 'right'; player.isMoving = true; }

        // General screen bounds (Restricted to interior physical walls)
        player.x = Math.max(120, Math.min(680 - player.width, player.x));
        player.y = Math.max(120, Math.min(410 - player.height, player.y));

        // Furniture Collisions
        // Bed (Right side)
        if (player.x + player.width > 550 && player.y < 260) {
            if (keys.ArrowUp || keys.w) player.y += player.speed;
            if (keys.ArrowRight || keys.d) player.x -= player.speed;
        }
        
        // Fireplace (Top mid)
        if (player.x + player.width > 350 && player.x < 460 && player.y < 160) {
            if (keys.ArrowUp || keys.w) player.y += player.speed;
        }

        // TV (Left wall)
        if (player.x < 220 && player.y < 170) {
            if (keys.ArrowUp || keys.w) player.y += player.speed;
            if (keys.ArrowLeft || keys.a) player.x += player.speed;
        }

        // Collision with Paul (only if visible)
        // Ignored top half to allow getting closer head-to-head
        if (npc.visible && player.x < npc.x + npc.width && player.x + player.width > npc.x &&
            player.y + 50 < npc.y + npc.height && player.y + player.height > npc.y + 50) {
            // Push back
            if (keys.ArrowUp || keys.w) player.y += player.speed;
            if (keys.ArrowDown || keys.s) player.y -= player.speed;
            if (keys.ArrowLeft || keys.a) player.x += player.speed;
            if (keys.ArrowRight || keys.d) player.x -= player.speed;
        }

        // Interaction
        if (spacePressed && !spaceWasPressed) {
            checkNPCInteraction();
        }
    } else if (gameState === 'dialog') {
        player.isMoving = false;
        if (spacePressed && !spaceWasPressed) {
            advanceDialog();
        }
    }
    
    spaceWasPressed = spacePressed;
    mouseClicked = false;
}

function draw() {
    drawBackground();
    
    // Sort rendering by Y so who is in front draws last
    if (npc.visible) {
        if (player.y < npc.y) {
            drawCharacter(player, true);
            drawCharacter(npc, false);
        } else {
            drawCharacter(npc, false);
            drawCharacter(player, true);
        }
    } else {
        drawCharacter(player, true);
    }

    if (gameState === 'intro_emote') {
        drawEmote(player);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
