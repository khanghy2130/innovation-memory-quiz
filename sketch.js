let mx = 0,
  my = 0,
  touchCountdown = 0,
  isLoaded = false;

let scene = "MENU"; // LISTS, INSPECT, MENU, QUIZ, RESULT
let optionsControl = {
  selectedAges: [1, 2, 3, 4],
  qCount: 10,
  mode: 0, // name > effect, effect > pic
};

let CARD_SHEET; // 5250 x 4500; each is 525 x 375
let CORRECT_ICON, WRONG_ICON;

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
      lists: new Btn(
        520,
        50,
        100,
        50,
        null,
        () => {
          textSize(22);
          fill(200);
          text("Lists", 0, 0);
        },
        () => {
          console.log("clicked");
        },
      ),

      begin: new Btn(
        470,
        680,
        200,
        150,
        null,
        () => {
          textSize(48);
          fill(240, 240, 50);
          text("Begin", 0, 0);
        },
        initQuiz,
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

      // dynamically create buttons (5 questions, 10, 15, 20, 25)
      qCounts: Array.from({ length: 5 }, (_, i) => {
        const qCount = 5 + i * 5;
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
      modes: Array.from({ length: 2 }, (_, i) => {
        const mode = i;
        const modeNames = ["Guess Effect", "Guess Image"];
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
    quiz: {
      next: new Btn(
        68,
        700,
        100,
        100,
        null,
        () => {
          textSize(32);
          fill(240, 240, 50);
          text("Next", 0, 0);
        },
        () => {
          const qc = quizControl;
          if (!qc.inspectModeEnabled) return; // only allow next if selected the correct answer
          if (qc.currentQuestionIndex < qc.questionIds.length - 1) {
            qc.currentQuestionIndex++;
            generateAnswers();
            qc.inspectModeEnabled = false;
            qc.inspectCardId = null;
          } else {
            scene = "RESULT";
          }
        },
      ),
    },
    inspect: {
      google: new Btn(
        100,
        520,
        160,
        50,
        null,
        () => {
          textSize(28);
          fill(200);
          text(`Google`, 0, 0);
        },
        () => {
          const card = CARDS[inspectControl.id];
          const query = `What is ${card.name} and its origin?`;
          const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          window.open(url, "_blank");
        },
      ),
    },
    result: {
      menu: new Btn(
        300,
        800,
        160,
        60,
        null,
        () => {
          textSize(36);
          fill(200);
          text(`Menu`, 0, 0);
        },
        () => {
          scene = "MENU";
        },
      ),
    },
  };
}

let inspectControl = {
  id: 0,
  prevScene: "LISTS",
};

let quizControl = {
  questionIds: [], // card ids
  currentQuestionIndex: 0,
  answerIds: [], // card ids, for current question

  incorrectCount: 0,
  // enable inspect mode after selected the correct answer, allow click any answer to view its full card
  inspectModeEnabled: false,
  inspectCardId: null, // null is not inspecting

  hoveredAnswerIndex: null,
  markedAnswers: [], // undefined, "correct", "wrong". to render feedback after selecting
};

function initQuiz() {
  const qc = quizControl;

  scene = "QUIZ";
  qc.currentQuestionIndex = 0;
  qc.incorrectCount = 0;
  qc.inspectModeEnabled = false;
  qc.inspectCardId = null;

  // get random unique cards to quiz from the selected ages,
  qc.questionIds = shuffle(
    CARDS.filter((c) => optionsControl.selectedAges.includes(c.age)).map(
      (c) => c.id,
    ),
  ).slice(0, optionsControl.qCount);

  // generate answers for the first question
  generateAnswers();
}

function generateAnswers() {
  const qc = quizControl;
  const currentCard = CARDS[qc.questionIds[qc.currentQuestionIndex]];
  qc.markedAnswers = [];
  switch (optionsControl.mode) {
    /* name > effect: 
      make 4 answers (1 correct and 3 random others from the same age and an adjacent age)
    */
    case 0:
      const adjacentAges = [currentCard.age - 1, currentCard.age + 1].filter(
        (a) => a >= 1 && a <= 11,
      );
      const pickedAdjAge = random(adjacentAges);
      const possibleAnswerIds = CARDS.filter(
        (c) =>
          c.color === currentCard.color &&
          (c.age === currentCard.age || pickedAdjAge === c.age),
      ).map((c) => c.id);

      qc.answerIds = shuffle(possibleAnswerIds).slice(0, 4);
      // make sure there is correct answer
      if (!qc.answerIds.includes(currentCard.id)) {
        qc.answerIds[0] = currentCard.id;
        qc.answerIds = shuffle(qc.answerIds);
      }
      return;

    /* effect > pic: 
      make 6 answers (1 correct, 5 random others with the same color)
    */
    case 1:
      const possibleAnswerIds2 = CARDS.filter(
        (c) => c.color === currentCard.color,
      ).map((c) => c.id);

      qc.answerIds = shuffle(possibleAnswerIds2).slice(0, 6);
      // make sure there is correct answer
      if (!qc.answerIds.includes(currentCard.id)) {
        qc.answerIds[0] = currentCard.id;
        qc.answerIds = shuffle(qc.answerIds);
      }
      return;

    default:
      quizControl.answerIds = [];
      return;
  }
}

// tags: SPLAY, SCORE, JUNK, EXECUTE, WIN
const CARDS = [
  new Card(0, "archery", 1, "red", 2, ["junk"]),
  new Card(1, "metalworking", 1, "red", 2, ["score"]),
  new Card(2, "oars", 1, "red", 2, ["score"]),
  new Card(3, "agriculture", 1, "yellow", 0, ["score"]),
  new Card(4, "domestication", 1, "yellow", 2, []),
  new Card(5, "masonry", 1, "yellow", 1, []),
  new Card(6, "clothing", 1, "green", 0, ["score"]),
  new Card(7, "sailing", 1, "green", 2, []),
  new Card(8, "the wheel", 1, "green", 0, []),
  new Card(9, "pottery", 1, "blue", 0, ["score"]),
  new Card(10, "tools", 1, "blue", 0, []),
  new Card(11, "writing", 1, "blue", 0, []),
  new Card(12, "city states", 1, "purple", 0, []),
  new Card(13, "code of laws", 1, "purple", 0, ["splay"]),
  new Card(14, "mysticism", 1, "purple", 0, []),

  new Card(15, "construction", 2, "red", 1, []),
  new Card(16, "road building", 2, "red", 2, []),
  new Card(17, "canal building", 2, "yellow", 0, ["score", "junk"]),
  new Card(18, "fermenting", 2, "yellow", 2, ["junk"]),
  new Card(19, "currency", 2, "green", 2, ["score"]),
  new Card(20, "mapmaking", 2, "green", 0, ["score"]),
  new Card(21, "calendar", 2, "blue", 0, []),
  new Card(22, "mathematics", 2, "blue", 0, []),
  new Card(23, "monotheism", 2, "purple", 0, ["score"]),
  new Card(24, "philosophy", 2, "purple", 0, ["splay", "score"]),

  new Card(25, "engineering", 3, "red", 1, ["score", "splay"]),
  new Card(26, "optics", 3, "red", 3, ["score"]),
  new Card(27, "machinery", 3, "yellow", 2, ["score", "splay"]),
  new Card(28, "medicine", 3, "yellow", 3, ["score", "junk"]),
  new Card(29, "compass", 3, "green", 0, []),
  new Card(30, "paper", 3, "green", 0, ["splay", "score"]),
  new Card(31, "alchemy", 3, "blue", 0, ["score"]),
  new Card(32, "translation", 3, "blue", 0, []),
  new Card(33, "education", 3, "purple", 3, []),
  new Card(34, "feudalism", 3, "purple", 0, ["junk", "splay"]),

  new Card(35, "colonialism", 4, "red", 0, ["junk"]),
  new Card(36, "gunpowder", 4, "red", 0, ["score"]),
  new Card(37, "anatomy", 4, "yellow", 3, ["junk"]),
  new Card(38, "perspective", 4, "yellow", 0, ["score"]),
  new Card(39, "invention", 4, "green", 0, ["splay"]),
  new Card(40, "navigation", 4, "green", 0, ["score"]),
  new Card(41, "experimentation", 4, "blue", 0, []),
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
  new Card(52, "physics", 5, "blue", 3, []),
  new Card(53, "astronomy", 5, "purple", 3, []),
  new Card(54, "societies", 5, "purple", 1, []),

  new Card(55, "industrialization", 6, "red", 3, ["splay"]),
  new Card(56, "machine tools", 6, "red", 2, ["score"]),
  new Card(57, "canning", 6, "yellow", 0, ["score", "splay"]),
  new Card(58, "vaccination", 6, "yellow", 3, []),
  new Card(59, "classification", 6, "green", 3, []),
  new Card(60, "metric system", 6, "green", 0, ["splay"]),
  new Card(61, "atomic theory", 6, "blue", 3, ["splay"]),
  new Card(62, "encyclopedia", 6, "blue", 0, ["junk"]),
  new Card(63, "democracy", 6, "purple", 3, ["score"]),
  new Card(64, "emancipation", 6, "purple", 3, ["score", "splay"]),

  new Card(65, "combustion", 7, "red", 3, ["score"]),
  new Card(66, "explosives", 7, "red", 0, []),
  new Card(67, "refrigeration", 7, "yellow", 0, ["score"]),
  new Card(68, "sanitation", 7, "yellow", 2, ["junk"]),
  new Card(69, "bicycle", 7, "green", 3, ["score"]),
  new Card(70, "electricity", 7, "green", 2, []),
  new Card(71, "evolution", 7, "blue", 3, ["score"]),
  new Card(72, "publications", 7, "blue", 0, ["splay", "junk"]),
  new Card(73, "lighting", 7, "purple", 0, ["score"]),
  new Card(74, "railroad", 7, "purple", 3, ["splay"]),

  new Card(75, "flight", 8, "red", 1, ["splay"]),
  new Card(76, "mobility", 8, "red", 0, ["score"]),
  new Card(77, "antibiotics", 8, "yellow", 3, []),
  new Card(78, "skyscrapers", 8, "yellow", 0, []),
  new Card(79, "corporations", 8, "green", 0, ["score"]),
  new Card(80, "mass media", 8, "green", 1, ["splay"]),
  new Card(81, "quantum theory", 8, "blue", 3, ["score"]),
  new Card(82, "rocketry", 8, "blue", 3, []),
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
  new Card(93, "services", 9, "purple", 0, []),
  new Card(94, "specialization", 9, "purple", 0, ["splay"]),

  new Card(95, "miniaturization", 10, "red", 0, ["junk"]),
  new Card(96, "robotics", 10, "red", 0, ["score", "execute"]),
  new Card(97, "globalization", 10, "yellow", 0, ["win"]),
  new Card(98, "stem cells", 10, "yellow", 0, ["score"]),
  new Card(99, "databases", 10, "green", 0, []),
  new Card(100, "self service", 10, "green", 0, ["win", "execute"]),
  new Card(101, "bioengineering", 10, "blue", 3, ["score", "win"]),
  new Card(102, "software", 10, "blue", 3, ["score", "execute"]),
  new Card(103, "a.i.", 10, "purple", 3, ["score", "win"]),
  new Card(104, "the internet", 10, "purple", 0, ["splay", "score"]),

  new Card(105, "astrogeology", 11, "red", 1, ["splay", "win"]),
  new Card(106, "fusion", 11, "red", 3, ["score"]),
  new Card(107, "near-field comm", 11, "yellow", 0, ["score", "execute"]),
  new Card(108, "reclamation", 11, "yellow", 2, []),
  new Card(109, "hypersonics", 11, "green", 3, []),
  new Card(110, "space traffic", 11, "green", 3, ["win", "score", "splay"]),
  new Card(111, "climatology", 11, "blue", 1, []),
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
    textAlign(CENTER, CENTER);

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

    // render begin & lists buttons
    buttons.menu.begin.render();
    buttons.menu.lists.render();
  },
  quiz: function () {
    const qc = quizControl;
    // reset hovered answer index
    qc.hoveredAnswerIndex = null;

    // name > effect
    if (optionsControl.mode === 0) {
      // render current name and pic on top
      textSize(36);
      fill(255);
      noStroke();
      const currentCard = CARDS[qc.questionIds[qc.currentQuestionIndex]];
      textAlign(LEFT, CENTER);
      text(currentCard.name.toUpperCase(), 150, 30);
      image(getCardImage.pic(currentCard), 60, 60, 100, 100);
      noFill();
      stroke(20);
      strokeWeight(20);
      square(60, 60, 100, 20);

      // render 4 answers (desc) vertically
      for (let i = 0; i < 4; i++) {
        const answerCard = CARDS[qc.answerIds[i]];
        image(
          getCardImage.desc(answerCard),
          360,
          170 + 200 * i,
          370 * 1.2,
          155 * 1.2,
        );
        // render correct/wrong icon at bottom right of image
        if (qc.markedAnswers[answerCard.id] === "correct") {
          image(
            CORRECT_ICON,
            360 + (370 * 1.2) / 2 - 20,
            170 + 200 * i + (155 * 1.2) / 2 - 20,
            40,
            40,
          );
        } else if (qc.markedAnswers[answerCard.id] === "wrong") {
          image(
            WRONG_ICON,
            360 + (370 * 1.2) / 2 - 20,
            170 + 200 * i + (155 * 1.2) / 2 - 20,
            40,
            40,
          );
        }

        // set hover
        if (
          mx > 360 - (370 * 1.2) / 2 &&
          mx < 360 + (370 * 1.2) / 2 &&
          my > 170 + 200 * i - (155 * 1.2) / 2 &&
          my < 170 + 200 * i + (155 * 1.2) / 2
        ) {
          qc.hoveredAnswerIndex = i;
        }
      }
    }

    // effect > pic
    else if (optionsControl.mode === 1) {
      // render current effect (desc)
      const currentCard = CARDS[qc.questionIds[qc.currentQuestionIndex]];
      image(getCardImage.desc(currentCard), 300, 140, 370 * 1.4, 155 * 1.4);

      // render 6 answers (pic) in 2 columns
      noFill();
      stroke(20);
      strokeWeight(32);

      for (let i = 0; i < 6; i++) {
        const answerCard = CARDS[qc.answerIds[i]];
        const col = i % 2;
        const row = floor(i / 2);
        image(
          getCardImage.pic(answerCard),
          280 + col * 200,
          360 + row * 200,
          160,
          160,
        );
        square(280 + col * 200, 360 + row * 200, 160, 36);

        // render correct/wrong icon at bottom right of image
        if (qc.markedAnswers[answerCard.id] === "correct") {
          image(
            CORRECT_ICON,
            280 + col * 200 + 60,
            360 + row * 200 + 60,
            40,
            40,
          );
        } else if (qc.markedAnswers[answerCard.id] === "wrong") {
          image(WRONG_ICON, 280 + col * 200 + 60, 360 + row * 200 + 60, 40, 40);
        }

        // set hover
        if (
          mx > 280 + col * 200 - 80 &&
          mx < 280 + col * 200 + 80 &&
          my > 360 + row * 200 - 80 &&
          my < 360 + row * 200 + 80
        ) {
          qc.hoveredAnswerIndex = i;
        }
      }
    }

    // render wrong counts
    image(WRONG_ICON, 40, 360, 45, 45);
    textSize(40);
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    text(qc.incorrectCount, 75, 360);

    // render progress x / total
    textSize(32);
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(`${qc.currentQuestionIndex + 1} / ${qc.questionIds.length}`, 75, 300);

    // render next button
    if (qc.inspectModeEnabled) buttons.quiz.next.render();
  },
  inspect: function () {
    const card = CARDS[inspectControl.id];
    image(getCardImage.full(card), 300, 250, 525 * 1.1, 375 * 1.1);
    buttons.inspect.google.render();

    // render tags in rectangles
    const tagColors = {
      splay: color(255, 100, 100),
      score: color(100, 255, 100),
      junk: color(100, 100, 255),
      execute: color(255, 255, 100),
      win: color(255, 100, 255),
    };
    noStroke();
    textSize(24);
    card.tags.sort();
    for (let i = 0; i < card.tags.length; i++) {
      const tag = card.tags[i];
      const x = 480;
      const y = 520 + i * 60;
      fill(tagColors[tag] || color(200));
      rect(x, y, 180, 50, 10);
      fill(0);
      text(tag.toUpperCase(), x, y, 450);
    }
  },

  result: function () {
    const qc = quizControl;
    textSize(48);
    fill(255);
    textAlign(CENTER, CENTER);
    text(
      `[${qc.questionIds.length} questions]\nYou got ${qc.incorrectCount} wrong`,
      300,
      300,
    );
    buttons.result.menu.render();
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
  rectMode(CENTER);
  imageMode(CENTER);
  angleMode(RADIANS);
  strokeJoin(ROUND);
  frameRate(60);

  CARD_SHEET = await loadImage("./cards.jpg");
  CORRECT_ICON = await loadImage("./correct.png");
  WRONG_ICON = await loadImage("./wrong.png");

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
    case "QUIZ":
      renderScene.quiz();
      break;
    case "INSPECT":
      renderScene.inspect();
      break;
    case "RESULT":
      renderScene.result();
      break;
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
      if (buttons.menu.begin.isHovered) return buttons.menu.begin.clicked();
      if (buttons.menu.lists.isHovered) return buttons.menu.lists.clicked();
      return;
    case "QUIZ":
      const qc = quizControl;
      if (qc.inspectModeEnabled && buttons.quiz.next.isHovered) {
        return buttons.quiz.next.clicked();
      }
      if (qc.hoveredAnswerIndex !== null) {
        const selectedAnswerId = qc.answerIds[qc.hoveredAnswerIndex];

        // inspect card during inspect mode
        if (qc.inspectModeEnabled) {
          inspectControl.prevScene = "QUIZ";
          inspectControl.id = selectedAnswerId;
          scene = "INSPECT";
          return;
        }

        // mark selected answer if not already
        if (qc.markedAnswers[selectedAnswerId] === undefined) {
          const currentCard = CARDS[qc.questionIds[qc.currentQuestionIndex]];
          if (selectedAnswerId === currentCard.id) {
            qc.markedAnswers[selectedAnswerId] = "correct";
            // enable inspect mode if selected correct answer
            qc.inspectModeEnabled = true;
          } else {
            qc.markedAnswers[selectedAnswerId] = "wrong";
            qc.incorrectCount++;
          }
        }
      }
      return;
    case "INSPECT":
      if (buttons.inspect.google.isHovered)
        return buttons.inspect.google.clicked();

      // click any where else to go back
      scene = inspectControl.prevScene;
      return;
  }
}
