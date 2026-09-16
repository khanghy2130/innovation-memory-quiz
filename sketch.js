let mx = 0,
  my = 0,
  touchCountdown = 0,
  isLoaded = false;

let scene = "MENU"; // MENU, QUIZ, RESULT
let optionsControl = {
  selectedAges: [1, 2, 3, 4],
  qCount: 10,
  mode: 0, // name > effect, effect > name, name > color + pic + age
};

let CARD_SHEET; // 5250 x 4500; each is 525 x 375

class Card {
  constructor(id, name, age, color, picIndex, tags) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.color = color;
    this.picIndex = picIndex;
    this.tags = tags;

    // special mapping for first 2 rows
    if (id < 15) {
      this.sheetIndex = [
        // row 1
        0, -1, 3, -1, 6, -1, 9, -1, 12, -1,
        // row 2
        1, 2, 4, 5, 7, 8, 10, 11, 13, 14,
      ].indexOf(id);
    } else {
      this.sheetIndex = id + 5;
    }
  }
}

class Btn {
  constructor(x, y, w, h, checkHighlight, renderContent, clicked) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.checkHighlight = checkHighlight;
    this.renderContent = renderContent;
    this.clicked = clicked;

    this.isHovered = false;
  }

  render() {
    // check hover
    this.isHovered =
      mx > this.x - this.w / 2 &&
      mx < this.x + this.w / 2 &&
      my > this.y - this.h / 2 &&
      my < this.y + this.h / 2;

    push();
    translate(this.x, this.y);

    if (this.checkHighlight && this.checkHighlight()) {
      noFill();
      stroke(30, 180, 30);
      strokeWeight(6);
      rect(0, 0, this.w, this.h, 10);
    }

    // render rectangle background
    noStroke();
    fill(50);
    rect(0, 0, this.w, this.h, 10);

    this.renderContent();
    pop();
  }
}

let buttons;
function createButtons() {
  buttons = {
    menu: {
      begin: new Btn(
        470,
        700,
        200,
        100,
        null,
        () => {
          textSize(48);
          fill(240, 240, 50);
          text("Begin", 0, 0);
        },
        () => {
          console.log("begin clicked");
        },
      ),

      // dynamically create 11 buttons
      ages: Array.from({ length: 11 }, (_, i) => {
        const age = i + 1;
        return new Btn(
          100 + ((i % 6) + (age > 6 ? 0.5 : 0)) * 80,
          160 + floor(i / 6) * 80,
          65,
          65,
          () => optionsControl.selectedAges.includes(age),
          () => {
            fill(255);
            text(age, 0, 0);
          },
          () => {
            optionsControl.selectedAges = optionsControl.selectedAges.includes(
              age,
            )
              ? optionsControl.selectedAges.filter((a) => a !== age)
              : [...optionsControl.selectedAges, age];
          },
        );
      }),

      // dynamically create 5 buttons (10 questions, 15, 20, 25, 30)
      qCounts: Array.from({ length: 5 }, (_, i) => {
        const qCount = 10 + i * 5;
        return new Btn(
          140 + i * 80,
          440,
          65,
          65,
          () => optionsControl.qCount === qCount,
          () => {
            fill(255);
            text(qCount, 0, 0);
          },
          () => {
            optionsControl.qCount = qCount;
          },
        );
      }),

      // dynamically create 3 buttons
      modes: Array.from({ length: 3 }, (_, i) => {
        const mode = i;
        const modeNames = ["Guess Effect", "Guess Name", "Guess Color+"];
        return new Btn(
          180,
          640 + i * 80,
          260,
          65,
          () => optionsControl.mode === mode,
          () => {
            fill(255);
            text(modeNames[mode], 0, 0);
          },
          () => {
            optionsControl.mode = mode;
          },
        );
      }),
    },
  };
}

// tags: SPLAY, SCORE, JUNK, EXECUTE, WIN
const CARDS = [
  new Card(0, "archery", 1, "red", 2, ["junk"]),
  new Card(1, "metalworking", 1, "red", 2, ["score"]),
  new Card(2, "oars", 1, "red", 2, ["score"]),
  new Card(3, "agriculture", 1, "yellow", 0, ["score"]),
  new Card(4, "domestication", 1, "yellow", 2, [""]),
  new Card(5, "masonry", 1, "yellow", 1, [""]),
  new Card(6, "clothing", 1, "green", 0, ["score"]),
  new Card(7, "sailing", 1, "green", 2, [""]),
  new Card(8, "the wheel", 1, "green", 0, [""]),
  new Card(9, "pottery", 1, "blue", 0, ["score"]),
  new Card(10, "tools", 1, "blue", 0, [""]),
  new Card(11, "writing", 1, "blue", 0, [""]),
  new Card(12, "city states", 1, "purple", 0, [""]),
  new Card(13, "code of laws", 1, "purple", 0, ["splay"]),
  new Card(14, "mysticism", 1, "purple", 0, [""]),

  new Card(15, "construction", 2, "red", 1, [""]),
  new Card(16, "road building", 2, "red", 2, [""]),
  new Card(17, "canal building", 2, "yellow", 0, ["score", "junk"]),
  new Card(18, "fermenting", 2, "yellow", 2, ["junk"]),
  new Card(19, "currency", 2, "green", 2, ["score"]),
  new Card(20, "mapmaking", 2, "green", 0, ["score"]),
  new Card(21, "calendar", 2, "blue", 0, [""]),
  new Card(22, "mathematics", 2, "blue", 0, [""]),
  new Card(23, "monotheism", 2, "purple", 0, ["score"]),
  new Card(24, "philosophy", 2, "purple", 0, ["splay", "score"]),

  new Card(25, "engineering", 3, "red", 1, ["score", "splay"]),
  new Card(26, "optics", 3, "red", 3, ["score"]),
  new Card(27, "machinery", 3, "yellow", 2, ["score", "splay"]),
  new Card(28, "medicine", 3, "yellow", 3, ["score", "junk"]),
  new Card(29, "compass", 3, "green", 0, [""]),
  new Card(30, "paper", 3, "green", 0, ["splay", "score"]),
  new Card(31, "alchemy", 3, "blue", 0, ["score"]),
  new Card(32, "translation", 3, "blue", 0, [""]),
  new Card(33, "education", 3, "purple", 3, [""]),
  new Card(34, "feudalism", 3, "purple", 0, ["junk", "splay"]),

  new Card(35, "colonialism", 4, "red", 0, ["junk"]),
  new Card(36, "gunpowder", 4, "red", 0, ["score"]),
  new Card(37, "anatomy", 4, "yellow", 3, ["junk"]),
  new Card(38, "perspective", 4, "yellow", 0, ["score"]),
  new Card(39, "invention", 4, "green", 0, ["splay"]),
  new Card(40, "navigation", 4, "green", 0, ["score"]),
  new Card(41, "experimentation", 4, "blue", 0, [""]),
  new Card(42, "printing press", 4, "blue", 0, ["splay"]),
  new Card(43, "enterprise", 4, "purple", 0, ["splay"]),
  new Card(44, "reformation", 4, "purple", 2, ["splay"]),

  new Card(45, "coal", 5, "red", 3, ["splay", "score"]),
  new Card(46, "the pirate code", 5, "red", 3, ["score"]),
  new Card(47, "statistics", 5, "yellow", 3, ["splay"]),
  new Card(48, "steam engine", 5, "yellow", 0, ["score", "junk"]),
  new Card(49, "banking", 5, "green", 2, ["splay"]),
  new Card(50, "measurement", 5, "green", 3, ["splay"]),
  new Card(51, "chemistry", 5, "blue", 3, ["splay", "score"]),
  new Card(52, "physics", 5, "blue", 3, [""]),
  new Card(53, "astronomy", 5, "purple", 3, [""]),
  new Card(54, "societies", 5, "purple", 1, [""]),

  new Card(55, "industrialization", 6, "red", 3, ["splay"]),
  new Card(56, "machine tools", 6, "red", 2, ["score"]),
  new Card(57, "canning", 6, "yellow", 0, ["score", "splay"]),
  new Card(58, "vaccination", 6, "yellow", 3, [""]),
  new Card(59, "classification", 6, "green", 3, [""]),
  new Card(60, "metric system", 6, "green", 0, ["splay"]),
  new Card(61, "atomic theory", 6, "blue", 3, ["splay"]),
  new Card(62, "encyclopedia", 6, "blue", 0, ["junk"]),
  new Card(63, "democracy", 6, "purple", 3, ["score"]),
  new Card(64, "emancipation", 6, "purple", 3, ["score", "splay"]),

  new Card(65, "combustion", 7, "red", 3, ["score"]),
  new Card(66, "explosives", 7, "red", 0, [""]),
  new Card(67, "refrigeration", 7, "yellow", 0, ["score"]),
  new Card(68, "sanitation", 7, "yellow", 2, ["junk"]),
  new Card(69, "bicycle", 7, "green", 3, ["score"]),
  new Card(70, "electricity", 7, "green", 2, [""]),
  new Card(71, "evolution", 7, "blue", 3, ["score"]),
  new Card(72, "publications", 7, "blue", 0, ["splay", "junk"]),
  new Card(73, "lighting", 7, "purple", 0, ["score"]),
  new Card(74, "railroad", 7, "purple", 3, ["splay"]),

  new Card(75, "flight", 8, "red", 1, ["splay"]),
  new Card(76, "mobility", 8, "red", 0, ["score"]),
  new Card(77, "antibiotics", 8, "yellow", 3, [""]),
  new Card(78, "skyscrapers", 8, "yellow", 0, [""]),
  new Card(79, "corporations", 8, "green", 0, ["score"]),
  new Card(80, "mass media", 8, "green", 1, ["splay"]),
  new Card(81, "quantum theory", 8, "blue", 3, ["score"]),
  new Card(82, "rocketry", 8, "blue", 3, [""]),
  new Card(83, "empiricism", 8, "purple", 3, ["splay", "win"]),
  new Card(84, "socialism", 8, "purple", 1, ["junk"]),

  new Card(85, "composites", 9, "red", 2, ["score"]),
  new Card(86, "fission", 9, "red", 0, ["junk"]),
  new Card(87, "ecology", 9, "yellow", 3, ["score", "junk"]),
  new Card(88, "suburbia", 9, "yellow", 0, ["score", "junk"]),
  new Card(89, "collaboration", 9, "green", 0, ["win"]),
  new Card(90, "satellites", 9, "green", 0, ["splay", "execute"]),
  new Card(91, "computers", 9, "blue", 1, ["splay", "execute"]),
  new Card(92, "genetics", 9, "blue", 3, ["score"]),
  new Card(93, "services", 9, "purple", 0, [""]),
  new Card(94, "specialization", 9, "purple", 0, ["splay"]),

  new Card(95, "miniaturization", 10, "red", 0, ["junk"]),
  new Card(96, "robotics", 10, "red", 0, ["score", "execute"]),
  new Card(97, "globalization", 10, "yellow", 0, ["win"]),
  new Card(98, "stem cells", 10, "yellow", 0, ["score"]),
  new Card(99, "databases", 10, "green", 0, [""]),
  new Card(100, "self service", 10, "green", 0, ["win", "execute"]),
  new Card(101, "bioengineering", 10, "blue", 3, ["score", "win"]),
  new Card(102, "software", 10, "blue", 3, ["score", "execute"]),
  new Card(103, "a.i.", 10, "purple", 3, ["score", "win"]),
  new Card(104, "the internet", 10, "purple", 0, ["splay", "score"]),

  new Card(105, "astrogeology", 11, "red", 1, ["splay", "win"]),
  new Card(106, "fusion", 11, "red", 3, ["score"]),
  new Card(107, "near-field comm", 11, "yellow", 0, ["score", "execute"]),
  new Card(108, "reclamation", 11, "yellow", 2, [""]),
  new Card(109, "hypersonics", 11, "green", 3, [""]),
  new Card(110, "space traffic", 11, "green", 3, ["win", "score", "splay"]),
  new Card(111, "climatology", 11, "blue", 1, [""]),
  new Card(112, "solar sailing", 11, "blue", 3, ["splay", "win"]),
  new Card(113, "escapism", 11, "purple", 1, ["junk", "execute"]),
  new Card(114, "whataboutism", 11, "purple", 1, ["score"]),
];

const getCardImage = {
  full: function (card) {
    // 525 x 375
    const x = card.sheetIndex % 10,
      y = floor(card.sheetIndex / 10);
    return CARD_SHEET.get(x * 525, y * 375, 525, 375);
  },
  pic: function (card) {
    // 1:1
    const cimg = this.full(card);
    switch (card.picIndex) {
      case 0:
        return cimg.get(28, 18, 111, 111);
      case 1:
        return cimg.get(28, 243, 111, 111);
      case 2:
        return cimg.get(208, 243, 111, 111);
      case 3:
        return cimg.get(386, 243, 111, 111);
    }
  },
  desc: function (card) {
    // 370 x 155
    const cimg = this.full(card);
    return cimg.get(145, 83, 370, 155);
  },
  age: function (card) {
    // 1:1
    const cimg = this.full(card);
    return cimg.get(445, 18, 60, 60);
  },
};

const renderScene = {
  menu: function () {
    // render age buttons
    textSize(42);
    fill(255);
    text("Ages", 300, 80);
    textSize(32);
    buttons.menu.ages.forEach((a) => a.render());

    // render question count buttons
    textSize(42);
    fill(255);
    text("Questions", 300, 360);
    textSize(32);
    buttons.menu.qCounts.forEach((q) => q.render());

    // render mode buttons
    textSize(42);
    fill(255);
    text("Mode", 300, 560);
    textSize(32);
    buttons.menu.modes.forEach((m) => m.render());

    // render begin button
    buttons.menu.begin.render();
  },
  quiz: function () {
    //
  },
};

const getCanvasSize = () => {
  const HEIGHT_RATIO = 9 / 6;
  const CANVAS_WIDTH = Math.min(
    window.innerWidth,
    window.innerHeight / HEIGHT_RATIO,
  );
  return [CANVAS_WIDTH, CANVAS_WIDTH * HEIGHT_RATIO];
};

function windowResized() {
  const [w, h] = getCanvasSize();
  resizeCanvas(w, h);
}

async function setup() {
  const [w, h] = getCanvasSize();
  createCanvas(w, h, P2D, document.getElementById("game-canvas"));

  // p5 configs
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  imageMode(CENTER);
  angleMode(RADIANS);
  strokeJoin(ROUND);
  frameRate(60);

  CARD_SHEET = await loadImage("./cards.jpg");
  createButtons();
  isLoaded = true;
}

function draw() {
  if (!isLoaded) return;

  // rescale canvas and mouse position
  mx = (mouseX * 600) / width;
  my = (mouseY * 600) / width;
  scale(width / 600);

  cursor(ARROW);
  touchCountdown--; // update input delay

  background(20);

  switch (scene) {
    case "MENU":
      renderScene.menu();
      break;
  }

  return;

  const dummyCard = CARDS[0];
  // const dummyCard = CARDS[floor(frameCount / 10) % CARDS.length];
  // image(getCardImage.full(dummyCard), 525 / 2, 375 / 2, 525, 375);

  textSize(36);
  textAlign(LEFT, CENTER);
  fill(255);
  text(dummyCard.name.toUpperCase(), 150, 50);

  image(getCardImage.pic(dummyCard), 60, 80, 100, 100);
  image(getCardImage.age(dummyCard), 60, 200, 100, 100);
  for (let i = 0; i < 4; i++) {
    image(
      getCardImage.desc(dummyCard),
      360,
      180 + 200 * i,
      370 * 1.2,
      155 * 1.2,
    );
  }
}

function mousePressed() {
  if (touchCountdown > 0) return;
  touchCountdown = 10; // delay next input

  switch (scene) {
    case "MENU":
      buttons.menu.ages.forEach((a) => {
        if (a.isHovered) a.clicked();
      });
      buttons.menu.qCounts.forEach((q) => {
        if (q.isHovered) q.clicked();
      });
      buttons.menu.modes.forEach((m) => {
        if (m.isHovered) m.clicked();
      });
      if (buttons.menu.begin.isHovered) buttons.menu.begin.clicked();
      break;
  }
}
